"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateText } from "ai"
import { revalidatePath } from "next/cache"

export interface ParametroDetectado {
  nome_tecnico: string
  rotulo: string
  tipo: "numero" | "selecao" | "booleano" | "texto"
  opcoes?: string[]
}

export interface RegraDetectada {
  id?: string
  grupo: string
  posicao: string
  produto_codigo: string
  produto_descricao?: string
  formula_quantidade: string
  condicao_aplicabilidade: string
  obs?: string
}

export interface TopicoDetectado {
  id?: string
  titulo: string
  texto: string
}

export interface ProdutoDetectado {
  codigo: string
  descricao: string
}

export interface ResultadoAnaliseClaude {
  parametros: ParametroDetectado[]
  regras: RegraDetectada[]
  topicos: TopicoDetectado[]
  produtos: ProdutoDetectado[]
  metodoExtracao: "direto" | "ia"
  resumo: string
  erro?: string
}

function normalizar(s: string | null | undefined): string {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ")
}

// 1. Parser rápido de JSON embutido no texto do Claude
function tentarExtrairJson(texto: string): Partial<ResultadoAnaliseClaude> | null {
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)```/gi
  let match

  while ((match = jsonBlockRegex.exec(texto)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim())
      if (parsed && (Array.isArray(parsed.regras) || Array.isArray(parsed.parametros) || Array.isArray(parsed.topicos))) {
        return {
          parametros: parsed.parametros || [],
          regras: parsed.regras || [],
          topicos: parsed.topicos || parsed.topicos_proposta || [],
          produtos: parsed.produtos || []
        }
      }
    } catch {
      // continua procurando outros blocos
    }
  }

  // Tenta parsear o texto todo se for JSON puro
  try {
    const parsed = JSON.parse(texto.trim())
    if (parsed && (Array.isArray(parsed.regras) || Array.isArray(parsed.parametros) || Array.isArray(parsed.topicos))) {
      return {
        parametros: parsed.parametros || [],
        regras: parsed.regras || [],
        topicos: parsed.topicos || parsed.topicos_proposta || [],
        produtos: parsed.produtos || []
      }
    }
  } catch {
    // não é json puro
  }

  return null
}

// 2. Parser de regras CSV/Semicolon (padrão R001;Grupo;Posicao;Codigo...)
function extrairRegrasCsv(texto: string): RegraDetectada[] {
  const regras: RegraDetectada[] = []
  const lines = texto.split("\n")

  for (let rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#") || line.startsWith("ID;")) continue

    // Detecta padrão: ID;Grupo;Posicao;Codigo;Produto;Formula;Condicao
    const parts = line.split(";")
    if (parts.length >= 6) {
      let [id, grupo, posicao, codigo, produto, formula, condicao, obs] = parts
      // Se não começar com ID tipo R001, ajusta as colunas
      if (!id.match(/^[rR]?\d+/) && parts.length === 6) {
        condicao = formula
        formula = produto
        produto = codigo
        codigo = posicao
        posicao = grupo
        grupo = id
        id = ""
      }

      if (posicao && codigo && formula) {
        regras.push({
          id: id || undefined,
          grupo: (grupo || "").trim(),
          posicao: (posicao || "").trim(),
          produto_codigo: (codigo || "").trim(),
          produto_descricao: (produto || "").trim(),
          formula_quantidade: (formula || "").trim(),
          condicao_aplicabilidade: (condicao || "sempre").trim(),
          obs: (obs || "").trim()
        })
      }
    }
  }

  return regras
}

// 3. Parser de tabela Markdown de Parâmetros
function extrairParametrosMarkdown(texto: string): ParametroDetectado[] {
  const parametros: ParametroDetectado[] = []
  const lines = texto.split("\n")

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line.startsWith("|") || line.includes("---") || line.toLowerCase().includes("nome_tecnico")) continue

    const cols = line.split("|").map(c => c.trim()).filter(Boolean)
    if (cols.length >= 3) {
      const [nome_tecnico, rotulo, tipoRaw, opcoesRaw] = cols
      if (!nome_tecnico || nome_tecnico.includes(" ")) continue

      let tipo: "numero" | "selecao" | "booleano" | "texto" = "texto"
      const t = tipoRaw?.toLowerCase() || ""
      if (t.includes("num") || t.includes("núm")) tipo = "numero"
      else if (t.includes("sele") || t.includes("select") || t.includes("escolha")) tipo = "selecao"
      else if (t.includes("bool") || t.includes("sim/não") || t.includes("sim/nao")) tipo = "booleano"

      let opcoes: string[] | undefined = undefined
      if (opcoesRaw && opcoesRaw !== "—" && opcoesRaw !== "-") {
        opcoes = opcoesRaw.split(/[,/|]/).map(o => o.trim()).filter(Boolean)
      }

      parametros.push({
        nome_tecnico,
        rotulo: rotulo || nome_tecnico,
        tipo,
        opcoes
      })
    }
  }

  return parametros
}

// SERVER ACTION: Analisar o que foi colado do Claude
export async function analisarTextoDoClaude(texto: string): Promise<ResultadoAnaliseClaude> {
  try {
    if (!texto || texto.trim().length === 0) {
      return {
        parametros: [],
        regras: [],
        topicos: [],
        produtos: [],
        metodoExtracao: "direto",
        resumo: "Texto vazio. Cole a resposta do Claude Desktop.",
        erro: "Texto vazio."
      }
    }

    // Etapa 1: Tentativa direta com JSON
    const jsonExtraido = tentarExtrairJson(texto)
    if (jsonExtraido && (jsonExtraido.regras?.length || jsonExtraido.parametros?.length || jsonExtraido.topicos?.length)) {
      const params = jsonExtraido.parametros || []
      const regras = jsonExtraido.regras || []
      const topicos = jsonExtraido.topicos || []
      const prods = jsonExtraido.produtos || []

      return {
        parametros: params,
        regras: regras,
        topicos: topicos,
        produtos: prods,
        metodoExtracao: "direto",
        resumo: `Identificado via bloco estruturado: ${params.length} parâmetros, ${regras.length} regras de cálculo e ${topicos.length} tópicos de proposta.`
      }
    }

    // Etapa 2: Tentativa direta com CSV e tabelas markdown
    const regrasCsv = extrairRegrasCsv(texto)
    const paramsMd = extrairParametrosMarkdown(texto)

    if (regrasCsv.length > 0 || paramsMd.length > 0) {
      return {
        parametros: paramsMd,
        regras: regrasCsv,
        topicos: [],
        produtos: [],
        metodoExtracao: "direto",
        resumo: `Identificado via tabela/linhas: ${paramsMd.length} parâmetros e ${regrasCsv.length} regras de cálculo.`
      }
    }

    // Etapa 3: Texto livre ou explicativo do Claude -> Usar IA (Gemini) para estruturação precisa
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("Chave de API do Gemini não configurada para interpretação de texto livre.")
    }

    const google = createGoogleGenerativeAI({ apiKey })

    const promptIa = `
