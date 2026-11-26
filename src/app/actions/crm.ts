"use server"

import { revalidatePath } from "next/cache"
import { createClient, obterUsuario } from "@/utils/supabase/server"
import { getCamposFaltando } from "@/utils/proposta-requisitos"
import {
  CONFIG_PADRAO,
  calcularScore,
  hojeISO,
  type CrmAtividade,
  type CrmCampo,
  type CrmCliente,
  type CrmConfig,
  type CrmEtapa,
  type CrmFichaLead,
  type CrmFunil,
  type CrmItemLista,
  type CrmLead,
  type CrmQuadro,
  type CrmOrcamentoResumo,
  type CrmTarefa,
} from "@/lib/crm-types"
import { validarDataOpcional } from "@/app/(app)/crm/crm-utils"
import { criarEntregaDoGanho } from "@/app/actions/entregas"

const MOTIVOS_PERDA_PADRAO: CrmItemLista[] = [
  { id: "fallback:Preço", nome: "Preço", ordem: 0, ativo: true },
  { id: "fallback:Prazo de entrega", nome: "Prazo de entrega", ordem: 1, ativo: true },
  { id: "fallback:Fechou com concorrente", nome: "Fechou com concorrente", ordem: 2, ativo: true },
  { id: "fallback:Desistiu do projeto", nome: "Desistiu do projeto", ordem: 3, ativo: true },
  { id: "fallback:Sem crédito / financiamento negado", nome: "Sem crédito / financiamento negado", ordem: 4, ativo: true },
  { id: "fallback:Sem retorno do cliente", nome: "Sem retorno do cliente", ordem: 5, ativo: true },
]

type Resultado<T = undefined> = { ok: true; dados?: T } | { ok: false; erro: string }
type Supa = Awaited<ReturnType<typeof createClient>>

async function sessao() {
  const supabase = await createClient()
  const user = await obterUsuario()
  return { supabase, user }
}

function ehAdmin(user: { user_metadata?: Record<string, unknown> } | null) {
  return user?.user_metadata?.cargo === "Administrador"
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null
  let s = String(v).trim().replace(/[R$\s]/g, "")
  // formato brasileiro "150.000,50": tira os pontos de milhar e troca a vírgula
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".")
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Medidas da estufa a partir dos parâmetros salvos no orçamento */
function medidas(p: Record<string, unknown> | null | undefined) {
  if (!p) return { largura: null, comprimento: null }
  const nMod = num(p.n_modulos)
  const lMod = num(p.largura_modulo)
  const largura = nMod && lMod ? nMod * lMod : null
  let comprimento = num(p.comprimento_estufa)
  if (!comprimento) {
    const vao = num(p.vao)
    const nVaos = num(p.n_vaos)
    comprimento = vao && nVaos ? vao * nVaos : null
  }
  return { largura, comprimento }
}

async function registrar(supabase: Supa, leadId: string, tipo: string, descricao: string) {
  await supabase.from("crm_lead_atividades").insert({ lead_id: leadId, tipo, descricao })
}

function revalidar(leadId?: string) {
  revalidatePath("/crm")
  if (leadId) revalidatePath(`/crm/lead/${leadId}`)
}

async function lerCampos(supabase: Supa): Promise<CrmCampo[]> {
  const { data } = await supabase.from("crm_campos").select("*").order("ordem")
  return (data || []) as CrmCampo[]
}

/** Limpa os valores dos campos personalizados (só ids conhecidos, sem vazios) */
function limparCampos(campos: CrmCampo[], valores: unknown): Record<string, unknown> {
  const saida: Record<string, unknown> = {}
  if (!valores || typeof valores !== "object") return saida
  const v = valores as Record<string, unknown>
  for (const c of campos) {
    let x = v[c.id]
    if (typeof x === "string") x = x.trim()
    if (x === undefined || x === null || x === "") continue
    saida[c.id] = x
  }
  return saida
}

function normalizarFunil(f: Record<string, any>, acessos: { funil_id: string; usuario_id: string }[]): CrmFunil {
  return {
    ...f,
    cor: f.cor || "#d97021",
    descricao: f.descricao ?? null,
    proximo_funil_id: f.proximo_funil_id ?? null,
    membros_veem_todos: !!f.membros_veem_todos,
    membros_editam_todos: !!f.membros_editam_todos,
    distribuicao_automatica: !!f.distribuicao_automatica,
    // antes do SQL v7 a coluna não existe: mantém o comportamento antigo (permite)
    permite_ganho: f.permite_ganho === undefined ? true : !!f.permite_ganho,
    funil_pai_id: f.funil_pai_id ?? null,
    usuarios: acessos.filter(a => a.funil_id === f.id).map(a => a.usuario_id),
  } as CrmFunil
}

const MSG_SEM_TABELAS =
  "As tabelas do CRM ainda não estão atualizadas neste banco. Rode as migrações 20261113000000_crm.sql, 20261114000000_crm_v2.sql e 20261115000000_crm_v3.sql."

// =====================================================================
// LEITURA
// =====================================================================

