"use server"

/**
 * Ações do servidor da tela Configurações → Pacote de Regras.
 * - exportarPacoteAtual: gera o pacote a partir do que está no banco deste ambiente.
 * - validarPacoteTexto: confere o pacote e mostra o que mudaria (não grava nada).
 * - aplicarPacoteTexto: confere de novo e grava no banco deste ambiente.
 * O pacote aplicado (e o mapa código R → id do banco) fica guardado no Storage,
 * bucket PRIVADO "pacote-regras" (atual.json + historico/).
 */
import { createClient, createAdminClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import type { Produto } from "@/utils/engine"
import {
  FORMATO_PACOTE,
  assinaturaRegra,
  lerPacote,
  normalizar,
  normalizarCondicao,
  padroesRegra,
  validarPacote,
  type Pacote,
  type ParametroPacote,
  type Problema,
  type RegraPacote,
  type ResultadoExemplo,
} from "@/lib/pacote-regras"

const BUCKET = "pacote-regras"
const ARQUIVO_ATUAL = "atual.json"

type RegistroAplicado = {
  pacote: Pacote
  mapa: Record<string, string> // código R → id da regra no banco
  aplicado_em: string
  aplicado_por: string
  ambiente: string
}

type RegraBanco = {
  id: string
  posicao_id: string
  produto_codigo: string
  formula_quantidade: string
  condicao_aplicabilidade: string | null
  unidade_medida: string
  regra_arredondamento: string
  margem_perda: number | null
  ativo: boolean | null
}

type EstadoBanco = {
  grupos: { id: string; nome: string; ordem: number }[]
  posicoes: { id: string; nome: string; grupo_id: string; ativo: boolean | null }[]
  regras: RegraBanco[]
  parametros: { id: string; nome_tecnico: string; rotulo: string; tipo: string; opcoes: any; ativo: boolean | null }[]
  produtos: Produto[]
}

export type DiffRegra = {
  status: "igual" | "alterada" | "nova" | "desativar"
  id_pacote?: string
  id_banco?: string
  antes?: { grupo: number; posicao: string; produto: string; formula: string; condicao: string | null }
  depois?: { grupo: number; posicao: string; produto: string; formula: string; condicao: string | null }
}

export type DiffParametro = { status: "novo" | "alterado" | "desativar"; nome_tecnico: string; antes?: string; depois?: string }

export type ResultadoValidacao = {
  ok: boolean
  ambiente: string
  versao?: string
  problemas: Problema[]
  exemplos: ResultadoExemplo[]
  regras: DiffRegra[]
  parametros: DiffParametro[]
  grupos: { status: "novo" | "renomear"; ordem: number; antes?: string; depois: string }[]
  resumo: { iguais: number; alteradas: number; novas: number; desativadas: number; parametros: number; grupos: number }
}

// ---------------------------------------------------------------------------

function ambienteAtual(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").host.split(".")[0] || "desconhecido"
  } catch {
    return "desconhecido"
  }
}

async function exigirAdministrador() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Você precisa estar autenticado.")
  const cargo = user.user_metadata?.cargo
  const perfil = user.user_metadata?.perfil
  if (cargo !== "Administrador" && perfil !== "admin") {
    const { data: usuarioDb } = await supabase.from("usuarios").select("perfil").eq("id", user.id).maybeSingle()
    if (usuarioDb?.perfil !== "admin") throw new Error("Apenas Administradores podem mexer no pacote de regras.")
  }
  return user
}

async function carregarEstado(admin: any): Promise<EstadoBanco> {
  const [g, p, r, pa, pr] = await Promise.all([
    admin.from("grupos_componentes").select("id, nome, ordem"),
    admin.from("posicoes").select("id, nome, grupo_id, ativo"),
    admin.from("regras_calculo").select("id, posicao_id, produto_codigo, formula_quantidade, condicao_aplicabilidade, unidade_medida, regra_arredondamento, margem_perda, ativo").range(0, 9999),
    admin.from("parametros_estufa").select("id, nome_tecnico, rotulo, tipo, opcoes, ativo").order("criado_em", { ascending: true }),
    admin.from("produtos").select("*").eq("ativo", true).range(0, 9999),
  ])
  for (const res of [g, p, r, pa, pr]) if (res.error) throw new Error(`Erro ao ler o banco: ${res.error.message}`)
  return { grupos: g.data, posicoes: p.data, regras: r.data, parametros: pa.data, produtos: pr.data }
}

