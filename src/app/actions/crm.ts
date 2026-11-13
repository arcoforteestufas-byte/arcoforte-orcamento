"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import {
  CONFIG_PADRAO,
  type CrmConfig,
  type CrmEtapa,
  type CrmFichaLead,
  type CrmLead,
  type CrmQuadro,
  type CrmOrcamentoResumo,
} from "@/lib/crm-types"

type Resultado<T = undefined> = { ok: true; dados?: T } | { ok: false; erro: string }

async function sessao() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

function ehAdmin(user: { user_metadata?: Record<string, unknown> } | null) {
  return user?.user_metadata?.cargo === "Administrador"
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = Number(String(v).replace(",", "."))
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

async function registrar(
  supabase: Awaited<ReturnType<typeof createClient>>,
  leadId: string,
  tipo: string,
  descricao: string
) {
  await supabase.from("crm_lead_atividades").insert({ lead_id: leadId, tipo, descricao })
}

function revalidar() {
  revalidatePath("/crm")
}

// =====================================================================
// LEITURA
// =====================================================================

export async function obterQuadro(funilId?: string): Promise<CrmQuadro> {
  const { supabase, user } = await sessao()
  const vazio: CrmQuadro = {
    funis: [], funilAtual: null, etapas: [], leads: [], usuarios: [], origens: [], motivos: [],
    config: CONFIG_PADRAO, isAdmin: false, userId: "",
  }
  if (!user) return { ...vazio, erro: "Não autenticado" }

  const [funisR, configR, usuariosR, origensR, motivosR] = await Promise.all([
    supabase.from("crm_funis").select("*").eq("ativo", true).order("ordem"),
    supabase.from("crm_config").select("*").eq("id", 1).maybeSingle(),
    supabase.from("usuarios").select("id, nome").order("nome"),
    supabase.from("crm_origens").select("*").order("ordem"),
    supabase.from("crm_motivos_perda").select("*").order("ordem"),
  ])

  if (funisR.error) {
    return {
      ...vazio,
      userId: user.id,
      isAdmin: ehAdmin(user),
      erro: funisR.error.message.includes("crm_funis")
        ? "As tabelas do CRM ainda não foram criadas neste banco. Rode a migração 20261113000000_crm.sql."
        : funisR.error.message,
    }
  }

  const funis = funisR.data || []
  const funilAtual = funis.find(f => f.id === funilId) || funis[0] || null

  let etapas: CrmEtapa[] = []
  let leads: CrmLead[] = []

  if (funilAtual) {
    const [etapasR, leadsR] = await Promise.all([
      supabase.from("crm_etapas").select("*").eq("funil_id", funilAtual.id).order("ordem"),
      supabase
        .from("crm_leads")
        .select("*, clientes(nome), orcamentos!orcamentos_lead_id_fkey(id, valor_total), crm_lead_tarefas(id, concluida, vence_em)")
        .eq("funil_id", funilAtual.id)
        .order("ordem"),
    ])
    etapas = (etapasR.data || []) as CrmEtapa[]

    const hoje = new Date().toISOString().slice(0, 10)
    leads = (leadsR.data || []).map((l: Record<string, any>) => {
      const orcs = (l.orcamentos || []) as { valor_total: number }[]
      const tarefas = ((l.crm_lead_tarefas || []) as { concluida: boolean; vence_em: string | null }[])
        .filter(t => !t.concluida)
      const { clientes, orcamentos, crm_lead_tarefas, ...resto } = l
      return {
        ...resto,
        cliente_nome: clientes?.nome ?? null,
        qtd_orcamentos: orcs.length,
        maior_orcamento: orcs.reduce((m, o) => Math.max(m, Number(o.valor_total) || 0), 0),
        tarefas_abertas: tarefas.length,
        tarefa_atrasada: tarefas.some(t => t.vence_em && t.vence_em < hoje),
      } as CrmLead
    })
    if (leadsR.error) console.error("obterQuadro leads", leadsR.error)
  }

  return {
    funis,
    funilAtual,
    etapas,
    leads,
    usuarios: usuariosR.data || [],
    origens: origensR.data || [],
    motivos: motivosR.data || [],
    config: { ...CONFIG_PADRAO, ...(configR.data || {}) } as CrmConfig,
    isAdmin: ehAdmin(user),
    userId: user.id,
  }
}

export async function obterFichaLead(id: string): Promise<Resultado<CrmFichaLead>> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }

  const { data: lead, error } = await supabase
    .from("crm_leads")
    .select("*, clientes(nome)")
    .eq("id", id)
    .maybeSingle()
  if (error) return { ok: false, erro: error.message }
  if (!lead) return { ok: false, erro: "Lead não encontrado ou sem permissão." }

  const [orcR, atvR, tarR] = await Promise.all([
    supabase
      .from("orcamentos")
      .select("id, numero_pedido, status, valor_total, criado_em, parametros_utilizados")
      .eq("lead_id", id)
      .order("criado_em", { ascending: false }),
    supabase.from("crm_lead_atividades").select("*").eq("lead_id", id).order("criado_em", { ascending: false }),
    supabase.from("crm_lead_tarefas").select("*").eq("lead_id", id).order("concluida").order("vence_em", { nullsFirst: false }),
  ])

  const orcamentos: CrmOrcamentoResumo[] = (orcR.data || []).map((o: Record<string, any>) => ({
    id: o.id,
    numero_pedido: o.numero_pedido ?? null,
    status: o.status,
    valor_total: Number(o.valor_total) || 0,
    criado_em: o.criado_em,
    ...medidas(o.parametros_utilizados),
  }))

  const { clientes, ...resto } = lead as Record<string, any>
  return {
    ok: true,
    dados: {
      lead: { ...resto, cliente_nome: clientes?.nome ?? null } as CrmLead,
      orcamentos,
      atividades: atvR.data || [],
      tarefas: tarR.data || [],
    },
  }
}