export async function obterQuadro(funilId?: string, opcoes?: { semLeads?: boolean }): Promise<CrmQuadro> {
  const { supabase, user } = await sessao()
  const vazio: CrmQuadro = {
    funis: [], funilAtual: null, etapas: [], leads: [], usuarios: [], origens: [], motivos: [], campos: [],
    contagemFunis: {}, config: CONFIG_PADRAO, isAdmin: false, userId: "", restrito: false, liberadoVerTodos: false, ehLogistica: false,
  }
  if (!user) return { ...vazio, erro: "Não autenticado" }
  const isAdmin = ehAdmin(user)
  const ehLogistica = user.user_metadata?.cargo === "Logística"

  const [funisR, acessosR, configR, usuariosR, origensR, motivosR, camposR, contagemR, permR] = await Promise.all([
    supabase.from("crm_funis").select("*").eq("ativo", true).order("ordem"),
    supabase.from("crm_funil_usuarios").select("funil_id, usuario_id"),
    supabase.from("crm_config").select("*").eq("id", 1).maybeSingle(),
    supabase.from("usuarios").select("id, nome").order("nome"),
    supabase.from("crm_origens").select("*").order("ordem"),
    supabase.from("crm_motivos_perda").select("*").order("ordem"),
    supabase.from("crm_campos").select("*").order("ordem"),
    supabase.from("crm_leads").select("funil_id").eq("status", "aberto"),
    // liberação dada pelo admin (tabela do CRM v5; se ainda não existir, vem erro e vale "não liberado")
    supabase.from("crm_permissoes_usuario").select("ver_todos").eq("usuario_id", user.id).maybeSingle(),
  ])
  const liberadoVerTodos = !permR.error && !!permR.data?.ver_todos
  // vendedor sem liberação só enxerga os próprios leads
  const restrito = !isAdmin && user.user_metadata?.cargo === "Vendedor" && !liberadoVerTodos

  if (funisR.error || acessosR.error) {
    const msg = (funisR.error || acessosR.error)!.message
    return {
      ...vazio, userId: user.id, isAdmin, restrito, liberadoVerTodos, ehLogistica,
      erro: /crm_funis|crm_funil_usuarios|membros_veem_todos|column/.test(msg) ? MSG_SEM_TABELAS : msg,
    }
  }

  const acessos = acessosR.data || []
  // Só os funis em que o usuário trabalha (lista vazia = todos)
  const todos = (funisR.data || []).map(f => normalizarFunil(f, acessos))
  // funil filho (Follow-up) usa a equipe do funil pai
  for (const f of todos) {
    if (f.funil_pai_id) f.usuarios = todos.find(p => p.id === f.funil_pai_id)?.usuarios || f.usuarios
  }
  const funis = todos
    // logística abre leads ganhos de qualquer funil (só leitura), então enxerga todos os funis
    .filter(f => isAdmin || ehLogistica || !f.usuarios!.length || f.usuarios!.includes(user.id))
  const funilAtual = funis.find(f => f.id === funilId) || funis[0] || null

  const contagemFunis: Record<string, number> = {}
  for (const l of contagemR.data || []) contagemFunis[l.funil_id] = (contagemFunis[l.funil_id] || 0) + 1

  let etapas: CrmEtapa[] = []
  let leads: CrmLead[] = []

  if (funilAtual) {
    const [etapasR, leadsR] = await Promise.all([
      supabase.from("crm_etapas").select("*").eq("funil_id", funilAtual.id).order("ordem"),
      opcoes?.semLeads
        ? Promise.resolve({ data: [] as Record<string, any>[], error: null })
        : supabase
          .from("crm_leads")
          .select("*, clientes(nome), orcamentos!orcamentos_lead_id_fkey(id, valor_total), crm_lead_tarefas(id, concluida, vence_em)")
          .eq("funil_id", funilAtual.id)
          .order("ordem"),
    ])
    etapas = (etapasR.data || []) as CrmEtapa[]

    const hoje = hojeISO()
    leads = (leadsR.data || []).map((l: Record<string, any>) => {
      const orcs = (l.orcamentos || []) as { valor_total: number }[]
      const tarefas = ((l.crm_lead_tarefas || []) as { concluida: boolean; vence_em: string | null }[])
        .filter(t => !t.concluida)
      const { clientes, orcamentos, crm_lead_tarefas, ...resto } = l
      return {
        ...resto,
        campos: resto.campos || {},
        score: Number(resto.score) || 0,
        cliente_nome: clientes?.nome ?? null,
        qtd_orcamentos: orcs.length,
        maior_orcamento: orcs.reduce((m, o) => Math.max(m, Number(o.valor_total) || 0), 0),
        tarefas_abertas: tarefas.length,
        tarefa_atrasada: tarefas.some(t => t.vence_em && t.vence_em < hoje),
      } as CrmLead
    })
    if (leadsR.error) console.error("obterQuadro leads", leadsR.error)
  }

  const motivosLista = (motivosR.data && motivosR.data.length > 0)
    ? motivosR.data
    : MOTIVOS_PERDA_PADRAO

  return {
    funis,
    funilAtual,
    etapas,
    leads,
    usuarios: usuariosR.data || [],
    origens: origensR.data || [],
    motivos: motivosLista,
    campos: ((camposR.data || []) as CrmCampo[]),
    contagemFunis,
    config: { ...CONFIG_PADRAO, ...(configR.data || {}) } as CrmConfig,
    isAdmin,
    userId: user.id,
    restrito,
    liberadoVerTodos,
    ehLogistica,
  }
}

export async function obterFichaLead(id: string): Promise<Resultado<CrmFichaLead>> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }

  const { data: lead, error } = await supabase
    .from("crm_leads")
    .select("*, clientes(id, nome, tipo_documento, documento, telefone, email, cidade_uf, endereco, contato, contato_telefone, nome_fantasia)")
    .eq("id", id)
    .maybeSingle()
  if (error) return { ok: false, erro: error.message }
  if (!lead) return { ok: false, erro: "Lead não encontrado ou sem permissão." }

  const [orcR, atvR, tarR, podeR] = await Promise.all([
    supabase
      .from("orcamentos")
      .select("*, clientes(telefone, documento, cidade_uf, endereco)")
      .eq("lead_id", id)
      .order("criado_em", { ascending: false }),
    supabase.from("crm_lead_atividades").select("*").eq("lead_id", id).order("criado_em", { ascending: false }),
    supabase.from("crm_lead_tarefas").select("*").eq("lead_id", id).order("concluida").order("vence_em", { nullsFirst: false }),
    supabase.rpc("crm_pode_editar_lead", { p_funil: lead.funil_id, p_vendedor: lead.vendedor_id }),
  ])

  // Propostas geradas a partir dos orçamentos do lead (consulta separada: se falhar, o resto continua)
  const ids = (orcR.data || []).map(o => o.id)
  const propostasPorOrc: Record<string, { id: string; status: string; criado_em: string }> = {}
  if (ids.length) {
    const { data: props } = await supabase
      .from("propostas")
      .select("id, status, criado_em, orcamento_id")
      .in("orcamento_id", ids)
      .order("criado_em", { ascending: false })
    for (const p of props || []) if (p.orcamento_id && !propostasPorOrc[p.orcamento_id]) propostasPorOrc[p.orcamento_id] = p
  }

  const orcamentos: CrmOrcamentoResumo[] = (orcR.data || []).map((o: Record<string, any>) => ({
    id: o.id,
    numero_pedido: o.numero_pedido ?? null,
    status: o.status,
    valor_total: Number(o.valor_total) || 0,
    criado_em: o.criado_em,
    ...medidas(o.parametros_utilizados),
    faltam_para_proposta: getCamposFaltando(o).map(c => c.label),
    proposta: propostasPorOrc[o.id] || null,
    frete: Number(o.frete) || 0,
    tipo_frete: o.tipo_frete ?? null,
  }))

  const { clientes, ...resto } = lead as Record<string, any>
  return {
    ok: true,
    dados: {
      lead: { ...resto, campos: resto.campos || {}, score: Number(resto.score) || 0, cliente_nome: clientes?.nome ?? null } as CrmLead,
      cliente: (clientes as CrmCliente) || null,
      orcamentos,
      atividades: atvR.data || [],
      tarefas: tarR.data || [],
      podeEditar: podeR.data === true,
    },
  }
}

/** Clientes que o usuário pode ver, para ligar ao lead */
export async function listarClientesParaLead(): Promise<{ id: string; nome: string; cidade_uf: string | null; documento: string | null; telefone: string | null }[]> {
  const { supabase } = await sessao()
  const { data } = await supabase.from("clientes").select("id, nome, cidade_uf, documento, telefone").order("nome").limit(1000)
  return data || []
}

/** Orçamentos sem lead, para ligar a um lead existente */
export async function listarOrcamentosSemLead(clienteId?: string | null) {
  const { supabase } = await sessao()
  let q = supabase
    .from("orcamentos")
    .select("id, numero_pedido, status, valor_total, criado_em, clientes(nome)")
    .is("lead_id", null)
    .order("criado_em", { ascending: false })
    .limit(50)
  if (clienteId) q = q.eq("cliente_id", clienteId)
  const { data } = await q
  return (data || []).map((o: Record<string, any>) => ({
    id: o.id as string,
    numero_pedido: o.numero_pedido as string | null,
    status: o.status as string,
    valor_total: Number(o.valor_total) || 0,
    criado_em: o.criado_em as string,
    cliente_nome: (o.clientes?.nome as string) || "",
  }))
}

// =====================================================================
// LEADS
// =====================================================================

const CAMPOS_LEAD = [
  "titulo", "contato_nome", "telefone", "email", "cidade", "uf", "origem_id", "cultura",
  "area_m2", "valor_estimado", "vendedor_id", "cliente_id", "proxima_acao_em", "observacoes", "prazo_entrega",
] as const

function limparLead(dados: Record<string, unknown>) {
  const saida: Record<string, unknown> = {}
  for (const c of CAMPOS_LEAD) {
    if (!(c in dados)) continue
    let v = dados[c]
    if (typeof v === "string") v = v.trim()
    if (v === "") v = null
    if (c === "area_m2" || c === "valor_estimado") v = num(v) ?? (c === "valor_estimado" ? 0 : null)
    if (c === "uf" && typeof v === "string") v = v.toUpperCase().slice(0, 2)
    saida[c] = v
  }
  return saida
}