async function lerRegistroAplicado(admin: any): Promise<RegistroAplicado | null> {
  try {
    const { data, error } = await admin.storage.from(BUCKET).download(ARQUIVO_ATUAL)
    if (error || !data) return null
    return JSON.parse(await data.text())
  } catch {
    return null
  }
}

async function gravarNoStorage(admin: any, caminho: string, conteudo: string): Promise<string | null> {
  const enviar = () =>
    admin.storage.from(BUCKET).upload(caminho, Buffer.from(conteudo, "utf-8"), {
      contentType: "application/json;charset=utf-8",
      cacheControl: "0",
      upsert: true,
    })
  let { error } = await enviar()
  if (error && /bucket not found/i.test(error.message || "")) {
    const { error: e2 } = await admin.storage.createBucket(BUCKET, { public: false })
    if (e2 && !/already exists/i.test(e2.message || "")) return e2.message
    ;({ error } = await enviar())
  }
  return error ? error.message : null
}

function opcoesComoLista(opcoes: any): string[] | null {
  if (opcoes === null || opcoes === undefined || opcoes === "") return null
  if (Array.isArray(opcoes)) return opcoes.map(String)
  try {
    const v = JSON.parse(opcoes)
    return Array.isArray(v) ? v.map(String) : null
  } catch {
    return null
  }
}

function regraBancoComoPacote(rb: RegraBanco, estado: EstadoBanco) {
  const pos = estado.posicoes.find(p => p.id === rb.posicao_id)
  const grupo = estado.grupos.find(g => g.id === pos?.grupo_id)
  return {
    grupo: grupo?.ordem ?? -1,
    posicao: pos?.nome ?? "(posição não encontrada)",
    produto: String(rb.produto_codigo),
    formula: rb.formula_quantidade,
    condicao: rb.condicao_aplicabilidade,
    unidade: rb.unidade_medida || "un",
    arredondamento: rb.regra_arredondamento || "nenhum",
    margem_perda: Number(rb.margem_perda ?? 0),
  }
}

function resumoRegra(r: { grupo: number; posicao: string; produto: string; formula: string; condicao: string | null }) {
  return { grupo: r.grupo, posicao: r.posicao, produto: String(r.produto), formula: r.formula, condicao: r.condicao ?? null }
}