/** Clientes que o usuário pode ver, para ligar ao lead */
export async function listarClientesParaLead(): Promise<{ id: string; nome: string; cidade_uf: string | null }[]> {
  const { supabase } = await sessao()
  const { data } = await supabase.from("clientes").select("id, nome, cidade_uf").order("nome")
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
  "area_m2", "valor_estimado", "vendedor_id", "cliente_id", "proxima_acao_em", "observacoes",
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

export async function criarLead(dados: Record<string, unknown> & { funil_id: string; etapa_id?: string }): Promise<Resultado<{ id: string }>> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }
  const campos = limparLead(dados)
  if (!campos.titulo) return { ok: false, erro: "Informe o nome do lead." }

  let etapaId = dados.etapa_id
  if (!etapaId) {
    const { data: primeira } = await supabase
      .from("crm_etapas").select("id").eq("funil_id", dados.funil_id).eq("tipo", "aberta")
      .order("ordem").limit(1).maybeSingle()
    etapaId = primeira?.id
  }
  if (!etapaId) return { ok: false, erro: "Este funil não tem etapas. Configure em Configurações → CRM." }

  if (!campos.vendedor_id || !ehAdmin(user)) campos.vendedor_id = user.id

  const { data, error } = await supabase
    .from("crm_leads")
    .insert({ ...campos, funil_id: dados.funil_id, etapa_id: etapaId, ordem: Date.now() })
    .select("id")
    .single()
  if (error) return { ok: false, erro: error.message }

  await registrar(supabase, data.id, "sistema", "Lead criado")
  revalidar()
  return { ok: true, dados: { id: data.id } }
}

export async function atualizarLead(id: string, dados: Record<string, unknown>): Promise<Resultado> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }
  const campos = limparLead(dados)
  if ("titulo" in campos && !campos.titulo) return { ok: false, erro: "Informe o nome do lead." }
  if ("vendedor_id" in campos && !ehAdmin(user)) delete campos.vendedor_id

  const { data, error } = await supabase
    .from("crm_leads")
    .update({ ...campos, atualizado_em: new Date().toISOString() })
    .eq("id", id)
    .select("id, vendedor_id")
  if (error) return { ok: false, erro: error.message }
  if (!data?.length) return { ok: false, erro: "Sem permissão para editar este lead." }

  revalidar()
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
    supabase.from("crm_leads").select("etapa_id, status, crm_etapas(nome)").eq("id", id).maybeSingle(),
    supabase.from("crm_etapas").select("id, nome, tipo").eq("id", etapaId).maybeSingle(),
  ])
  if (!lead || !etapa) return { ok: false, erro: "Lead ou etapa não encontrados." }
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
  revalidar()
  return { ok: true }
}

export async function marcarGanho(
  id: string,
  etapaId: string,
  orcamentoId: string | null,
  valorFechado: number | null
): Promise<Resultado> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }

  const { data: etapa } = await supabase.from("crm_etapas").select("nome, tipo").eq("id", etapaId).maybeSingle()
  if (etapa?.tipo !== "ganho") return { ok: false, erro: "Etapa inválida para ganho." }

  let valor = valorFechado
  if (orcamentoId) {
    const { data: orc, error: eOrc } = await supabase
      .from("orcamentos").update({ status: "Aprovado", lead_id: id }).eq("id", orcamentoId)
      .select("valor_total, numero_pedido")
    if (eOrc) return { ok: false, erro: eOrc.message }
    if (!orc?.length) return { ok: false, erro: "Sem permissão para aprovar esse orçamento." }
    if (valor === null) valor = Number(orc[0].valor_total) || 0
  }

  const agora = new Date().toISOString()
  const { data, error } = await supabase.from("crm_leads").update({
    etapa_id: etapaId, status: "ganho", ganho_em: agora, perdido_em: null, etapa_desde: agora,
    motivo_perda_id: null, motivo_perda_obs: null,
    orcamento_ganho_id: orcamentoId, valor_fechado: valor, atualizado_em: agora,
  }).eq("id", id).select("id")
  if (error) return { ok: false, erro: error.message }
  if (!data?.length) return { ok: false, erro: "Sem permissão para alterar este lead." }

  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
  await registrar(supabase, id, "ganho", `Lead GANHO${valor ? ` — ${brl.format(valor)}` : ""}${orcamentoId ? " (orçamento aprovado)" : ""}`)
  revalidar()
  revalidatePath("/orcamentos")
  return { ok: true }
}