export async function criarLead(
  dados: Record<string, unknown> & { funil_id: string; etapa_id?: string; campos?: Record<string, unknown> }
): Promise<Resultado<{ id: string; lead: CrmLead }>> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }
  const campos = limparLead(dados)
  if (!campos.titulo) return { ok: false, erro: "Informe o nome do lead." }
  if (!campos.prazo_entrega) delete campos.prazo_entrega // vazio: não manda (funciona mesmo antes do SQL v7)

  let etapaId = dados.etapa_id
  if (!etapaId) {
    const { data: primeira } = await supabase
      .from("crm_etapas").select("id").eq("funil_id", dados.funil_id).eq("tipo", "aberta")
      .order("ordem").limit(1).maybeSingle()
    etapaId = primeira?.id
  }
  if (!etapaId) return { ok: false, erro: "Este funil não tem etapas. Configure em Configurações → CRM." }

  if (!campos.vendedor_id || !ehAdmin(user)) campos.vendedor_id = user.id

  // Evita lead repetido por clique duplo / envio duplo: mesmo nome, mesmo funil, criado há menos de 2 minutos
  const doisMinAtras = new Date(Date.now() - 2 * 60 * 1000).toISOString()
  const { data: repetido } = await supabase
    .from("crm_leads").select("id")
    .eq("funil_id", dados.funil_id).ilike("titulo", String(campos.titulo).replace(/[\\%_]/g, "\\$&")).gte("criado_em", doisMinAtras)
    .limit(1).maybeSingle()
  if (repetido) return { ok: false, erro: "Um lead com este nome acabou de ser criado neste funil. Confira no quadro antes de criar de novo." }

  const defs = await lerCampos(supabase)
  const valoresCampos = limparCampos(defs, dados.campos)

  const { data, error } = await supabase
    .from("crm_leads")
    .insert({
      ...campos, funil_id: dados.funil_id, etapa_id: etapaId, ordem: Date.now(),
      campos: valoresCampos, score: calcularScore(defs, valoresCampos),
    })
    .select("*, clientes(nome)")
    .single()
  if (error) return { ok: false, erro: error.message }

  await registrar(supabase, data.id, "sistema", "Lead criado")
  revalidar()

  const { clientes, ...resto } = data as Record<string, any>
  const novoLead: CrmLead = {
    ...(resto as CrmLead),
    campos: resto.campos || {},
    score: Number(resto.score) || 0,
    cliente_nome: clientes?.nome ?? null,
    qtd_orcamentos: 0,
    maior_orcamento: 0,
    tarefas_abertas: 0,
    tarefa_atrasada: false,
  }
  return { ok: true, dados: { id: data.id, lead: novoLead } }
}

export async function atualizarLead(id: string, dados: Record<string, unknown> & { campos?: Record<string, unknown> }): Promise<Resultado> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }
  const campos: Record<string, unknown> = limparLead(dados)
  if ("titulo" in campos && !campos.titulo) return { ok: false, erro: "Informe o nome do lead." }
  if ("vendedor_id" in campos && !ehAdmin(user)) delete campos.vendedor_id

  if ("campos" in dados) {
    const defs = await lerCampos(supabase)
    const valores = limparCampos(defs, dados.campos)
    campos.campos = valores
    campos.score = calcularScore(defs, valores)
  }

  // Prazo de entrega de venda fechada é contratual: só o admin altera, e fica no histórico
  let prazoAnterior: string | null | undefined
  if ("prazo_entrega" in campos) {
    const { data: atual } = await supabase.from("crm_leads").select("*").eq("id", id).maybeSingle()
    const antes = (atual?.prazo_entrega as string | null | undefined) ?? null
    if (antes === (campos.prazo_entrega ?? null)) {
      delete campos.prazo_entrega // não mudou
    } else if (atual?.status === "ganho") {
      if (!ehAdmin(user)) return { ok: false, erro: "O prazo de entrega de uma venda fechada é contratual: só o administrador pode alterar." }
      if (!campos.prazo_entrega) return { ok: false, erro: "Venda fechada precisa ter prazo de entrega." }
      // com o registro de alterações (SQL v9), a mudança passa pelo "Alterar prazo", que exige motivo
      const { error: semTabela } = await supabase.from("crm_prazo_alteracoes").select("id").limit(1)
      if (!semTabela) return { ok: false, erro: "Use o botão \"Alterar prazo\" no cartão Prazo do contrato: a mudança precisa de motivo registrado." }
      prazoAnterior = antes
    }
  }

  let { data, error } = await supabase
    .from("crm_leads")
    .update({ ...campos, atualizado_em: new Date().toISOString() })
    .eq("id", id)
    .select("id")
  // antes do SQL v7 a coluna prazo_entrega não existe: salva o resto
  if (error && /prazo_entrega/.test(error.message) && "prazo_entrega" in campos) {
    if (campos.prazo_entrega) return { ok: false, erro: "Para salvar o prazo de entrega, rode a migração 20261124000000_crm_v7_ganho_vendas.sql." }
    delete campos.prazo_entrega
    ;({ data, error } = await supabase.from("crm_leads").update({ ...campos, atualizado_em: new Date().toISOString() }).eq("id", id).select("id"))
  }
  if (error) return { ok: false, erro: error.message }
  if (!data?.length) return { ok: false, erro: "Sem permissão para editar este lead." }

  if (prazoAnterior !== undefined && campos.prazo_entrega) {
    const br = (iso: string | null) => iso ? iso.split("-").reverse().join("/") : "—"
    await registrar(supabase, id, "sistema", `Prazo de entrega contratual alterado: ${br(prazoAnterior)} → ${br(String(campos.prazo_entrega))}`)
    // entrega ainda não programada que estava com o prazo antigo acompanha o novo
    if (prazoAnterior) {
      await supabase.from("ent_entregas").update({ chegada_prevista: campos.prazo_entrega })
        .eq("lead_id", id).eq("status", "a_programar").eq("chegada_prevista", prazoAnterior)
    }
  }

  revalidar(id)
  return { ok: true }
}

export async function excluirLead(id: string): Promise<Resultado> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }
  const { data, error } = await supabase.from("crm_leads").delete().eq("id", id).select("id")
  if (error) return { ok: false, erro: error.message }
  if (!data?.length) return { ok: false, erro: "Só o administrador pode excluir leads." }
  revalidar()
  return { ok: true }
}

/** Move o cartão para uma etapa ABERTA (ganho/perdido têm funções próprias). */
export async function moverLead(id: string, etapaId: string, ordem: number): Promise<Resultado> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }

  const [{ data: lead }, { data: etapa }] = await Promise.all([
    supabase.from("crm_leads").select("etapa_id, funil_id, status, crm_etapas(nome)").eq("id", id).maybeSingle(),
    supabase.from("crm_etapas").select("id, nome, tipo, funil_id").eq("id", etapaId).maybeSingle(),
  ])
  if (!lead || !etapa) return { ok: false, erro: "Lead ou etapa não encontrados." }
  // A tela pode estar desatualizada (ex.: o lead acabou de ser enviado para outro funil).
  // Sem esta trava o lead ficava com etapa de outro funil e sumia do quadro.
  if (etapa.funil_id !== lead.funil_id) {
    return { ok: false, erro: "Este lead já está em outro funil. A tela foi atualizada; tente de novo." }
  }
  if (etapa.tipo !== "aberta") return { ok: false, erro: "Use Ganho/Perdido para fechar o lead." }

  const mudouEtapa = lead.etapa_id !== etapaId
  const update: Record<string, unknown> = { etapa_id: etapaId, ordem, atualizado_em: new Date().toISOString() }
  if (mudouEtapa) update.etapa_desde = new Date().toISOString()
  if (lead.status !== "aberto") {
    Object.assign(update, {
      status: "aberto", ganho_em: null, perdido_em: null, motivo_perda_id: null,
      motivo_perda_obs: null, orcamento_ganho_id: null, valor_fechado: null,
    })
  }

  const { data, error } = await supabase.from("crm_leads").update(update).eq("id", id).select("id")
  if (error) return { ok: false, erro: error.message }
  if (!data?.length) return { ok: false, erro: "Sem permissão para mover este lead." }

  if (mudouEtapa) {
    const de = (lead as Record<string, any>).crm_etapas?.nome || "?"
    await registrar(
      supabase, id, "etapa",
      lead.status !== "aberto" ? `Lead reaberto em "${etapa.nome}"` : `Etapa: ${de} → ${etapa.nome}`
    )
  }
  revalidar(id)
  return { ok: true }
}