Você é um interpretador de regras de cálculo e parâmetros do sistema de estufas agrícolas ArcoForte.
O usuário conversou com o Claude Desktop e colou a resposta ou anotação abaixo.

Analise o texto e extraia em formato JSON estrito:
1. "parametros": Parâmetros de formulário da estufa mencionados (ex: pe_direito, tipo_arco, modo_cabos, etc.).
   Campos: "nome_tecnico" (slug sem espaços), "rotulo", "tipo" ("numero"|"selecao"|"booleano"|"texto"), "opcoes" (array de strings se for selecao).
2. "regras": Regras de cálculo de lista de materiais.
   Campos: "grupo" (ex: "Postes", "Arcos", "Lateral", etc.), "posicao" (nome da peça), "produto_codigo" (código ou MANUAL), "produto_descricao", "formula_quantidade" (expressão matemática JS/eval), "condicao_aplicabilidade" (expressão lógica como "arco_tipo == 'simples'" ou "sempre"), "obs".
3. "topicos": Textos ou cláusulas de proposta comercial (garantias, responsabilidades, exclusões).
   Campos: "titulo", "texto".
4. "produtos": Novos produtos citados com código.
   Campos: "codigo", "descricao".

Responda APENAS um bloco JSON válido no formato:
{
  "parametros": [...],
  "regras": [...],
  "topicos": [...],
  "produtos": [...]
}