export async function marcarPerdido(
  id: string,
  etapaId: string,
  motivoId: string | null,
  obs: string | null,
  perderOrcamentos: boolean
): Promise<Resultado> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }

  const [{ data: etapa }, { data: cfg }] = await Promise.all([
    supabase.from("crm_etapas").select("tipo").eq("id", etapaId).maybeSingle(),
    supabase.from("crm_config").select("motivo_perda_obrigatorio").eq("id", 1).maybeSingle(),
  ])
  if (etapa?.tipo !== "perdido") return { ok: false, erro: "Etapa inválida para perda." }
  if ((cfg?.motivo_perda_obrigatorio ?? true) && !motivoId) return { ok: false, erro: "Escolha o motivo da perda." }

  const agora = new Date().toISOString()
  const { data, error } = await supabase.from("crm_leads").update({
    etapa_id: etapaId, status: "perdido", perdido_em: agora, ganho_em: null, etapa_desde: agora,
    motivo_perda_id: motivoId, motivo_perda_obs: obs?.trim() || null,
    orcamento_ganho_id: null, valor_fechado: null, atualizado_em: agora,
  }).eq("id", id).select("id")
  if (error) return { ok: false, erro: error.message }
  if (!data?.length) return { ok: false, erro: "Sem permissão para alterar este lead." }

  if (perderOrcamentos) {
    await supabase.from("orcamentos").update({ status: "Perdido" }).eq("lead_id", id).in("status", ["Rascunho", "Enviado"])
  }

  let nomeMotivo = ""
  if (motivoId) {
    const { data: m } = await supabase.from("crm_motivos_perda").select("nome").eq("id", motivoId).maybeSingle()
    nomeMotivo = m?.nome || ""
  }
  await registrar(supabase, id, "perdido", `Lead PERDIDO${nomeMotivo ? ` — ${nomeMotivo}` : ""}${obs?.trim() ? `: ${obs.trim()}` : ""}`)
  revalidar()
  revalidatePath("/orcamentos")
  return { ok: true }
}

// =====================================================================
// HISTÓRICO, TAREFAS, ORÇAMENTOS E CLIENTE
// =====================================================================

export async function adicionarAtividade(leadId: string, tipo: string, descricao: string): Promise<Resultado> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }
  if (!descricao.trim()) return { ok: false, erro: "Escreva a anotação." }
  const { error } = await supabase.from("crm_lead_atividades").insert({ lead_id: leadId, tipo, descricao: descricao.trim() })
  if (error) return { ok: false, erro: error.message }
  await supabase.from("crm_leads").update({ atualizado_em: new Date().toISOString() }).eq("id", leadId)
  revalidar()
  return { ok: true }
}

export async function excluirAtividade(id: string): Promise<Resultado> {
  const { supabase } = await sessao()
  const { error } = await supabase.from("crm_lead_atividades").delete().eq("id", id)
  if (error) return { ok: false, erro: error.message }
  return { ok: true }
}

export async function criarTarefa(leadId: string, titulo: string, venceEm: string | null): Promise<Resultado> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }
  if (!titulo.trim()) return { ok: false, erro: "Escreva a tarefa." }
  const { error } = await supabase.from("crm_lead_tarefas").insert({ lead_id: leadId, titulo: titulo.trim(), vence_em: venceEm || null })
  if (error) return { ok: false, erro: error.message }
  revalidar()
  return { ok: true }
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
  revalidar()
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
  revalidar()
  return { ok: true }
}

export async function desvincularOrcamento(leadId: string, orcamentoId: string): Promise<Resultado> {
  const { supabase } = await sessao()
  const { error } = await supabase.from("orcamentos").update({ lead_id: null }).eq("id", orcamentoId).eq("lead_id", leadId)
  if (error) return { ok: false, erro: error.message }
  await registrar(supabase, leadId, "orcamento", "Orçamento desligado deste lead")
  revalidar()
  return { ok: true }
}