/** Envia o lead para outro funil (ex.: Marketing → SDR → Vendedores). */
export async function enviarLeadParaFunil(id: string, funilId: string, vendedorId: string | null): Promise<Resultado> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }
  const { data, error } = await supabase.rpc("crm_enviar_lead", {
    p_lead: id, p_funil: funilId, p_vendedor: vendedorId || null,
  })
  if (error) {
    return { ok: false, erro: error.message.includes("crm_enviar_lead") ? MSG_SEM_TABELAS : error.message }
  }
  if (data) return { ok: false, erro: String(data) }
  revalidar(id)
  return { ok: true }
}

/**
 * Move o lead entre o funil de vendas e o Follow-up dele (ida e volta), mantendo o responsável.
 * Devolve o funil de destino.
 */
export async function alternarFollowup(id: string): Promise<Resultado<{ funilId: string }>> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }
  const { data, error } = await supabase.rpc("crm_alternar_followup", { p_lead: id })
  if (error) {
    return {
      ok: false,
      erro: error.message.includes("crm_alternar_followup")
        ? "Falta rodar o SQL do Follow-up (20261127000000_crm_v9_followup.sql) no Supabase."
        : error.message,
    }
  }
  if (data) return { ok: false, erro: String(data) }
  const { data: l } = await supabase.from("crm_leads").select("funil_id").eq("id", id).maybeSingle()
  revalidar(id)
  return { ok: true, dados: { funilId: l?.funil_id || "" } }
}

/** Quem trabalha num funil com fila compartilhada pega o lead para si. */
export async function assumirLead(id: string): Promise<Resultado> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }
  const { data, error } = await supabase.rpc("crm_assumir_lead", { p_lead: id })
  if (error) {
    return { ok: false, erro: error.message.includes("crm_assumir_lead") ? MSG_SEM_TABELAS : error.message }
  }
  if (data) return { ok: false, erro: String(data) }
  revalidar(id)
  revalidatePath("/clientes")
  return { ok: true }
}

/**
 * Marca o lead como Ganho.
 * - Só no funil de vendas.
 * - Prazo de entrega obrigatório e não pode ser data passada (vai para o contrato; atraso gera multa).
 * - Pelo menos um orçamento fechado: o valor fechado é SEMPRE a soma dos orçamentos aprovados.
 * - A venda entra em Entregas como "a programar", com o prazo como data prevista.
 */
export async function marcarGanho(
  id: string,
  etapaId: string,
  orcamentoIds: string[],
  prazoEntrega: string
): Promise<Resultado<{ aviso?: string }>> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }

  const { data: etapa } = await supabase.from("crm_etapas").select("nome, tipo, funil_id").eq("id", etapaId).maybeSingle()
  if (etapa?.tipo !== "ganho") return { ok: false, erro: "Etapa inválida para ganho." }

  // Ganho só no funil de vendas
  const { data: lead } = await supabase.from("crm_leads").select("funil_id").eq("id", id).maybeSingle()
  if (!lead) return { ok: false, erro: "Lead não encontrado ou sem permissão." }
  if (etapa.funil_id !== lead.funil_id) return { ok: false, erro: "Essa etapa é de outro funil. Atualize a página." }
  const { data: funil } = await supabase.from("crm_funis").select("*").eq("id", lead.funil_id).maybeSingle()
  if (funil && funil.permite_ganho === false) {
    return { ok: false, erro: "Lead só pode ser marcado como Ganho no funil de vendas. Envie o lead para o funil de vendas primeiro." }
  }

  // Orçamento fechado obrigatório (o valor vem dele)
  const ids = Array.from(new Set((orcamentoIds || []).filter(Boolean)))
  if (!ids.length) return { ok: false, erro: "Marque qual orçamento o cliente fechou. O valor da venda vem do orçamento." }
  const { data: orcs, error: eSel } = await supabase.from("orcamentos").select("id, valor_total, lead_id").in("id", ids)
  if (eSel) return { ok: false, erro: eSel.message }
  if ((orcs?.length || 0) < ids.length) return { ok: false, erro: "Algum orçamento marcado não foi encontrado ou é de outro vendedor." }
  if (orcs!.some(o => o.lead_id && o.lead_id !== id)) return { ok: false, erro: "Algum orçamento marcado pertence a outro lead." }
  const valor = Math.round(orcs!.reduce((s, o) => s + (Number(o.valor_total) || 0), 0) * 100) / 100

  // Prazo de entrega: obrigatório e não pode ser passado
  if (!/^\d{4}-\d{2}-\d{2}$/.test(prazoEntrega || "")) return { ok: false, erro: "Prazo de entrega: escolha a data prometida ao cliente." }
  if (prazoEntrega < hojeISO()) return { ok: false, erro: "Prazo de entrega: a data já passou. Escolha uma data a partir de hoje." }

  // 1) fecha o lead (se algo travar aqui, nenhum orçamento é alterado)
  const agora = new Date().toISOString()
  const { data, error } = await supabase.from("crm_leads").update({
    etapa_id: etapaId, status: "ganho", ganho_em: agora, perdido_em: null, etapa_desde: agora,
    motivo_perda_id: null, motivo_perda_obs: null,
    orcamento_ganho_id: ids[0], valor_fechado: valor, atualizado_em: agora,
    prazo_entrega: prazoEntrega,
  }).eq("id", id).select("id")
  if (error) return { ok: false, erro: error.message }
  if (!data?.length) return { ok: false, erro: "Sem permissão para alterar este lead." }

  // 2) orçamentos fechados viram "Aprovado"
  let aviso: string | undefined
  const { data: aprov, error: eOrc } = await supabase
    .from("orcamentos").update({ status: "Aprovado", lead_id: id }).in("id", ids).select("id")
  if (eOrc || (aprov?.length || 0) < ids.length) {
    aviso = "Venda registrada, mas algum orçamento não pôde ser marcado como Aprovado. Marque \"Cliente fechou\" no cartão do lead."
  }

  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
  const [a, m, d] = prazoEntrega.split("-")
  await registrar(supabase, id, "ganho",
    `Lead GANHO — ${brl.format(valor)} (${ids.length} orçamento${ids.length > 1 ? "s" : ""} aprovado${ids.length > 1 ? "s" : ""}) · prazo de entrega contratual ${d}/${m}/${a}`)

  // 3) a venda entra no fluxo de entregas
  try {
    const ent = await criarEntregaDoGanho(id, prazoEntrega)
    if (!ent.ok) aviso = `Venda registrada, mas a entrega não foi criada: ${ent.erro} Crie em Entregas → Vendas fechadas.`
  } catch {
    aviso = "Venda registrada, mas a entrega não foi criada. Crie em Entregas → Vendas fechadas."
  }

  revalidar(id)
  revalidatePath("/orcamentos")
  revalidatePath("/entregas")
  return { ok: true, dados: { aviso } }
}