Texto colado do Claude:
"""
${texto.slice(0, 30000)}
"""
`

    const { text: geminiResponse } = await generateText({
      model: google("gemini-flash-latest"),
      prompt: promptIa
    })

    const cleanJson = geminiResponse
      .replace(/```(?:json)?/gi, "")
      .replace(/```/g, "")
      .trim()

    const parsed = JSON.parse(cleanJson)

    const params = Array.isArray(parsed.parametros) ? parsed.parametros : []
    const regras = Array.isArray(parsed.regras) ? parsed.regras : []
    const topicos = Array.isArray(parsed.topicos) ? parsed.topicos : []
    const produtos = Array.isArray(parsed.produtos) ? parsed.produtos : []

    return {
      parametros: params,
      regras: regras,
      topicos: topicos,
      produtos: produtos,
      metodoExtracao: "ia",
      resumo: `Processado com sucesso pela Inteligência Artificial: ${params.length} parâmetros, ${regras.length} regras e ${topicos.length} tópicos identificados.`
    }
  } catch (err: any) {
    console.error("Erro ao analisar texto do Claude:", err)
    return {
      parametros: [],
      regras: [],
      topicos: [],
      produtos: [],
      metodoExtracao: "direto",
      resumo: "Não foi possível interpretar os dados colados.",
      erro: err.message || "Erro desconhecido na análise."
    }
  }
}

// SERVER ACTION: Aplicar tudo no Banco de Dados Supabase com 1 clique
export async function aplicarDadosDoClaude(dados: {
  parametros: ParametroDetectado[]
  regras: RegraDetectada[]
  topicos: TopicoDetectado[]
  produtos: ProdutoDetectado[]
}) {
  try {
    const supabase = await createAdminClient()

    let paramsAtualizados = 0
    let produtosCriados = 0
    let regrasAtualizadas = 0
    let topicosAtualizados = 0

    // 1. Processar Parâmetros
    for (const p of dados.parametros || []) {
      if (!p.nome_tecnico) continue

      const cleanNome = p.nome_tecnico.trim().toLowerCase().replace(/\s+/g, "_")
      const { data: existingParam } = await supabase
        .from("parametros_estufa")
        .select("id")
        .eq("nome_tecnico", cleanNome)
        .single()

      const paramPayload = {
        nome_tecnico: cleanNome,
        rotulo: p.rotulo || cleanNome,
        tipo: p.tipo || "texto",
        opcoes: p.opcoes && p.opcoes.length > 0 ? JSON.stringify(p.opcoes) : null,
        ativo: true
      }

      if (existingParam) {
        await supabase
          .from("parametros_estufa")
          .update(paramPayload)
          .eq("id", existingParam.id)
      } else {
        await supabase
          .from("parametros_estufa")
          .insert(paramPayload)
      }
      paramsAtualizados++
    }

    // 2. Processar Produtos Novos
    for (const prod of dados.produtos || []) {
      if (!prod.codigo) continue
      const cleanCod = prod.codigo.trim()
      const { data: existingProd } = await supabase
        .from("produtos")
        .select("codigo")
        .eq("codigo", cleanCod)
        .single()

      if (!existingProd) {
        await supabase.from("produtos").insert({
          codigo: cleanCod,
          descricao: prod.descricao || `Produto ${cleanCod}`,
          unidade: "un",
          preco_unitario: 0
        })
        produtosCriados++
      }
    }

    // 3. Processar Regras de Cálculo
    if (dados.regras && dados.regras.length > 0) {
      // Carregar grupos para mapeamento inteligente
      const { data: gruposCadastrados } = await supabase
        .from("grupos_componentes")
        .select("id, ordem, nome")
        .order("ordem")

      for (const r of dados.regras) {
        if (!r.posicao || !r.produto_codigo || !r.formula_quantidade) continue

        // Encontra o grupo correspondente por ordem numérica ou por nome
        let grupoId = ""
        const grupoTexto = r.grupo || ""
        const matchNumero = grupoTexto.match(/^(\d+)/)
        if (matchNumero) {
          const num = parseInt(matchNumero[1], 10)
          const g = gruposCadastrados?.find(item => item.ordem === num)
          if (g) grupoId = g.id
        }

        if (!grupoId && gruposCadastrados) {
          const normG = normalizar(grupoTexto)
          const g = gruposCadastrados.find(item => normalizar(item.nome).includes(normG) || normG.includes(normalizar(item.nome)))
          if (g) grupoId = g.id
        }

        // Se ainda não achou, usa o primeiro grupo como fallback
        if (!grupoId && gruposCadastrados && gruposCadastrados.length > 0) {
          grupoId = gruposCadastrados[0].id
        }

        // Cadastra produto da regra se não existir
        const prodCode = r.produto_codigo.trim()
        if (prodCode !== "MANUAL" && prodCode !== "FILME-XXX" && prodCode !== "TELA-XXX") {
          const codigos = prodCode.includes(" ou ") ? prodCode.split(" ou ") : [prodCode]
          for (const cod of codigos) {
            const clean = cod.trim()
            const { data: exProd } = await supabase.from("produtos").select("codigo").eq("codigo", clean).single()
            if (!exProd) {
              await supabase.from("produtos").insert({
                codigo: clean,
                descricao: r.produto_descricao || clean,
                unidade: "un",
                preco_unitario: 0
              })
              produtosCriados++
            }
          }
        }

        // Busca ou cria a posição
        let posicaoId = ""
        const posNome = r.posicao.trim()
        const { data: posicoesDoGrupo } = await supabase
          .from("posicoes")
          .select("id, nome")
          .eq("grupo_id", grupoId)

        const matchPos = posicoesDoGrupo?.find(p => normalizar(p.nome) === normalizar(posNome))
        if (matchPos) {
          posicaoId = matchPos.id
        } else {
          const { data: novaPos } = await supabase
            .from("posicoes")
            .insert({ grupo_id: grupoId, nome: posNome })
            .select("id")
            .single()
          if (novaPos) posicaoId = novaPos.id
        }

        if (!posicaoId) continue

        // Cadastra ou atualiza a regra
        const { data: regraExistente } = await supabase
          .from("regras_calculo")
          .select("id")
          .eq("posicao_id", posicaoId)
          .eq("produto_codigo", prodCode)
          .maybeSingle()

        if (regraExistente) {
          await supabase
            .from("regras_calculo")
            .update({
              formula_quantidade: r.formula_quantidade,
              condicao_aplicabilidade: r.condicao_aplicabilidade || "sempre",
              ativo: true
            })
            .eq("id", regraExistente.id)
        } else {
          await supabase.from("regras_calculo").insert({
            posicao_id: posicaoId,
            produto_codigo: prodCode,
            formula_quantidade: r.formula_quantidade,
            condicao_aplicabilidade: r.condicao_aplicabilidade || "sempre",
            unidade_medida: "un",
            regra_arredondamento: "nenhum",
            ativo: true
          })
        }
        regrasAtualizadas++
      }
    }

    // 4. Processar Tópicos de Proposta
    if (dados.topicos && dados.topicos.length > 0) {
      const { data: config } = await supabase
        .from("configuracoes")
        .select("id, proposta_topicos")
        .limit(1)
        .single()

      if (config) {
        let topicosAtuais = Array.isArray(config.proposta_topicos) ? [...config.proposta_topicos] : []

        for (const t of dados.topicos) {
          if (!t.titulo || !t.texto) continue
          const indexExistente = topicosAtuais.findIndex(
            (item: any) => normalizar(item.titulo) === normalizar(t.titulo)
          )

          if (indexExistente >= 0) {
            topicosAtuais[indexExistente].texto = t.texto
          } else {
            topicosAtuais.push({
              id: t.id || `topico-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              titulo: t.titulo,
              texto: t.texto,
              ordem: topicosAtuais.length + 1,
              ativo: true
            })
          }
          topicosAtualizados++
        }

        await supabase
          .from("configuracoes")
          .update({ proposta_topicos: topicosAtuais })
          .eq("id", config.id)
      }
    }

    // Revalidar rotas afetadas
    revalidatePath("/admin/regras")
    revalidatePath("/admin/parametros")
    revalidatePath("/admin/configuracoes")
    revalidatePath("/orcamentos/novo")
    revalidatePath("/propostas")

    return {
      success: true,
      message: `Sincronização concluída com sucesso! ${paramsAtualizados} parâmetros, ${regrasAtualizadas} regras, ${produtosCriados} novos produtos e ${topicosAtualizados} tópicos aplicados.`
    }
  } catch (error: any) {
    console.error("Erro ao aplicar sincronização do Claude:", error)
    return {
      success: false,
      error: error.message || "Erro desconhecido ao salvar dados no banco."
    }
  }
}