/** Compara o pacote com o banco. Não grava nada. */
function compararComBanco(pacote: Pacote, estado: EstadoBanco, mapa: Record<string, string>) {
  const ativasBanco = estado.regras.filter(r => r.ativo !== false)
  const porId = new Map(ativasBanco.map(r => [r.id, r]))
  const usadas = new Set<string>()
  const regras: DiffRegra[] = []
  const pendentes: RegraPacote[] = []

  const ativasPacote = pacote.regras.filter(r => r.ativa !== false)

  // 1) Pelo mapa da última aplicação (mesmo código R → mesma linha do banco)
  for (const rp of ativasPacote) {
    const idBanco = mapa[rp.id]
    const rb = idBanco ? porId.get(idBanco) : undefined
    if (!rb || usadas.has(rb.id)) {
      pendentes.push(rp)
      continue
    }
    usadas.add(rb.id)
    const antes = regraBancoComoPacote(rb, estado)
    const igual = assinaturaRegra(antes) === assinaturaRegra({ ...rp, ...padroesRegra(rp) })
    regras.push({ status: igual ? "igual" : "alterada", id_pacote: rp.id, id_banco: rb.id, antes: resumoRegra(antes), depois: resumoRegra(rp) })
  }

  // 2) Pelo conteúdo (mesmo grupo, posição, produto, fórmula e condição)
  const livresPorAssinatura = new Map<string, RegraBanco[]>()
  for (const rb of ativasBanco) {
    if (usadas.has(rb.id)) continue
    const a = assinaturaRegra(regraBancoComoPacote(rb, estado))
    if (!livresPorAssinatura.has(a)) livresPorAssinatura.set(a, [])
    livresPorAssinatura.get(a)!.push(rb)
  }
  for (const rp of pendentes) {
    const lista = livresPorAssinatura.get(assinaturaRegra({ ...rp, ...padroesRegra(rp) }))
    const rb = lista?.find(x => !usadas.has(x.id))
    if (rb) {
      usadas.add(rb.id)
      regras.push({ status: "igual", id_pacote: rp.id, id_banco: rb.id, antes: resumoRegra(regraBancoComoPacote(rb, estado)), depois: resumoRegra(rp) })
    } else {
      regras.push({ status: "nova", id_pacote: rp.id, depois: resumoRegra(rp) })
    }
  }

  // 3) O que está ativo no banco e não está no pacote será desligado
  for (const rb of ativasBanco) {
    if (!usadas.has(rb.id)) regras.push({ status: "desativar", id_banco: rb.id, antes: resumoRegra(regraBancoComoPacote(rb, estado)) })
  }

  // Parâmetros
  const parametros: DiffParametro[] = []
  const paramsBanco = new Map(estado.parametros.map(p => [p.nome_tecnico, p]))
  const descreverParam = (p: { rotulo: string; tipo: string; opcoes: string[] | null; ativo?: boolean | null }) =>
    `${p.rotulo} | ${p.tipo}${p.opcoes ? " | " + p.opcoes.join(", ") : ""}${p.ativo === false ? " | (inativo)" : ""}`
  for (const pp of pacote.parametros) {
    const pb = paramsBanco.get(pp.nome_tecnico)
    const depois = descreverParam({ ...pp, ativo: true })
    if (!pb) parametros.push({ status: "novo", nome_tecnico: pp.nome_tecnico, depois })
    else {
      const antes = descreverParam({ rotulo: pb.rotulo, tipo: pb.tipo, opcoes: opcoesComoLista(pb.opcoes), ativo: pb.ativo })
      if (antes !== depois) parametros.push({ status: "alterado", nome_tecnico: pp.nome_tecnico, antes, depois })
    }
  }
  const nomesPacote = new Set(pacote.parametros.map(p => p.nome_tecnico))
  for (const pb of estado.parametros) {
    if (pb.ativo !== false && !nomesPacote.has(pb.nome_tecnico)) {
      parametros.push({ status: "desativar", nome_tecnico: pb.nome_tecnico, antes: descreverParam({ rotulo: pb.rotulo, tipo: pb.tipo, opcoes: opcoesComoLista(pb.opcoes) }) })
    }
  }

  // Grupos
  const grupos: ResultadoValidacao["grupos"] = []
  for (const gp of pacote.grupos) {
    const gb = estado.grupos.find(g => g.ordem === gp.ordem)
    if (!gb) grupos.push({ status: "novo", ordem: gp.ordem, depois: gp.nome })
    else if (gb.nome !== gp.nome) grupos.push({ status: "renomear", ordem: gp.ordem, antes: gb.nome, depois: gp.nome })
  }

  regras.sort((a, b) => (a.id_pacote || "Z").localeCompare(b.id_pacote || "Z"))
  return { regras, parametros, grupos }
}

function montarResultado(pacote: Pacote | undefined, problemas: Problema[], exemplos: ResultadoExemplo[], diff?: ReturnType<typeof compararComBanco>): ResultadoValidacao {
  const regras = diff?.regras ?? []
  const conta = (s: DiffRegra["status"]) => regras.filter(r => r.status === s).length
  return {
    ok: !problemas.some(p => p.nivel === "erro"),
    ambiente: ambienteAtual(),
    versao: pacote?.versao,
    problemas,
    exemplos,
    regras,
    parametros: diff?.parametros ?? [],
    grupos: diff?.grupos ?? [],
    resumo: {
      iguais: conta("igual"),
      alteradas: conta("alterada"),
      novas: conta("nova"),
      desativadas: conta("desativar"),
      parametros: diff?.parametros.length ?? 0,
      grupos: diff?.grupos.length ?? 0,
    },
  }
}

// ---------------------------------------------------------------------------