/**
 * Lead já ganho: marca/desmarca um orçamento como fechado pelo cliente.
 * O valor fechado do lead é sempre a soma dos orçamentos aprovados (precisa sobrar pelo menos um).
 */
export async function definirOrcamentoFechado(leadId: string, orcamentoId: string, fechado: boolean): Promise<Resultado> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }

  const { data: lead } = await supabase.from("crm_leads").select("id, status, orcamento_ganho_id").eq("id", leadId).maybeSingle()
  if (!lead) return { ok: false, erro: "Lead não encontrado." }
  if (lead.status !== "ganho") return { ok: false, erro: "Marque o lead como Ganho para escolher os orçamentos fechados." }

  if (!fechado) {
    const { data: outros } = await supabase.from("orcamentos").select("id")
      .eq("lead_id", leadId).eq("status", "Aprovado").neq("id", orcamentoId).limit(1)
    if (!outros?.length) return { ok: false, erro: "A venda precisa de pelo menos um orçamento fechado. Marque outro antes de desmarcar este." }
  }

  let novoStatus = "Aprovado"
  if (!fechado) {
    // volta para Enviado se já tem proposta, senão Rascunho
    const { data: prop } = await supabase.from("propostas").select("id").eq("orcamento_id", orcamentoId).limit(1)
    novoStatus = prop?.length ? "Enviado" : "Rascunho"
  }
  const { data: orc, error: eOrc } = await supabase.from("orcamentos")
    .update({ status: novoStatus }).eq("id", orcamentoId).eq("lead_id", leadId).select("id, numero_pedido")
  if (eOrc) return { ok: false, erro: eOrc.message }
  if (!orc?.length) return { ok: false, erro: "Sem permissão para alterar esse orçamento." }

  const { data: aprovados } = await supabase.from("orcamentos").select("id, valor_total").eq("lead_id", leadId).eq("status", "Aprovado")
  const soma = Math.round((aprovados || []).reduce((s, o) => s + (Number(o.valor_total) || 0), 0) * 100) / 100
  const ganhoId = (aprovados || []).some(o => o.id === lead.orcamento_ganho_id) ? lead.orcamento_ganho_id : (aprovados?.[0]?.id || null)

  const { data, error } = await supabase.from("crm_leads").update({
    orcamento_ganho_id: ganhoId, valor_fechado: soma, atualizado_em: new Date().toISOString(),
  }).eq("id", leadId).select("id")
  if (error) return { ok: false, erro: error.message }
  if (!data?.length) return { ok: false, erro: "Sem permissão para alterar este lead." }

  const nome = orc[0].numero_pedido || "#" + orcamentoId.slice(0, 8).toUpperCase()
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
  await registrar(supabase, leadId, "sistema", `Orçamento ${nome} ${fechado ? "marcado como fechado" : "desmarcado"} — valor fechado: ${brl.format(soma)}`)
  revalidar(leadId)
  revalidatePath("/orcamentos")
  return { ok: true }
}

export async function marcarPerdido(
  id: string,
  etapaId: string,
  motivoId: string | null,
  obs: string | null,
  perderOrcamentos: boolean,
  foraDoPerfil = false
): Promise<Resultado<{ nutricao: string | null }>> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }

  const [{ data: etapa }, { data: cfg }] = await Promise.all([
    supabase.from("crm_etapas").select("tipo").eq("id", etapaId).maybeSingle(),
    supabase.from("crm_config").select("motivo_perda_obrigatorio").eq("id", 1).maybeSingle(),
  ])
  if (etapa?.tipo !== "perdido") return { ok: false, erro: "Etapa inválida para perda." }
  // lead fora do perfil (entrou por engano) não precisa de motivo de negociação
  if (!foraDoPerfil && (cfg?.motivo_perda_obrigatorio ?? true) && !motivoId) return { ok: false, erro: "Motivo da perda é obrigatório" }

  const ehFallback = motivoId?.startsWith("fallback:")
  const motivoUuid = ehFallback ? null : motivoId
  const nomeFallback = ehFallback ? motivoId!.replace(/^fallback:/, "") : ""
  const obsFinal = [foraDoPerfil ? "Fora do perfil (entrou por engano)" : "", nomeFallback, obs?.trim()].filter(Boolean).join(" — ") || null

  const agora = new Date().toISOString()
  const { data, error } = await supabase.from("crm_leads").update({
    etapa_id: etapaId, status: "perdido", perdido_em: agora, ganho_em: null, etapa_desde: agora,
    motivo_perda_id: motivoUuid, motivo_perda_obs: obsFinal,
    orcamento_ganho_id: null, valor_fechado: null, atualizado_em: agora,
  }).eq("id", id).select("id")
  if (error) return { ok: false, erro: error.message }
  if (!data?.length) return { ok: false, erro: "Sem permissão para alterar este lead." }

  if (perderOrcamentos) {
    await supabase.from("orcamentos").update({ status: "Perdido" }).eq("lead_id", id).in("status", ["Rascunho", "Enviado"])
  }

  let nomeMotivo = nomeFallback
  if (motivoUuid) {
    const { data: m } = await supabase.from("crm_motivos_perda").select("nome").eq("id", motivoUuid).maybeSingle()
    nomeMotivo = m?.nome || ""
  }
  await registrar(supabase, id, "perdido",
    `Lead PERDIDO${foraDoPerfil ? " — FORA DO PERFIL (não vai para nutrição)" : ""}${nomeMotivo ? ` — ${nomeMotivo}` : ""}${obs?.trim() ? `: ${obs.trim()}` : ""}`)

  let nutricao: string | null = null
  if (foraDoPerfil) {
    // marca no lead para ninguém voltar a trabalhar nele
    const { data: l } = await supabase.from("crm_leads").select("campos").eq("id", id).maybeSingle()
    await supabase.from("crm_leads").update({ campos: { ...((l?.campos as Record<string, unknown>) || {}), fora_do_perfil: true } }).eq("id", id)
  } else {
    nutricao = await enviarParaNutricao(supabase, id)
  }
  revalidar(id)
  revalidatePath("/orcamentos")
  return { ok: true, dados: { nutricao } }
}

/**
 * Lead perdido que está no perfil da ArcoForte vai para o funil de Marketing (o funil com
 * "Marketing" no nome), na etapa de nutrição, com próxima ação em 30 dias. A perda fica
 * registrada no histórico. Se não houver funil de Marketing (ou o envio falhar), o lead
 * continua Perdido. Devolve o nome do funil para onde foi, ou null.
 */
async function enviarParaNutricao(supabase: Supa, leadId: string): Promise<string | null> {
  const { data: lead } = await supabase.from("crm_leads").select("funil_id").eq("id", leadId).maybeSingle()
  const { data: funis } = await supabase.from("crm_funis").select("id, nome, ativo, ordem").ilike("nome", "%marketing%").order("ordem")
  const destino = (funis || []).find(f => f.ativo !== false && f.id !== lead?.funil_id)
  if (!destino) return null

  let { data: msg, error } = await supabase.rpc("crm_enviar_lead", { p_lead: leadId, p_funil: destino.id, p_vendedor: null })
  if (!error && msg) {
    // o responsável atual não trabalha no Marketing: entrega para alguém da equipe do Marketing
    const { data: equipe } = await supabase.from("crm_funil_usuarios").select("usuario_id").eq("funil_id", destino.id).limit(1)
    if (equipe?.[0]) {
      ;({ data: msg, error } = await supabase.rpc("crm_enviar_lead", { p_lead: leadId, p_funil: destino.id, p_vendedor: equipe[0].usuario_id }))
    }
  }
  if (error || msg) return null

  const { data: etapas } = await supabase.from("crm_etapas").select("id, nome")
    .eq("funil_id", destino.id).eq("tipo", "aberta").ilike("nome", "%nutri%").order("ordem").limit(1)
  const etapa = etapas?.[0]
  const daqui30 = new Date(Date.now() + 30 * 86400000)
  const proxima = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(daqui30)
  await supabase.from("crm_leads").update({
    ...(etapa ? { etapa_id: etapa.id, etapa_desde: new Date().toISOString() } : {}),
    proxima_acao_em: proxima,
  }).eq("id", leadId)
  await registrar(supabase, leadId, "etapa",
    `Enviado ao funil "${destino.nome}"${etapa ? ` (${etapa.nome})` : ""} para nutrição. Próxima ação em 30 dias.`)
  return destino.nome
}

