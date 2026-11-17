"use server"

import { createClient } from "@/utils/supabase/server"
import * as XLSX from "xlsx"
import { revalidatePath } from "next/cache"

/** Nome de coluna sem acento, minúsculo e sem espaços extras (para achar "Peso Bruto (kg)", "PESO BRUTO" etc.) */
function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim()
}

/** Número em formato brasileiro ou americano: "1.234,567", "0,85", 12.5 */
function numeroBR(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null
  if (typeof v === "number") return isFinite(v) ? v : null
  let s = String(v).replace(/[R$\skgKG]/g, "")
  if (!s) return null
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".")
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

type Colunas = { codigo?: string; descricao?: string; unidade?: string; preco?: string; pesoBruto?: string; pesoLiquido?: string }

/** Descobre quais colunas da planilha são código, descrição, preço e pesos */
function acharColunas(cabecalho: string[]): Colunas {
  const c: Colunas = {}
  const achar = (teste: (n: string) => boolean) => cabecalho.find(h => teste(normalizar(h)))
  c.codigo = achar(n => n === "codigo sku" || n === "codigo") ?? achar(n => /^(cod\.?|sku|codigo do produto|cod\.? produto|codigo produto|referencia)$/.test(n))
  c.descricao = achar(n => n === "descricao" || n === "nome" || n === "item") ?? achar(n => n.startsWith("descricao"))
  c.unidade = achar(n => n === "unidade" || n === "un." || n === "un")
  c.preco = achar(n => n === "preco unitario" || n === "valor un." || n === "preco")
  c.pesoBruto = achar(n => n.includes("peso") && n.includes("bruto"))
  c.pesoLiquido = achar(n => n.includes("peso") && n.includes("liq"))
  // coluna só "Peso" / "Peso (kg)" / "Peso unitário" vale como peso bruto
  if (!c.pesoBruto) c.pesoBruto = achar(n => n.includes("peso") && !n.includes("liq"))
  return c
}

export async function importarProdutosXLSX(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Usuário não autenticado")

    const file = formData.get('file') as File
    if (!file) throw new Error("Nenhum arquivo enviado")

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[]
    if (rows.length === 0) throw new Error("A planilha está vazia.")

    const cabecalho = Array.from(new Set(rows.flatMap(r => Object.keys(r))))
    const col = acharColunas(cabecalho)
    if (!col.codigo) throw new Error(`Não achei a coluna de código do produto. Colunas encontradas: ${cabecalho.join(', ')}`)

    const temPeso = !!(col.pesoBruto || col.pesoLiquido)
    // planilha só de pesos (ex.: exportada do sistema de nota): não tem preço → não mexe em preço nem descrição
    const somentePeso = !col.preco && temPeso
    if (!col.preco && !temPeso) {
      throw new Error(`A planilha não tem coluna de preço nem de peso. Colunas encontradas: ${cabecalho.join(', ')}`)
    }

    // ---------- 1) preços / cadastro (planilha do Sensio, como antes) ----------
    let processados = 0
    if (!somentePeso) {
      const batch = []
      for (const row of rows) {
        const codigo = String(row[col.codigo] ?? '').trim()
        const item = String((col.descricao && row[col.descricao]) ?? '').trim()
        const un = String((col.unidade && row[col.unidade]) ?? '').trim()
        const valorUnRaw = col.preco ? row[col.preco] : undefined
        const preco = numeroBR(valorUnRaw) ?? 0

        if (preco >= 99999999) {
          throw new Error(`O produto ${codigo} (${item}) tem um preço muito grande (${valorUnRaw}). Verifique a planilha.`)
        }
        if (!codigo || !item) continue

        batch.push({ codigo, descricao: item, unidade: un || 'un', preco_unitario: preco })
      }

      if (batch.length === 0) {
        throw new Error(`Nenhuma linha reconhecida. Colunas encontradas na planilha: ${cabecalho.join(', ')}`)
      }

      // upsert em lotes de 1000 (não mexe nos pesos já cadastrados)
      for (let i = 0; i < batch.length; i += 1000) {
        const { error } = await supabase.from('produtos').upsert(batch.slice(i, i + 1000), { onConflict: 'codigo' })
        if (error) throw new Error(error.message)
      }
      processados = batch.length
    }

    // ---------- 2) pesos (só de produtos que já existem; célula vazia não apaga o peso atual) ----------
    let pesosAtualizados = 0
    const naoEncontrados: string[] = []
    if (temPeso) {
      const { data: existentes, error: errEx } = await supabase.from('produtos').select('codigo')
      if (errEx) throw new Error(errEx.message)
      const codigos = new Set((existentes || []).map(p => String(p.codigo).trim()))

      const atualizacoes: { codigo: string; dados: Record<string, number> }[] = []
      for (const row of rows) {
        const codigo = String(row[col.codigo] ?? '').trim()
        if (!codigo) continue
        const dados: Record<string, number> = {}
        const b = col.pesoBruto ? numeroBR(row[col.pesoBruto]) : null
        const l = col.pesoLiquido ? numeroBR(row[col.pesoLiquido]) : null
        if (b !== null && b >= 0) dados.peso_bruto_kg = b
        if (l !== null && l >= 0) dados.peso_liquido_kg = l
        // sem peso bruto mas com líquido: usa o líquido para o frete também
        if (dados.peso_bruto_kg === undefined && dados.peso_liquido_kg !== undefined) dados.peso_bruto_kg = dados.peso_liquido_kg
        if (!Object.keys(dados).length) continue
        if (!codigos.has(codigo)) { naoEncontrados.push(codigo); continue }
        atualizacoes.push({ codigo, dados })
      }

      // 10 por vez para ser rápido sem sobrecarregar o banco
      for (let i = 0; i < atualizacoes.length; i += 10) {
        const lote = atualizacoes.slice(i, i + 10)
        const res = await Promise.all(lote.map(a => supabase.from('produtos').update(a.dados).eq('codigo', a.codigo)))
        const erro = res.find(r => r.error)?.error
        if (erro) throw new Error(`Erro ao gravar pesos: ${erro.message}`)
        pesosAtualizados += lote.length
      }

      if (somentePeso && pesosAtualizados === 0) {
        throw new Error(
          naoEncontrados.length
            ? `Nenhum código da planilha existe no cadastro de produtos (ex.: ${naoEncontrados.slice(0, 5).join(', ')}). Confira se o código é o mesmo do Sensio.`
            : `Nenhum peso encontrado na coluna "${col.pesoBruto || col.pesoLiquido}".`
        )
      }
    }

    revalidatePath('/produtos')
    const partes: string[] = []
    if (!somentePeso) partes.push(`${processados} produtos processados e atualizados`)
    if (temPeso) partes.push(`${pesosAtualizados} pesos atualizados`)
    let message = `Sincronização concluída: ${partes.join(' e ')}.`
    if (naoEncontrados.length) {
      message += ` ${naoEncontrados.length} código(s) da planilha não existem no cadastro e foram ignorados (ex.: ${naoEncontrados.slice(0, 5).join(', ')}).`
    }
    return { success: true, message }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