export async function obterInfoPacote() {
  try {
    await exigirAdministrador()
    const admin = await createAdminClient()
    const reg = await lerRegistroAplicado(admin)
    return {
      sucesso: true,
      ambiente: ambienteAtual(),
      aplicado: reg ? { versao: reg.pacote.versao, aplicado_em: reg.aplicado_em, aplicado_por: reg.aplicado_por } : null,
    }
  } catch (e: any) {
    return { sucesso: false, ambiente: ambienteAtual(), aplicado: null, erro: e.message as string }
  }
}

export async function exportarPacoteAtual(): Promise<{ sucesso: boolean; texto?: string; nomeArquivo?: string; erro?: string }> {
  try {
    await exigirAdministrador()
    const admin = await createAdminClient()
    const estado = await carregarEstado(admin)
    const reg = await lerRegistroAplicado(admin)
    const mapa = reg?.mapa ?? {}
    const codigoPorId = new Map(Object.entries(mapa).map(([r, id]) => [id, r]))

    const ativas = estado.regras
      .filter(r => r.ativo !== false)
      .map(rb => ({ rb, r: regraBancoComoPacote(rb, estado) }))
      .sort((a, b) =>
        a.r.grupo - b.r.grupo ||
        a.r.posicao.localeCompare(b.r.posicao, "pt") ||
        a.r.produto.localeCompare(b.r.produto) ||
        normalizarCondicao(a.r.condicao).localeCompare(normalizarCondicao(b.r.condicao)) ||
        a.rb.id.localeCompare(b.rb.id)
      )

    const usados = new Set(Object.keys(mapa))
    let proximo = Math.max(0, ...[...usados].map(c => Number(c.replace(/\D/g, "")) || 0)) + 1
    const regras: RegraPacote[] = ativas.map(({ rb, r }) => {
      let id = codigoPorId.get(rb.id)
      if (!id) {
        do { id = "R" + String(proximo++).padStart(3, "0") } while (usados.has(id))
        usados.add(id)
      }
      const regra: RegraPacote = { id, grupo: r.grupo, posicao: r.posicao, produto: r.produto, formula: r.formula, condicao: r.condicao }
      if (r.unidade !== "un") regra.unidade = r.unidade
      if (r.arredondamento !== "nenhum") regra.arredondamento = r.arredondamento as RegraPacote["arredondamento"]
      if (r.margem_perda) regra.margem_perda = r.margem_perda
      return regra
    })
    regras.sort((a, b) => Number(a.id.replace(/\D/g, "")) - Number(b.id.replace(/\D/g, "")))

    const parametros: ParametroPacote[] = estado.parametros
      .filter(p => p.ativo !== false)
      .map(p => ({ nome_tecnico: p.nome_tecnico, rotulo: p.rotulo, tipo: p.tipo as ParametroPacote["tipo"], opcoes: opcoesComoLista(p.opcoes) }))

    const hoje = new Date().toISOString().slice(0, 10)
    const pacote: Pacote = {
      formato: FORMATO_PACOTE,
      versao: reg?.pacote.versao ?? "0.0.0",
      data: hoje,
      historico: reg?.pacote.historico ?? [
        { versao: "0.0.0", data: hoje, mudanca: `Exportado do banco ${ambienteAtual()} (nenhum pacote tinha sido aplicado ainda).` },
      ],
      grupos: [...estado.grupos].sort((a, b) => a.ordem - b.ordem).map(g => ({ ordem: g.ordem, nome: g.nome })),
      parametros,
      regras,
      exemplos: reg?.pacote.exemplos ?? [],
      pendencias: reg?.pacote.pendencias ?? [],
    }
    return {
      sucesso: true,
      texto: JSON.stringify(pacote, null, 2) + "\n",
      nomeArquivo: `pacote-regras-${ambienteAtual()}-${hoje}.json`,
    }
  } catch (e: any) {
    return { sucesso: false, erro: e.message }
  }
}