// =====================================================================
// HISTÓRICO, TAREFAS, ORÇAMENTOS E CLIENTE
// =====================================================================

export async function adicionarAtividade(leadId: string, tipo: string, descricao: string): Promise<Resultado<CrmAtividade>> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }
  if (!descricao.trim()) return { ok: false, erro: "Escreva a anotação." }
  const { data, error } = await supabase
    .from("crm_lead_atividades")
    .insert({ lead_id: leadId, tipo, descricao: descricao.trim() })
    .select("*")
    .single()
  if (error) return { ok: false, erro: error.message }
  await supabase.from("crm_leads").update({ atualizado_em: new Date().toISOString() }).eq("id", leadId)
  revalidar(leadId)
  return { ok: true, dados: data as CrmAtividade }
}

export async function excluirAtividade(id: string): Promise<Resultado> {
  const { supabase } = await sessao()
  const { error } = await supabase.from("crm_lead_atividades").delete().eq("id", id)
  if (error) return { ok: false, erro: error.message }
  return { ok: true }
}

export async function criarTarefa(leadId: string, titulo: string, venceEm: string | null): Promise<Resultado<CrmTarefa>> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }
  if (!titulo.trim()) return { ok: false, erro: "Escreva a tarefa." }
  const erroData = validarDataOpcional(venceEm)
  if (erroData) return { ok: false, erro: erroData }
  const dataLimpa = venceEm?.trim() || null
  const { data, error } = await supabase
    .from("crm_lead_tarefas")
    .insert({ lead_id: leadId, titulo: titulo.trim(), vence_em: dataLimpa })
    .select("*")
    .single()
  if (error) return { ok: false, erro: error.message }
  revalidar(leadId)
  return { ok: true, dados: data as CrmTarefa }
}

export async function alternarTarefa(id: string, concluida: boolean): Promise<Resultado> {
  const { supabase } = await sessao()
  const { data, error } = await supabase
    .from("crm_lead_tarefas")
    .update({ concluida, concluida_em: concluida ? new Date().toISOString() : null })
    .eq("id", id)
    .select("lead_id, titulo")
  if (error) return { ok: false, erro: error.message }
  if (concluida && data?.[0]) await registrar(supabase, data[0].lead_id, "sistema", `Tarefa concluída: ${data[0].titulo}`)
  revalidar(data?.[0]?.lead_id)
  return { ok: true }
}

export async function excluirTarefa(id: string): Promise<Resultado> {
  const { supabase } = await sessao()
  const { error } = await supabase.from("crm_lead_tarefas").delete().eq("id", id)
  if (error) return { ok: false, erro: error.message }
  revalidar()
  return { ok: true }
}

export async function vincularOrcamento(leadId: string, orcamentoId: string): Promise<Resultado> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }
  const { data, error } = await supabase.from("orcamentos").update({ lead_id: leadId }).eq("id", orcamentoId).select("valor_total, cliente_id")
  if (error) return { ok: false, erro: error.message }
  if (!data?.length) return { ok: false, erro: "Sem permissão para esse orçamento." }

  // Se o lead ainda não tem cliente, usa o cliente do orçamento
  const { data: lead } = await supabase.from("crm_leads").select("cliente_id").eq("id", leadId).maybeSingle()
  if (lead && !lead.cliente_id && data[0].cliente_id) {
    await supabase.from("crm_leads").update({ cliente_id: data[0].cliente_id }).eq("id", leadId)
  }
  await registrar(supabase, leadId, "orcamento", "Orçamento existente ligado a este lead")
  revalidar(leadId)
  return { ok: true }
}

export async function desvincularOrcamento(leadId: string, orcamentoId: string): Promise<Resultado> {
  const { supabase } = await sessao()
  const { error } = await supabase.from("orcamentos").update({ lead_id: null }).eq("id", orcamentoId).eq("lead_id", leadId)
  if (error) return { ok: false, erro: error.message }
  await registrar(supabase, leadId, "orcamento", "Orçamento desligado deste lead")
  revalidar(leadId)
  return { ok: true }
}

/** Liga um cliente já cadastrado ao lead */
export async function ligarClienteAoLead(leadId: string, clienteId: string): Promise<Resultado> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }
  const { data: cli } = await supabase.from("clientes").select("nome").eq("id", clienteId).maybeSingle()
  if (!cli) return { ok: false, erro: "Cliente não encontrado." }
  const { data, error } = await supabase.from("crm_leads").update({ cliente_id: clienteId }).eq("id", leadId).select("id")
  if (error) return { ok: false, erro: error.message }
  if (!data?.length) return { ok: false, erro: "Sem permissão para editar este lead." }
  await registrar(supabase, leadId, "sistema", `Cliente ligado: ${cli.nome}`)
  revalidar(leadId)
  return { ok: true }
}

export async function desligarClienteDoLead(leadId: string): Promise<Resultado> {
  const { supabase } = await sessao()
  const { data, error } = await supabase.from("crm_leads").update({ cliente_id: null }).eq("id", leadId).select("id")
  if (error) return { ok: false, erro: error.message }
  if (!data?.length) return { ok: false, erro: "Sem permissão para editar este lead." }
  await registrar(supabase, leadId, "sistema", "Cliente desligado do lead")
  revalidar(leadId)
  return { ok: true }
}

const CAMPOS_CLIENTE = [
  "nome", "tipo_documento", "documento", "telefone", "email", "cidade_uf", "endereco",
  "contato", "contato_telefone", "nome_fantasia",
] as const

/**
 * Cadastra um cliente para o lead (cadastro simples ou completo) e liga os dois.
 * Campos vazios ficam nulos; o cadastro pode ser completado depois.
 */
export async function cadastrarClienteParaLead(leadId: string, dados: Record<string, unknown>): Promise<Resultado<{ clienteId: string }>> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }
  const { data: lead } = await supabase.from("crm_leads").select("id, vendedor_id, cliente_id").eq("id", leadId).maybeSingle()
  if (!lead) return { ok: false, erro: "Lead não encontrado." }

  const cli: Record<string, unknown> = {}
  for (const c of CAMPOS_CLIENTE) {
    let v = dados[c]
    if (typeof v === "string") v = v.trim()
    cli[c] = v === "" || v === undefined ? null : v
  }
  if (!cli.nome) return { ok: false, erro: "Informe o nome do cliente." }
  // O banco só deixa o vendedor criar cliente em nome dele (admin pode em nome de qualquer um)
  cli.vendedor_id = ehAdmin(user) ? lead.vendedor_id : user.id

  const { data: novo, error } = await supabase.from("clientes").insert(cli).select("id").single()
  if (error) return { ok: false, erro: error.message }

  await supabase.from("crm_leads").update({ cliente_id: novo.id }).eq("id", leadId)
  await registrar(supabase, leadId, "sistema", `Cliente cadastrado: ${cli.nome}`)
  revalidar(leadId)
  revalidatePath("/clientes")
  return { ok: true, dados: { clienteId: novo.id } }
}