/** Cria o cadastro de cliente com os dados do lead e liga os dois. */
export async function criarClienteDoLead(leadId: string): Promise<Resultado<{ clienteId: string }>> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }
  const { data: lead } = await supabase.from("crm_leads").select("*").eq("id", leadId).maybeSingle()
  if (!lead) return { ok: false, erro: "Lead não encontrado." }
  if (lead.cliente_id) return { ok: true, dados: { clienteId: lead.cliente_id } }

  const cidadeUf = [lead.cidade, lead.uf].filter(Boolean).join(" - ") || null
  const { data: cli, error } = await supabase.from("clientes").insert({
    nome: lead.titulo,
    telefone: lead.telefone,
    email: lead.email,
    contato: lead.contato_nome,
    cidade_uf: cidadeUf,
    vendedor_id: lead.vendedor_id,
  }).select("id").single()
  if (error) return { ok: false, erro: error.message }

  await supabase.from("crm_leads").update({ cliente_id: cli.id }).eq("id", leadId)
  await registrar(supabase, leadId, "sistema", "Cadastro de cliente criado a partir do lead")
  revalidar()
  return { ok: true, dados: { clienteId: cli.id } }
}

/** Chamado pelo formulário de orçamento quando ele é salvo a partir de um lead */
export async function registrarOrcamentoNoLead(leadId: string, orcamentoId: string, valor: number): Promise<Resultado> {
  const { supabase } = await sessao()
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
  await supabase.from("orcamentos").update({ lead_id: leadId }).eq("id", orcamentoId)
  await registrar(supabase, leadId, "orcamento", `Novo orçamento criado — ${brl.format(valor || 0)}`)
  revalidar()
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
  const [funis, etapas, motivos, origens, config, leads] = await Promise.all([
    supabase.from("crm_funis").select("*").order("ordem"),
    supabase.from("crm_etapas").select("*").order("ordem"),
    supabase.from("crm_motivos_perda").select("*").order("ordem"),
    supabase.from("crm_origens").select("*").order("ordem"),
    supabase.from("crm_config").select("*").eq("id", 1).maybeSingle(),
    supabase.from("crm_leads").select("etapa_id"),
  ])
  const usoEtapa: Record<string, number> = {}
  for (const l of leads.data || []) usoEtapa[l.etapa_id] = (usoEtapa[l.etapa_id] || 0) + 1
  return {
    erro: funis.error?.message || null,
    funis: funis.data || [],
    etapas: (etapas.data || []) as CrmEtapa[],
    motivos: motivos.data || [],
    origens: origens.data || [],
    config: { ...CONFIG_PADRAO, ...(config.data || {}) } as CrmConfig,
    usoEtapa,
  }
}

export async function salvarConfigCrm(cfg: CrmConfig): Promise<Resultado> {
  const { supabase, erro } = await exigirAdmin()
  if (erro) return { ok: false, erro }
  const { error } = await supabase.from("crm_config").upsert({
    id: 1,
    vendedor_ve_todos: !!cfg.vendedor_ve_todos,
    vendedor_edita_todos: !!cfg.vendedor_edita_todos,
    motivo_perda_obrigatorio: !!cfg.motivo_perda_obrigatorio,
    dias_alerta_parado: Math.max(1, Math.round(Number(cfg.dias_alerta_parado) || 7)),
    atualizado_em: new Date().toISOString(),
  })
  if (error) return { ok: false, erro: error.message }
  revalidar()
  return { ok: true }
}

export async function salvarFunil(f: { id?: string; nome: string; ordem?: number; ativo?: boolean }): Promise<Resultado<{ id: string }>> {
  const { supabase, erro } = await exigirAdmin()
  if (erro) return { ok: false, erro }
  if (!f.nome?.trim()) return { ok: false, erro: "Informe o nome do funil." }

  if (f.id) {
    const { error } = await supabase.from("crm_funis").update({ nome: f.nome.trim(), ordem: f.ordem ?? 0, ativo: f.ativo ?? true }).eq("id", f.id)
    if (error) return { ok: false, erro: error.message }
    revalidar()
    return { ok: true, dados: { id: f.id } }
  }

  const { data, error } = await supabase.from("crm_funis").insert({ nome: f.nome.trim(), ordem: f.ordem ?? 99 }).select("id").single()
  if (error) return { ok: false, erro: error.message }
  // Funil novo já nasce com as etapas mínimas
  await supabase.from("crm_etapas").insert([
    { funil_id: data.id, nome: "Novo lead", cor: "#64748b", ordem: 0, tipo: "aberta", probabilidade: 5 },
    { funil_id: data.id, nome: "Ganho", cor: "#16a34a", ordem: 98, tipo: "ganho", probabilidade: 100 },
    { funil_id: data.id, nome: "Perdido", cor: "#dc2626", ordem: 99, tipo: "perdido", probabilidade: 0 },
  ])
  revalidar()
  return { ok: true, dados: { id: data.id } }
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