export async function validarPacoteTexto(texto: string): Promise<ResultadoValidacao> {
  try {
    await exigirAdministrador()
    const { pacote, problemas } = lerPacote(texto)
    if (!pacote) return montarResultado(undefined, problemas, [])
    const admin = await createAdminClient()
    const estado = await carregarEstado(admin)
    const reg = await lerRegistroAplicado(admin)
    const v = validarPacote(pacote, estado.produtos)
    const diff = compararComBanco(pacote, estado, reg?.mapa ?? {})
    return montarResultado(pacote, [...problemas, ...v.problemas], v.exemplos, diff)
  } catch (e: any) {
    return montarResultado(undefined, [{ nivel: "erro", onde: "sistema", mensagem: e.message }], [])
  }
}

export async function aplicarPacoteTexto(texto: string): Promise<{ sucesso: boolean; mensagem: string; resultado?: ResultadoValidacao; avisos?: string[] }> {
  let user
  try {
    user = await exigirAdministrador()
  } catch (e: any) {
    return { sucesso: false, mensagem: e.message }
  }

  // Confere tudo de novo no servidor (nunca confia no que a tela mandou)
  const resultado = await validarPacoteTexto(texto)
  if (!resultado.ok) return { sucesso: false, mensagem: "O pacote tem erros e não foi aplicado. Nada foi gravado.", resultado }
  const { pacote } = lerPacote(texto)
  if (!pacote) return { sucesso: false, mensagem: "Pacote ilegível. Nada foi gravado.", resultado }

  const admin = await createAdminClient()
  const avisos: string[] = []
  const etapa = { nome: "início" }
  try {
    const estado = await carregarEstado(admin)
    const reg = await lerRegistroAplicado(admin)
    const diff = compararComBanco(pacote, estado, reg?.mapa ?? {})
    const marca = `pacote v${pacote.versao}`

    // 1) Grupos
    etapa.nome = "grupos"
    const grupoIdPorOrdem = new Map(estado.grupos.map(g => [g.ordem, g.id]))
    for (const g of diff.grupos) {
      if (g.status === "novo") {
        const { data, error } = await admin.from("grupos_componentes").insert({ nome: g.depois, ordem: g.ordem, ativo: true }).select("id").single()
        if (error) throw error
        grupoIdPorOrdem.set(g.ordem, data.id)
      } else {
        const { error } = await admin.from("grupos_componentes").update({ nome: g.depois }).eq("id", grupoIdPorOrdem.get(g.ordem))
        if (error) throw error
      }
    }

    // 2) Parâmetros (nunca apaga: desliga com ativo = false)
    etapa.nome = "parâmetros"
    const paramsBanco = new Map(estado.parametros.map(p => [p.nome_tecnico, p]))
    for (const d of diff.parametros) {
      if (d.status === "desativar") {
        const { error } = await admin.from("parametros_estufa").update({ ativo: false }).eq("id", paramsBanco.get(d.nome_tecnico)!.id)
        if (error) throw error
        continue
      }
      const pp = pacote.parametros.find(p => p.nome_tecnico === d.nome_tecnico)!
      const dados = { nome_tecnico: pp.nome_tecnico, rotulo: pp.rotulo, tipo: pp.tipo, opcoes: pp.opcoes && pp.opcoes.length ? JSON.stringify(pp.opcoes) : null, ativo: true }
      const existente = paramsBanco.get(pp.nome_tecnico)
      const { error } = existente
        ? await admin.from("parametros_estufa").update(dados).eq("id", existente.id)
        : await admin.from("parametros_estufa").insert(dados)
      if (error) throw error
    }

    // 3) Regras
    etapa.nome = "regras"
    const posicoes = [...estado.posicoes]
    const obterPosicao = async (grupo: number, nome: string) => {
      const grupoId = grupoIdPorOrdem.get(grupo)
      if (!grupoId) throw new Error(`Grupo ${grupo} não encontrado no banco.`)
      const existente = posicoes.find(p => p.grupo_id === grupoId && p.ativo !== false && normalizar(p.nome) === normalizar(nome))
      if (existente) return existente.id
      const { data, error } = await admin.from("posicoes").insert({ grupo_id: grupoId, nome: nome.trim() }).select("id, nome, grupo_id, ativo").single()
      if (error) throw error
      posicoes.push(data)
      return data.id as string
    }
    const historico: any[] = []
    const novoMapa: Record<string, string> = {}

    for (const d of diff.regras) {
      if (d.status === "igual") {
        novoMapa[d.id_pacote!] = d.id_banco!
        continue
      }
      if (d.status === "desativar") {
        const { error } = await admin.from("regras_calculo").update({ ativo: false }).eq("id", d.id_banco)
        if (error) throw error
        historico.push({ regra_id: d.id_banco, usuario_id: user.id, campo_alterado: "ativo", valor_anterior: "true", novo_valor: `false (${marca})` })
        continue
      }
      const rp = pacote.regras.find(r => r.id === d.id_pacote)!
      const pd = padroesRegra(rp)
      const dados = {
        posicao_id: await obterPosicao(rp.grupo, rp.posicao),
        produto_codigo: String(rp.produto),
        formula_quantidade: rp.formula,
        condicao_aplicabilidade: normalizarCondicao(rp.condicao) || null,
        unidade_medida: pd.unidade,
        regra_arredondamento: pd.arredondamento,
        margem_perda: pd.margem_perda,
        ativo: true,
      }
      if (d.status === "nova") {
        const { data, error } = await admin.from("regras_calculo").insert(dados).select("id").single()
        if (error) throw error
        novoMapa[rp.id] = data.id
        historico.push({ regra_id: data.id, usuario_id: user.id, campo_alterado: "criada", valor_anterior: null, novo_valor: `${rp.id} (${marca})` })
      } else {
        const anterior = estado.regras.find(r => r.id === d.id_banco)!
        const { error } = await admin.from("regras_calculo").update(dados).eq("id", d.id_banco)
        if (error) throw error
        novoMapa[rp.id] = d.id_banco!
        for (const campo of ["posicao_id", "produto_codigo", "formula_quantidade", "condicao_aplicabilidade", "unidade_medida", "regra_arredondamento", "margem_perda"] as const) {
          const a = String((anterior as any)[campo] ?? "").trim()
          const n = String((dados as any)[campo] ?? "").trim()
          if (a !== n) historico.push({ regra_id: d.id_banco, usuario_id: user.id, campo_alterado: campo, valor_anterior: a || null, novo_valor: `${n} (${marca})` })
        }
      }
    }

    // 4) Histórico de alterações das regras
    etapa.nome = "histórico"
    if (historico.length) {
      const { error } = await admin.from("regras_calculo_historico").insert(historico)
      if (error) avisos.push(`As regras foram gravadas, mas o histórico não: ${error.message}`)
    }

    // 5) Guarda o pacote aplicado + o mapa (para a próxima comparação e exportação)
    etapa.nome = "guardar pacote"
    const registro: RegistroAplicado = {
      pacote,
      mapa: novoMapa,
      aplicado_em: new Date().toISOString(),
      aplicado_por: user.email || user.id,
      ambiente: ambienteAtual(),
    }
    const conteudo = JSON.stringify(registro, null, 2)
    const e1 = await gravarNoStorage(admin, ARQUIVO_ATUAL, conteudo)
    const e2 = await gravarNoStorage(admin, `historico/${registro.aplicado_em.replace(/[:.]/g, "-")}-v${pacote.versao.replace(/[^a-zA-Z0-9._-]/g, "_")}.json`, conteudo)
    if (e1) avisos.push(`As regras foram gravadas, mas a cópia do pacote não foi guardada no Storage: ${e1}`)
    if (e2) avisos.push(`A cópia histórica do pacote não foi guardada: ${e2}`)

    revalidatePath("/orcamentos/novo")
    revalidatePath("/admin/configuracoes")
    const r = resultado.resumo
    return {
      sucesso: true,
      mensagem: `Pacote v${pacote.versao} aplicado no banco ${ambienteAtual()}: ${r.novas} regras novas, ${r.alteradas} alteradas, ${r.desativadas} desligadas, ${r.iguais} sem mudança, ${r.parametros} mudanças de parâmetros, ${r.grupos} de grupos.`,
      resultado,
      avisos,
    }
  } catch (e: any) {
    return {
      sucesso: false,
      mensagem: `Falha na etapa "${etapa.nome}": ${e.message}. O que foi gravado antes desta etapa permanece; valide o pacote de novo para ver o estado atual.`,
      resultado,
      avisos,
    }
  }
}