/** Completa / corrige o cadastro do cliente ligado ao lead */
export async function atualizarClienteDoLead(leadId: string, clienteId: string, dados: Record<string, unknown>): Promise<Resultado> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }
  const cli: Record<string, unknown> = {}
  for (const c of CAMPOS_CLIENTE) {
    if (!(c in dados)) continue
    let v = dados[c]
    if (typeof v === "string") v = v.trim()
    cli[c] = v === "" ? null : v
  }
  if ("nome" in cli && !cli.nome) return { ok: false, erro: "Informe o nome do cliente." }
  const { data, error } = await supabase.from("clientes").update({ ...cli, atualizado_em: new Date().toISOString() }).eq("id", clienteId).select("id")
  if (error) return { ok: false, erro: error.message }
  if (!data?.length) return { ok: false, erro: "Sem permissão para editar este cliente (ele pertence a outro vendedor)." }
  revalidar(leadId)
  revalidatePath("/clientes")
  return { ok: true }
}

/** Chamado pelo formulário de orçamento quando ele é salvo a partir de um lead */
export async function registrarOrcamentoNoLead(leadId: string, orcamentoId: string, valor: number): Promise<Resultado> {
  const { supabase } = await sessao()
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
  await supabase.from("orcamentos").update({ lead_id: leadId }).eq("id", orcamentoId)
  await registrar(supabase, leadId, "orcamento", `Novo orçamento criado — ${brl.format(valor || 0)}`)
  // Lead ainda sem valor: o valor do negócio passa a ser o do orçamento.
  // Se já tinha valor, a página do lead sugere atualizar (não troca sozinho).
  const { data: lead } = await supabase.from("crm_leads").select("valor_estimado, status").eq("id", leadId).maybeSingle()
  if (lead && lead.status === "aberto" && !Number(lead.valor_estimado) && valor > 0) {
    await supabase.from("crm_leads").update({ valor_estimado: Math.round(valor * 100) / 100 }).eq("id", leadId)
  }
  revalidar(leadId)
  return { ok: true }
}

// =====================================================================
// CONFIGURAÇÃO (somente admin — o banco também bloqueia)
// =====================================================================

async function exigirAdmin() {
  const s = await sessao()
  if (!s.user) return { ...s, erro: "Não autenticado" }
  if (!ehAdmin(s.user)) return { ...s, erro: "Somente administradores podem alterar o CRM." }
  return { ...s, erro: null as string | null }
}

export async function obterConfigCrm() {
  const { supabase } = await sessao()
  const [funis, acessos, etapas, motivos, origens, config, leads, campos, usuarios] = await Promise.all([
    supabase.from("crm_funis").select("*").order("ordem"),
    supabase.from("crm_funil_usuarios").select("funil_id, usuario_id"),
    supabase.from("crm_etapas").select("*").order("ordem"),
    supabase.from("crm_motivos_perda").select("*").order("ordem"),
    supabase.from("crm_origens").select("*").order("ordem"),
    supabase.from("crm_config").select("*").eq("id", 1).maybeSingle(),
    supabase.from("crm_leads").select("etapa_id"),
    supabase.from("crm_campos").select("*").order("ordem"),
    supabase.from("usuarios").select("id, nome").order("nome"),
  ])
  const usoEtapa: Record<string, number> = {}
  for (const l of leads.data || []) usoEtapa[l.etapa_id] = (usoEtapa[l.etapa_id] || 0) + 1
  const erro = funis.error?.message || acessos.error?.message || campos.error?.message || null
  return {
    erro: erro ? `${MSG_SEM_TABELAS} (${erro})` : null,
    funis: (funis.data || []).map(f => normalizarFunil(f, acessos.data || [])),
    etapas: (etapas.data || []) as CrmEtapa[],
    motivos: motivos.data || [],
    origens: origens.data || [],
    campos: (campos.data || []) as CrmCampo[],
    usuarios: (usuarios.data || []) as { id: string; nome: string }[],
    config: { ...CONFIG_PADRAO, ...(config.data || {}) } as CrmConfig,
    usoEtapa,
  }
}

export async function salvarConfigCrm(cfg: CrmConfig): Promise<Resultado> {
  const { supabase, erro } = await exigirAdmin()
  if (erro) return { ok: false, erro }
  const morno = Math.max(0, Math.round(Number(cfg.score_morno) || 0))
  const quente = Math.max(morno + 1, Math.round(Number(cfg.score_quente) || 0))
  const { error } = await supabase.from("crm_config").upsert({
    id: 1,
    motivo_perda_obrigatorio: !!cfg.motivo_perda_obrigatorio,
    dias_alerta_parado: Math.max(1, Math.round(Number(cfg.dias_alerta_parado) || 7)),
    score_morno: morno,
    score_quente: quente,
    atualizado_em: new Date().toISOString(),
  })
  if (error) return { ok: false, erro: error.message }
  revalidar()
  return { ok: true }
}

export async function salvarFunil(f: Partial<CrmFunil> & { nome: string }): Promise<Resultado<{ id: string }>> {
  const { supabase, erro } = await exigirAdmin()
  if (erro) return { ok: false, erro }
  if (!f.nome?.trim()) return { ok: false, erro: "Informe o nome do funil." }

  const campos: Record<string, unknown> = { nome: f.nome.trim() }
  if (f.ordem !== undefined) campos.ordem = f.ordem
  if (f.ativo !== undefined) campos.ativo = f.ativo
  if (f.cor !== undefined) campos.cor = f.cor || "#d97021"
  if (f.descricao !== undefined) campos.descricao = f.descricao?.trim() || null
  if (f.proximo_funil_id !== undefined) campos.proximo_funil_id = f.proximo_funil_id && f.proximo_funil_id !== f.id ? f.proximo_funil_id : null
  if (f.membros_veem_todos !== undefined) campos.membros_veem_todos = !!f.membros_veem_todos
  if (f.membros_editam_todos !== undefined) campos.membros_editam_todos = !!f.membros_veem_todos && !!f.membros_editam_todos
  if (f.distribuicao_automatica !== undefined) campos.distribuicao_automatica = !!f.distribuicao_automatica
  if (f.permite_ganho !== undefined) campos.permite_ganho = !!f.permite_ganho

  let id = f.id
  if (id) {
    const { error } = await supabase.from("crm_funis").update(campos).eq("id", id)
    if (error) return { ok: false, erro: error.message }
    // virou funil de vendas e não tem etapa de Ganho: cria
    if (f.permite_ganho) {
      const { data: tem } = await supabase.from("crm_etapas").select("id").eq("funil_id", id).eq("tipo", "ganho").limit(1)
      if (!tem?.length) {
        await supabase.from("crm_etapas").insert({ funil_id: id, nome: "Ganho", cor: "#16a34a", ordem: 98, tipo: "ganho", probabilidade: 100 })
      }
    }
  } else {
    const { data, error } = await supabase.from("crm_funis").insert({ ordem: 99, ...campos }).select("id").single()
    if (error) return { ok: false, erro: error.message }
    id = data.id as string
    // Funil novo já nasce com as etapas mínimas (Ganho só se for funil de vendas)
    await supabase.from("crm_etapas").insert([
      { funil_id: id, nome: "Novo lead", cor: "#64748b", ordem: 0, tipo: "aberta", probabilidade: 5 },
      ...(f.permite_ganho ? [{ funil_id: id, nome: "Ganho", cor: "#16a34a", ordem: 98, tipo: "ganho", probabilidade: 100 }] : []),
      { funil_id: id, nome: f.permite_ganho ? "Perdido" : "Descartado", cor: "#dc2626", ordem: 99, tipo: "perdido", probabilidade: 0 },
    ])
  }

  // Lista de usuários do funil (vazia = todos)
  if (f.usuarios) {
    const { error: eDel } = await supabase.from("crm_funil_usuarios").delete().eq("funil_id", id)
    if (eDel) return { ok: false, erro: eDel.message }
    if (f.usuarios.length) {
      const { error: eIns } = await supabase.from("crm_funil_usuarios").insert(f.usuarios.map(u => ({ funil_id: id, usuario_id: u })))
      if (eIns) return { ok: false, erro: eIns.message }
    }
  }

  revalidar()
  return { ok: true, dados: { id: id! } }
}

