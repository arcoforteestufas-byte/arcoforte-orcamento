"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import type {
  EntEntrega, EntMotorista, EntPainel, EntTransportadora, EntVeiculo, EntViagem, StatusViagem,
} from "@/lib/entregas-types"

type Resultado<T = undefined> = { ok: true; dados?: T } | { ok: false; erro: string }
type Supa = Awaited<ReturnType<typeof createClient>>

async function sessao() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

function podeGerenciar(user: { user_metadata?: Record<string, unknown> } | null) {
  const cargo = user?.user_metadata?.cargo
  return cargo === "Administrador" || cargo === "Logística"
}

async function exigirGerente() {
  const s = await sessao()
  if (!s.user) return { ...s, erro: "Não autenticado" }
  if (!podeGerenciar(s.user)) return { ...s, erro: "Somente Administrador ou Logística pode alterar entregas." }
  return { ...s, erro: null as string | null }
}

function revalidar(viagemId?: string | null) {
  revalidatePath("/entregas")
  if (viagemId) revalidatePath(`/entregas/viagem/${viagemId}`)
}

function texto(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

function numero(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null
  let s = String(v).trim().replace(/[R$\s]/g, "")
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".")
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

const MSG_SEM_TABELAS = "As tabelas de entregas ainda não foram criadas neste banco. Rode a migração 20261117000000_entregas.sql."

// =====================================================================
// LOCALIZAÇÃO (endereço → coordenadas) — OpenStreetMap / Nominatim
// =====================================================================

async function buscarCoordenadas(consulta: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(consulta)}`
    const r = await fetch(url, {
      headers: { "User-Agent": "ArcoForte-Orcamento/1.0 (sistema interno de entregas)", "Accept-Language": "pt-BR" },
      cache: "no-store",
    })
    if (!r.ok) return null
    const j = (await r.json()) as { lat: string; lon: string }[]
    if (!j?.length) return null
    return { lat: Number(j[0].lat), lng: Number(j[0].lon) }
  } catch {
    return null
  }
}

/** Tenta o endereço completo; se não achar, usa só a cidade/UF. */
export async function geocodificar(endereco: string | null, cidade: string | null, uf: string | null) {
  const cidadeUf = [cidade, uf].filter(Boolean).join(", ")
  if (endereco && cidadeUf) {
    const r = await buscarCoordenadas(`${endereco}, ${cidadeUf}, Brasil`)
    if (r) return { ...r, precisao: "endereco" as const }
  }
  if (cidadeUf) {
    const r = await buscarCoordenadas(`${cidadeUf}, Brasil`)
    if (r) return { ...r, precisao: "cidade" as const }
  }
  return null
}

// =====================================================================
// LEITURA
// =====================================================================

export async function obterPainel(): Promise<EntPainel> {
  const { supabase, user } = await sessao()
  const vazio: EntPainel = {
    transportadoras: [], veiculos: [], motoristas: [], viagens: [], entregas: [], usuarios: [],
    podeGerenciar: false, userId: "",
  }
  if (!user) return { ...vazio, erro: "Não autenticado" }

  const [tr, ve, mo, vi, en, us] = await Promise.all([
    supabase.from("ent_transportadoras").select("*").order("nome"),
    supabase.from("ent_veiculos").select("*").order("placa"),
    supabase.from("ent_motoristas").select("*").order("nome"),
    supabase.from("ent_viagens").select("*").order("saida_prevista", { ascending: false }),
    supabase.from("ent_entregas").select("*").order("chegada_prevista", { nullsFirst: false }).order("ordem"),
    supabase.from("usuarios").select("id, nome").order("nome"),
  ])
  const erro = tr.error || vi.error || en.error
  if (erro) {
    return { ...vazio, userId: user.id, podeGerenciar: podeGerenciar(user), erro: /ent_/.test(erro.message) ? MSG_SEM_TABELAS : erro.message }
  }
  return {
    transportadoras: (tr.data || []) as EntTransportadora[],
    veiculos: (ve.data || []) as EntVeiculo[],
    motoristas: (mo.data || []) as EntMotorista[],
    viagens: (vi.data || []) as EntViagem[],
    entregas: (en.data || []) as EntEntrega[],
    usuarios: us.data || [],
    podeGerenciar: podeGerenciar(user),
    userId: user.id,
  }
}

export async function obterPosicoes(viagemId: string, limite = 300) {
  const { supabase } = await sessao()
  const { data } = await supabase
    .from("ent_posicoes").select("lat, lng, registrado_em")
    .eq("viagem_id", viagemId).order("registrado_em", { ascending: false }).limit(limite)
  return (data || []).reverse() as { lat: number; lng: number; registrado_em: string }[]
}

/** Dados para criar uma entrega a partir de um lead (ganho) */
export async function dadosEntregaDoLead(leadId: string): Promise<Resultado<Partial<EntEntrega> & { aviso?: string }>> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }
  const { data: lead } = await supabase
    .from("crm_leads")
    .select("id, titulo, telefone, cidade, uf, cliente_id, orcamento_ganho_id, contato_nome, clientes(nome, telefone, endereco, cidade_uf)")
    .eq("id", leadId).maybeSingle()
  if (!lead) return { ok: false, erro: "Lead não encontrado ou sem permissão." }

  // orçamento fechado; se não houver, o mais recente do lead
  let orc: Record<string, any> | null = null
  if (lead.orcamento_ganho_id) {
    const { data } = await supabase.from("orcamentos").select("id, numero_pedido, valor_total, endereco_entrega, prazo_entrega").eq("id", lead.orcamento_ganho_id).maybeSingle()
    orc = data
  }
  if (!orc) {
    const { data } = await supabase.from("orcamentos").select("id, numero_pedido, valor_total, endereco_entrega, prazo_entrega")
      .eq("lead_id", leadId).neq("status", "Perdido").order("criado_em", { ascending: false }).limit(1).maybeSingle()
    orc = data
  }

  // peso da carga = soma(quantidade × peso do produto)
  let peso: number | null = null
  if (orc) {
    const { data: itens } = await supabase.from("orcamento_itens").select("quantidade, produtos(peso_bruto_kg)").eq("orcamento_id", orc.id)
    const total = (itens || []).reduce((s: number, i: Record<string, any>) => s + (Number(i.quantidade) || 0) * (Number(i.produtos?.peso_bruto_kg) || 0), 0)
    peso = total > 0 ? Math.round(total * 100) / 100 : null
  }

  const cli = (lead as Record<string, any>).clientes as Record<string, any> | null
  const [cidCli, ufCli] = String(cli?.cidade_uf || "").split(/\s*[/-]\s*/)
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
  return {
    ok: true,
    dados: {
      lead_id: lead.id,
      cliente_id: lead.cliente_id,
      orcamento_id: orc?.id ?? null,
      destinatario: cli?.nome || lead.titulo,
      telefone: lead.telefone || cli?.telefone || null,
      endereco: orc?.endereco_entrega || cli?.endereco || null,
      cidade: lead.cidade || cidCli || null,
      uf: lead.uf || (ufCli && ufCli.length === 2 ? ufCli.toUpperCase() : null),
      peso_kg: peso,
      descricao_carga: orc ? `Pedido ${orc.numero_pedido || "#" + String(orc.id).slice(0, 8).toUpperCase()} — ${brl.format(Number(orc.valor_total) || 0)}` : null,
      observacoes: orc?.prazo_entrega ? `Prazo combinado: ${orc.prazo_entrega}` : null,
      aviso: orc ? undefined : "Este lead não tem orçamento ligado; preencha a carga manualmente.",
    },
  }
}

// =====================================================================
// ENTREGAS
// =====================================================================

const CAMPOS_ENTREGA = [
  "cliente_id", "lead_id", "orcamento_id", "destinatario", "telefone", "endereco", "cidade", "uf",
  "chegada_prevista", "peso_kg", "descricao_carga", "observacoes",
] as const

export async function salvarEntrega(
  e: Partial<EntEntrega> & { destinatario: string; localizar?: boolean }
): Promise<Resultado<{ id: string; aviso?: string }>> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }
  const gerente = podeGerenciar(user)

  const campos: Record<string, unknown> = {}
  for (const c of CAMPOS_ENTREGA) {
    if (!(c in e)) continue
    const v = (e as Record<string, unknown>)[c]
    campos[c] = c === "peso_kg" ? numero(v) : texto(v)
  }
  if (!campos.destinatario) return { ok: false, erro: "Informe o destinatário (cliente)." }
  if (typeof campos.uf === "string") campos.uf = campos.uf.toUpperCase().slice(0, 2)

  // Localização: usa a marcada no mapa; senão busca pelo endereço
  let aviso: string | undefined
  if (e.lat != null && e.lng != null && !e.localizar) {
    campos.lat = e.lat
    campos.lng = e.lng
  } else if (campos.endereco || campos.cidade) {
    const g = await geocodificar(campos.endereco as string | null, campos.cidade as string | null, campos.uf as string | null)
    if (g) {
      campos.lat = g.lat
      campos.lng = g.lng
      if (g.precisao === "cidade") aviso = "Endereço exato não encontrado no mapa: o ponto ficou no centro da cidade. Ajuste no mapa se quiser."
    } else {
      campos.lat = null
      campos.lng = null
      aviso = "Não achei esse endereço no mapa. A entrega foi salva, mas sem ponto no mapa — marque no mapa ao editar."
    }
  }

  if (gerente) {
    if ("viagem_id" in e) campos.viagem_id = e.viagem_id || null
  } else {
    campos.viagem_id = null
    campos.status = "a_programar"
  }
  if (gerente && !e.id) {
    campos.status = campos.viagem_id ? "programada" : "a_programar"
  } else if (gerente && "viagem_id" in e && e.status !== "entregue" && e.status !== "cancelada") {
    campos.status = campos.viagem_id ? (e.status === "em_rota" ? "em_rota" : "programada") : "a_programar"
  }
  if (campos.viagem_id && !e.id) {
    const { data: ult } = await supabase.from("ent_entregas").select("ordem").eq("viagem_id", campos.viagem_id).order("ordem", { ascending: false }).limit(1).maybeSingle()
    campos.ordem = (ult?.ordem ?? -1) + 1
  }

  campos.atualizado_em = new Date().toISOString()
  const r = e.id
    ? await supabase.from("ent_entregas").update(campos).eq("id", e.id).select("id, viagem_id")
    : await supabase.from("ent_entregas").insert({ ...campos, solicitado_por: user.id }).select("id, viagem_id")
  if (r.error) return { ok: false, erro: /ent_entregas/.test(r.error.message) ? MSG_SEM_TABELAS : r.error.message }
  if (!r.data?.length) return { ok: false, erro: "Sem permissão para alterar esta entrega." }

  // registra no histórico do lead
  if (!e.id && campos.lead_id) {
    await supabase.from("crm_lead_atividades").insert({
      lead_id: campos.lead_id, tipo: "sistema",
      descricao: gerente && campos.viagem_id ? "Entrega programada" : "Entrega solicitada para a logística",
    })
    revalidatePath(`/crm/lead/${campos.lead_id}`)
  }
  revalidar(r.data[0].viagem_id)
  return { ok: true, dados: { id: r.data[0].id, aviso } }
}

export async function excluirEntrega(id: string): Promise<Resultado> {
  const { supabase, erro } = await exigirGerente()
  if (erro) return { ok: false, erro }
  const { error } = await supabase.from("ent_entregas").delete().eq("id", id)
  if (error) return { ok: false, erro: error.message }
  revalidar()
  return { ok: true }
}

/** Coloca a entrega numa viagem (ou tira, voltando para "a programar") */
export async function programarEntrega(id: string, viagemId: string | null): Promise<Resultado> {
  const { supabase, erro } = await exigirGerente()
  if (erro) return { ok: false, erro }
  let ordem = 0
  let status: string = "a_programar"
  if (viagemId) {
    const [{ data: ult }, { data: vg }] = await Promise.all([
      supabase.from("ent_entregas").select("ordem").eq("viagem_id", viagemId).order("ordem", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("ent_viagens").select("status, saida_prevista").eq("id", viagemId).maybeSingle(),
    ])
    ordem = (ult?.ordem ?? -1) + 1
    status = vg?.status === "em_rota" ? "em_rota" : "programada"
  }
  const { data: atual } = await supabase.from("ent_entregas").select("viagem_id, chegada_prevista").eq("id", id).maybeSingle()
  const { error } = await supabase.from("ent_entregas")
    .update({ viagem_id: viagemId, ordem, status, atualizado_em: new Date().toISOString() }).eq("id", id)
  if (error) return { ok: false, erro: error.message }
  revalidar(viagemId || atual?.viagem_id)
  return { ok: true }
}

export async function reordenarEntregas(viagemId: string, ids: string[]): Promise<Resultado> {
  const { supabase, erro } = await exigirGerente()
  if (erro) return { ok: false, erro }
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase.from("ent_entregas").update({ ordem: i }).eq("id", ids[i]).eq("viagem_id", viagemId)
    if (error) return { ok: false, erro: error.message }
  }
  revalidar(viagemId)
  return { ok: true }
}

export async function marcarEntregue(id: string, entregue: boolean): Promise<Resultado> {
  const { supabase, erro } = await exigirGerente()
  if (erro) return { ok: false, erro }
  const { data: e } = await supabase.from("ent_entregas").select("viagem_id, lead_id").eq("id", id).maybeSingle()
  let statusVolta = "a_programar"
  if (!entregue && e?.viagem_id) {
    const { data: vg } = await supabase.from("ent_viagens").select("status").eq("id", e.viagem_id).maybeSingle()
    statusVolta = vg?.status === "em_rota" ? "em_rota" : "programada"
  }
  const { error } = await supabase.from("ent_entregas").update({
    status: entregue ? "entregue" : statusVolta,
    entregue_em: entregue ? new Date().toISOString() : null,
    atualizado_em: new Date().toISOString(),
  }).eq("id", id)
  if (error) return { ok: false, erro: error.message }
  if (entregue && e?.lead_id) {
    await supabase.from("crm_lead_atividades").insert({ lead_id: e.lead_id, tipo: "sistema", descricao: "Entrega realizada" })
  }
  revalidar(e?.viagem_id)
  return { ok: true }
}

export async function cancelarEntrega(id: string): Promise<Resultado> {
  const { supabase, erro } = await exigirGerente()
  if (erro) return { ok: false, erro }
  const { data, error } = await supabase.from("ent_entregas")
    .update({ status: "cancelada", atualizado_em: new Date().toISOString() }).eq("id", id).select("viagem_id")
  if (error) return { ok: false, erro: error.message }
  revalidar(data?.[0]?.viagem_id)
  return { ok: true }
}

// =====================================================================
// VIAGENS
// =====================================================================

export async function salvarViagem(v: Partial<EntViagem> & { saida_prevista: string }): Promise<Resultado<{ id: string }>> {
  const { supabase, erro } = await exigirGerente()
  if (erro) return { ok: false, erro }
  if (!v.saida_prevista) return { ok: false, erro: "Informe a data de saída." }
  if (v.retorno_previsto && v.retorno_previsto < v.saida_prevista) return { ok: false, erro: "O retorno não pode ser antes da saída." }

  const campos: Record<string, unknown> = {
    titulo: texto(v.titulo),
    veiculo_id: v.veiculo_id || null,
    motorista_id: v.motorista_id || null,
    transportadora_id: v.transportadora_id || null,
    terceirizada: !!v.terceirizada,
    saida_prevista: v.saida_prevista,
    retorno_previsto: v.retorno_previsto || null,
    custo_frete: numero(v.custo_frete),
    observacoes: texto(v.observacoes),
    atualizado_em: new Date().toISOString(),
  }
  const r = v.id
    ? await supabase.from("ent_viagens").update(campos).eq("id", v.id).select("id")
    : await supabase.from("ent_viagens").insert(campos).select("id")
  if (r.error) return { ok: false, erro: /ent_viagens/.test(r.error.message) ? MSG_SEM_TABELAS : r.error.message }
  revalidar(r.data?.[0]?.id)
  return { ok: true, dados: { id: r.data![0].id } }
}

export async function alterarStatusViagem(id: string, status: StatusViagem): Promise<Resultado> {
  const { supabase, erro } = await exigirGerente()
  if (erro) return { ok: false, erro }
  const agora = new Date().toISOString()
  const campos: Record<string, unknown> = { status, atualizado_em: agora }
  if (status === "em_rota") campos.saida_real = agora
  if (status === "concluida") campos.retorno_real = agora
  if (status === "planejada") { campos.saida_real = null; campos.retorno_real = null }
  const { error } = await supabase.from("ent_viagens").update(campos).eq("id", id)
  if (error) return { ok: false, erro: error.message }

  // acompanha o status das paradas
  if (status === "em_rota") await supabase.from("ent_entregas").update({ status: "em_rota" }).eq("viagem_id", id).eq("status", "programada")
  if (status === "planejada") await supabase.from("ent_entregas").update({ status: "programada" }).eq("viagem_id", id).eq("status", "em_rota")
  if (status === "cancelada") {
    // as entregas não entregues voltam para "a programar"
    await supabase.from("ent_entregas").update({ status: "a_programar", viagem_id: null })
      .eq("viagem_id", id).in("status", ["programada", "em_rota"])
  }
  revalidar(id)
  return { ok: true }
}

export async function excluirViagem(id: string): Promise<Resultado> {
  const { supabase, erro } = await exigirGerente()
  if (erro) return { ok: false, erro }
  await supabase.from("ent_entregas").update({ status: "a_programar", viagem_id: null })
    .eq("viagem_id", id).in("status", ["programada", "em_rota"])
  const { error } = await supabase.from("ent_viagens").delete().eq("id", id)
  if (error) return { ok: false, erro: error.message }
  revalidar()
  return { ok: true }
}

// =====================================================================
// CADASTROS
// =====================================================================

async function salvarCadastro(
  supabase: Supa, tabela: string, id: string | undefined, campos: Record<string, unknown>
): Promise<Resultado<{ id: string }>> {
  const r = id
    ? await supabase.from(tabela).update(campos).eq("id", id).select("id")
    : await supabase.from(tabela).insert(campos).select("id")
  if (r.error) return { ok: false, erro: /ent_/.test(r.error.message) && /exist|find/.test(r.error.message) ? MSG_SEM_TABELAS : r.error.message }
  revalidar()
  return { ok: true, dados: { id: r.data![0].id } }
}

export async function salvarTransportadora(t: Partial<EntTransportadora> & { nome: string }) {
  const { supabase, erro } = await exigirGerente()
  if (erro) return { ok: false as const, erro }
  if (!texto(t.nome)) return { ok: false as const, erro: "Informe o nome da transportadora." }
  return salvarCadastro(supabase, "ent_transportadoras", t.id, {
    nome: texto(t.nome), documento: texto(t.documento), telefone: texto(t.telefone), contato: texto(t.contato),
    email: texto(t.email), observacoes: texto(t.observacoes), ativo: t.ativo ?? true,
  })
}

export async function salvarVeiculo(v: Partial<EntVeiculo> & { placa: string }) {
  const { supabase, erro } = await exigirGerente()
  if (erro) return { ok: false as const, erro }
  if (!texto(v.placa)) return { ok: false as const, erro: "Informe a placa." }
  return salvarCadastro(supabase, "ent_veiculos", v.id, {
    placa: String(v.placa).trim().toUpperCase(), descricao: texto(v.descricao), proprio: v.proprio ?? true,
    transportadora_id: v.proprio === false ? v.transportadora_id || null : null,
    capacidade_kg: numero(v.capacidade_kg), cor: v.cor || "#d97021", ativo: v.ativo ?? true, observacoes: texto(v.observacoes),
  })
}

export async function salvarMotorista(m: Partial<EntMotorista> & { nome: string }) {
  const { supabase, erro } = await exigirGerente()
  if (erro) return { ok: false as const, erro }
  if (!texto(m.nome)) return { ok: false as const, erro: "Informe o nome do motorista." }
  return salvarCadastro(supabase, "ent_motoristas", m.id, {
    nome: texto(m.nome), telefone: texto(m.telefone), cnh: texto(m.cnh), cnh_validade: m.cnh_validade || null,
    transportadora_id: m.transportadora_id || null, ativo: m.ativo ?? true, observacoes: texto(m.observacoes),
  })
}

export async function excluirCadastro(tabela: "ent_transportadoras" | "ent_veiculos" | "ent_motoristas", id: string): Promise<Resultado> {
  const { supabase, erro } = await exigirGerente()
  if (erro) return { ok: false, erro }
  const { error } = await supabase.from(tabela).delete().eq("id", id)
  if (error) return { ok: false, erro: error.message }
  revalidar()
  return { ok: true }
}