export async function excluirFunil(id: string): Promise<Resultado> {
  const { supabase, erro } = await exigirAdmin()
  if (erro) return { ok: false, erro }
  const { count } = await supabase.from("crm_leads").select("id", { count: "exact", head: true }).eq("funil_id", id)
  if (count) return { ok: false, erro: `Este funil tem ${count} lead(s). Desative o funil em vez de excluir, ou mova os leads antes.` }
  const { error } = await supabase.from("crm_funis").delete().eq("id", id)
  if (error) return { ok: false, erro: error.message }
  revalidar()
  return { ok: true }
}

export async function salvarEtapa(e: Partial<CrmEtapa> & { funil_id: string; nome: string }): Promise<Resultado> {
  const { supabase, erro } = await exigirAdmin()
  if (erro) return { ok: false, erro }
  if (!e.nome?.trim()) return { ok: false, erro: "Informe o nome da etapa." }
  if (e.tipo === "ganho") {
    const { data: fun } = await supabase.from("crm_funis").select("*").eq("id", e.funil_id).maybeSingle()
    if (fun && fun.permite_ganho === false) {
      return { ok: false, erro: "Etapa de Ganho só existe no funil de vendas. Marque o funil como \"Funil de vendas\" primeiro." }
    }
  }
  const campos = {
    funil_id: e.funil_id,
    nome: e.nome.trim(),
    cor: e.cor || "#64748b",
    ordem: e.ordem ?? 0,
    tipo: e.tipo || "aberta",
    probabilidade: Math.min(100, Math.max(0, Math.round(Number(e.probabilidade) || 0))),
  }
  const { error } = e.id
    ? await supabase.from("crm_etapas").update(campos).eq("id", e.id)
    : await supabase.from("crm_etapas").insert(campos)
  if (error) return { ok: false, erro: error.message }
  revalidar()
  return { ok: true }
}

export async function reordenarEtapas(ids: string[]): Promise<Resultado> {
  const { supabase, erro } = await exigirAdmin()
  if (erro) return { ok: false, erro }
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase.from("crm_etapas").update({ ordem: i }).eq("id", ids[i])
    if (error) return { ok: false, erro: error.message }
  }
  revalidar()
  return { ok: true }
}

export async function excluirEtapa(id: string, moverParaId?: string): Promise<Resultado> {
  const { supabase, erro } = await exigirAdmin()
  if (erro) return { ok: false, erro }
  const { count } = await supabase.from("crm_leads").select("id", { count: "exact", head: true }).eq("etapa_id", id)
  if (count) {
    if (!moverParaId) return { ok: false, erro: `Esta etapa tem ${count} lead(s). Escolha para qual etapa movê-los.` }
    const { error: eMov } = await supabase.from("crm_leads").update({ etapa_id: moverParaId }).eq("etapa_id", id)
    if (eMov) return { ok: false, erro: eMov.message }
  }
  const { error } = await supabase.from("crm_etapas").delete().eq("id", id)
  if (error) return { ok: false, erro: error.message }
  revalidar()
  return { ok: true }
}

export async function salvarItemLista(
  tabela: "crm_motivos_perda" | "crm_origens",
  item: { id?: string; nome: string; ordem?: number; ativo?: boolean }
): Promise<Resultado> {
  const { supabase, erro } = await exigirAdmin()
  if (erro) return { ok: false, erro }
  if (!item.nome?.trim()) return { ok: false, erro: "Informe o nome." }
  const campos = { nome: item.nome.trim(), ordem: item.ordem ?? 0, ativo: item.ativo ?? true }
  const { error } = item.id
    ? await supabase.from(tabela).update(campos).eq("id", item.id)
    : await supabase.from(tabela).insert(campos)
  if (error) return { ok: false, erro: error.message }
  revalidar()
  return { ok: true }
}

export async function excluirItemLista(tabela: "crm_motivos_perda" | "crm_origens", id: string): Promise<Resultado> {
  const { supabase, erro } = await exigirAdmin()
  if (erro) return { ok: false, erro }
  const { error } = await supabase.from(tabela).delete().eq("id", id)
  if (error) return { ok: false, erro: error.message }
  revalidar()
  return { ok: true }
}

// ---------------------------------------------------------------------
// Campos personalizados (qualificação + score)
// ---------------------------------------------------------------------

/** Recalcula o score de todos os leads (depois de mudar os pontos dos campos) */
async function recalcularScores(supabase: Supa) {
  const defs = await lerCampos(supabase)
  const { data: leads } = await supabase.from("crm_leads").select("id, campos, score")
  for (const l of leads || []) {
    const novo = calcularScore(defs, l.campos as Record<string, unknown>)
    if (novo !== l.score) await supabase.from("crm_leads").update({ score: novo }).eq("id", l.id)
  }
}

export async function salvarCampo(c: Partial<CrmCampo> & { nome: string }): Promise<Resultado> {
  const { supabase, erro } = await exigirAdmin()
  if (erro) return { ok: false, erro }
  if (!c.nome?.trim()) return { ok: false, erro: "Informe o nome do campo." }
  const tipo = c.tipo || "texto"
  let opcoes = (c.opcoes || []).map(o => ({ ...o, pontos: Math.round(Number(o.pontos) || 0) }))
  if (tipo === "selecao") {
    opcoes = opcoes.filter(o => o.rotulo?.trim()).map(o => ({
      id: o.id || Math.random().toString(36).slice(2, 10), rotulo: o.rotulo!.trim(), pontos: o.pontos,
    }))
    if (!opcoes.length) return { ok: false, erro: "Cadastre pelo menos uma opção." }
  } else if (tipo === "numero") {
    opcoes = opcoes.map(o => ({ min: Number(o.min) || 0, pontos: o.pontos })).sort((a, b) => a.min - b.min)
  } else {
    opcoes = []
  }
  const campos = {
    nome: c.nome.trim(),
    tipo,
    opcoes,
    pontos_sim: tipo === "sim_nao" ? Math.round(Number(c.pontos_sim) || 0) : 0,
    funis: c.funis || [],
    ajuda: c.ajuda?.trim() || null,
    ordem: c.ordem ?? 0,
    ativo: c.ativo ?? true,
  }
  const { error } = c.id
    ? await supabase.from("crm_campos").update(campos).eq("id", c.id)
    : await supabase.from("crm_campos").insert(campos)
  if (error) return { ok: false, erro: error.message }
  await recalcularScores(supabase)
  revalidar()
  return { ok: true }
}

export async function excluirCampo(id: string): Promise<Resultado> {
  const { supabase, erro } = await exigirAdmin()
  if (erro) return { ok: false, erro }
  const { error } = await supabase.from("crm_campos").delete().eq("id", id)
  if (error) return { ok: false, erro: error.message }
  await recalcularScores(supabase)
  revalidar()
  return { ok: true }
}

export async function reordenarCampos(ids: string[]): Promise<Resultado> {
  const { supabase, erro } = await exigirAdmin()
  if (erro) return { ok: false, erro }
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase.from("crm_campos").update({ ordem: i }).eq("id", ids[i])
    if (error) return { ok: false, erro: error.message }
  }
  revalidar()
  return { ok: true }
}
