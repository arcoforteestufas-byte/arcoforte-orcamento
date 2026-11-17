"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { acharCidade, cidadePorIbge, cidadesDaUf, rotaPorEstrada } from "@/lib/geo/geo-server"
import {
  CONFIG_ENT_PADRAO,
  type CalculoFrete, type CidadeOpcao, type EntConfig, type EntEntrega, type EntMotorista, type EntPainel, type EntTransportadora,
  type EntVeiculo, type EntViagem, type EntregaDoLead, type StatusViagem, type VeiculoFrete,
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

const MSG_SEM_TABELAS =
  "As tabelas de entregas ainda não estão atualizadas neste banco. Rode as migrações 20261117000000_entregas.sql e 20261118000000_entregas_v2.sql."

function msgErro(m: string) {
  return /ent_|column|schema cache/i.test(m) && /exist|find|column/i.test(m) ? MSG_SEM_TABELAS : m
}

function normalizarConfig(data: Record<string, unknown> | null | undefined): EntConfig {
  const c = { ...CONFIG_ENT_PADRAO, ...(data || {}) } as EntConfig
  // colunas NUMERIC chegam como texto
  return {
    ...c,
    origem_lat: Number(c.origem_lat), origem_lng: Number(c.origem_lng),
    frete_valor_km: Number(c.frete_valor_km) || 0, frete_valor_kg: Number(c.frete_valor_kg) || 0,
    frete_minimo: Number(c.frete_minimo) || 0, frete_desconto_viagem: Number(c.frete_desconto_viagem) || 0,
    frete_cobrar_volta: c.frete_cobrar_volta !== false,
  }
}

async function lerConfig(supabase: Supa): Promise<EntConfig> {
  const { data } = await supabase.from("ent_config").select("*").eq("id", 1).maybeSingle()
  return normalizarConfig(data)
}

// =====================================================================
// GEOGRAFIA: cidades, endereço → coordenadas, distâncias
// =====================================================================

/** Cidades de um estado (para a busca de cidade) */
export async function listarCidades(uf: string): Promise<CidadeOpcao[]> {
  if (!/^[A-Za-z]{2}$/.test(uf || "")) return []
  return cidadesDaUf(uf)
}

async function buscarCoordenadas(consulta: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(consulta)}`
    const r = await fetch(url, {
      headers: { "User-Agent": "ArcoForte-Orcamento/1.0 (sistema interno de entregas)", "Accept-Language": "pt-BR" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    })
    if (!r.ok) return null
    const j = (await r.json()) as { lat: string; lon: string }[]
    if (!j?.length) return null
    return { lat: Number(j[0].lat), lng: Number(j[0].lon) }
  } catch {
    return null
  }
}

/** Endereço exato (OpenStreetMap); se não achar, usa a coordenada da cidade. */
export async function geocodificar(endereco: string | null, cidade: string | null, uf: string | null) {
  const cid = acharCidade(cidade, uf)
  if (endereco && (cid || cidade)) {
    const r = await buscarCoordenadas(`${endereco}, ${cid?.nome || cidade}, ${uf || ""}, Brasil`)
    if (r && (!cid || Math.abs(r.lat - cid.lat) + Math.abs(r.lng - cid.lng) < 1.5)) return { ...r, precisao: "endereco" as const }
  }
  if (cid) return { lat: cid.lat, lng: cid.lng, precisao: "cidade" as const }
  if (cidade && uf) {
    const r = await buscarCoordenadas(`${cidade}, ${uf}, Brasil`)
    if (r) return { ...r, precisao: "cidade" as const }
  }
  return null
}

/** Distância por estrada da cidade de origem (ex.: Anápolis) até um ponto */
export async function distanciaDaOrigem(lat: number, lng: number) {
  const { supabase } = await sessao()
  const cfg = await lerConfig(supabase)
  const r = await rotaPorEstrada([{ lat: cfg.origem_lat, lng: cfg.origem_lng }, { lat, lng }])
  return r ? { km: r.km, minutos: r.minutos, estimada: r.estimada, origem: `${cfg.origem_nome} - ${cfg.origem_uf}` } : null
}

/** Recalcula a rota da viagem: origem → entregas na ordem → volta à origem */
async function recalcularRota(supabase: Supa, viagemId: string | null | undefined) {
  if (!viagemId) return
  const cfg = await lerConfig(supabase)
  const { data: paradas } = await supabase
    .from("ent_entregas").select("lat, lng")
    .eq("viagem_id", viagemId).neq("status", "cancelada").not("lat", "is", null)
    .order("ordem")
  const origem = { lat: cfg.origem_lat, lng: cfg.origem_lng }
  const pts = (paradas || []).map(p => ({ lat: Number(p.lat), lng: Number(p.lng) }))
  if (!pts.length) {
    await supabase.from("ent_viagens").update({ distancia_ida_km: null, distancia_total_km: null, duracao_total_min: null, trechos: null, rota: null }).eq("id", viagemId)
    return
  }
  const r = await rotaPorEstrada([origem, ...pts, origem])
  if (!r) return
  const ida = Math.round(r.trechosKm.slice(0, -1).reduce((s, t) => s + t, 0) * 10) / 10
  await supabase.from("ent_viagens").update({
    distancia_ida_km: ida, distancia_total_km: r.km, duracao_total_min: r.minutos,
    trechos: r.trechosKm, rota: r.desenho,
  }).eq("id", viagemId)
}

export async function recalcularRotaViagem(viagemId: string): Promise<Resultado> {
  const { supabase, erro } = await exigirGerente()
  if (erro) return { ok: false, erro }
  await recalcularRota(supabase, viagemId)
  revalidar(viagemId)
  return { ok: true }
}

// =====================================================================
// LEITURA
// =====================================================================

export async function obterPainel(): Promise<EntPainel> {
  const { supabase, user } = await sessao()
  const vazio: EntPainel = {
    transportadoras: [], veiculos: [], motoristas: [], viagens: [], entregas: [], usuarios: [],
    config: CONFIG_ENT_PADRAO, podeGerenciar: false, userId: "",
  }
  if (!user) return { ...vazio, erro: "Não autenticado" }

  const [tr, ve, mo, vi, en, us, cfg] = await Promise.all([
    supabase.from("ent_transportadoras").select("*").order("nome"),
    supabase.from("ent_veiculos").select("*").order("placa"),
    supabase.from("ent_motoristas").select("*").order("nome"),
    supabase.from("ent_viagens").select("*").order("saida_prevista", { ascending: false }),
    supabase.from("ent_entregas").select("*").order("chegada_prevista", { nullsFirst: false }).order("ordem"),
    supabase.from("usuarios").select("id, nome").order("nome"),
    supabase.from("ent_config").select("*").eq("id", 1).maybeSingle(),
  ])
  const erro = tr.error || vi.error || en.error
  if (erro) {
    return { ...vazio, userId: user.id, podeGerenciar: podeGerenciar(user), erro: msgErro(erro.message) }
  }
  return {
    transportadoras: (tr.data || []) as EntTransportadora[],
    veiculos: (ve.data || []) as EntVeiculo[],
    motoristas: (mo.data || []) as EntMotorista[],
    viagens: (vi.data || []) as EntViagem[],
    entregas: ((en.data || []) as EntEntrega[]).map(e => ({ ...e, distancia_estimada: !!e.distancia_estimada })),
    usuarios: us.data || [],
    config: normalizarConfig(cfg.data),
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

/** Próximas viagens que passam por um estado (para o vendedor aproveitar o frete) */
export async function proximasViagensPorUf(uf: string | null | undefined) {
  if (!uf) return []
  const { supabase, user } = await sessao()
  if (!user) return []
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date())
  const { data: viagens, error } = await supabase
    .from("ent_viagens").select("id, titulo, saida_prevista, status, veiculo_id")
    .in("status", ["planejada", "em_rota"]).gte("saida_prevista", hoje).order("saida_prevista").limit(20)
  if (error || !viagens?.length) return []
  const { data: paradas } = await supabase
    .from("ent_entregas").select("viagem_id, cidade, uf").in("viagem_id", viagens.map(v => v.id)).neq("status", "cancelada")
  const u = uf.toUpperCase()
  return viagens
    .map(v => ({ ...v, cidades: [...new Set((paradas || []).filter(p => p.viagem_id === v.id && p.uf === u).map(p => p.cidade).filter(Boolean))] as string[] }))
    .filter(v => v.cidades.length)
    .slice(0, 3)
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
  const uf = lead.uf || (ufCli && ufCli.length === 2 ? ufCli.toUpperCase() : null)
  const cidade = acharCidade(lead.cidade || cidCli, uf)
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
      cidade: cidade?.nome || lead.cidade || cidCli || null,
      uf,
      cidade_ibge: cidade?.ibge ?? null,
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

  // Cidade da lista do IBGE (garante nome certo e coordenada)
  const cid = cidadePorIbge(e.cidade_ibge) || acharCidade(campos.cidade as string | null, campos.uf as string | null)
  if (cid) {
    campos.cidade = cid.nome
    campos.uf = cid.uf
    campos.cidade_ibge = cid.ibge
  } else if ("cidade" in e) {
    campos.cidade_ibge = null
  }

  // Local: o marcado no mapa; senão endereço exato; senão o centro da cidade
  let aviso: string | undefined
  if (e.lat != null && e.lng != null && !e.localizar) {
    campos.lat = e.lat
    campos.lng = e.lng
  } else if (campos.endereco || campos.cidade) {
    const g = await geocodificar(campos.endereco as string | null, campos.cidade as string | null, campos.uf as string | null)
    if (g) {
      campos.lat = g.lat
      campos.lng = g.lng
      if (g.precisao === "cidade" && campos.endereco) aviso = "Endereço exato não encontrado: o ponto ficou no centro da cidade. Ajuste no mapa se quiser."
    } else {
      campos.lat = null
      campos.lng = null
      aviso = "Não achei esse local no mapa. A entrega foi salva sem ponto no mapa — escolha a cidade da lista."
    }
  }

  // Distância por estrada desde a origem
  if (campos.lat != null && campos.lng != null) {
    const cfg = await lerConfig(supabase)
    const r = await rotaPorEstrada([{ lat: cfg.origem_lat, lng: cfg.origem_lng }, { lat: Number(campos.lat), lng: Number(campos.lng) }])
    campos.distancia_km = r?.km ?? null
    campos.distancia_estimada = r?.estimada ?? false
  } else if ("lat" in campos) {
    campos.distancia_km = null
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

  // viagem anterior (para recalcular a rota de onde a entrega saiu)
  let viagemAnterior: string | null = null
  if (e.id) {
    const { data: atual } = await supabase.from("ent_entregas").select("viagem_id").eq("id", e.id).maybeSingle()
    viagemAnterior = atual?.viagem_id ?? null
  }
  if (campos.viagem_id && campos.viagem_id !== viagemAnterior) {
    const { data: ult } = await supabase.from("ent_entregas").select("ordem").eq("viagem_id", campos.viagem_id).order("ordem", { ascending: false }).limit(1).maybeSingle()
    campos.ordem = (ult?.ordem ?? -1) + 1
  }

  campos.atualizado_em = new Date().toISOString()
  const r = e.id
    ? await supabase.from("ent_entregas").update(campos).eq("id", e.id).select("id, viagem_id")
    : await supabase.from("ent_entregas").insert({ ...campos, solicitado_por: user.id }).select("id, viagem_id")
  if (r.error) return { ok: false, erro: msgErro(r.error.message) }
  if (!r.data?.length) return { ok: false, erro: "Sem permissão para alterar esta entrega." }

  // registra no histórico do lead
  if (!e.id && campos.lead_id) {
    await supabase.from("crm_lead_atividades").insert({
      lead_id: campos.lead_id, tipo: "sistema",
      descricao: gerente && campos.viagem_id ? "Entrega programada" : "Entrega solicitada para a logística",
    })
    revalidatePath(`/crm/lead/${campos.lead_id}`)
  }
  if (gerente) {
    await recalcularRota(supabase, r.data[0].viagem_id)
    if (viagemAnterior && viagemAnterior !== r.data[0].viagem_id) await recalcularRota(supabase, viagemAnterior)
  }
  revalidar(r.data[0].viagem_id)
  if (viagemAnterior) revalidar(viagemAnterior)
  return { ok: true, dados: { id: r.data[0].id, aviso } }
}

export async function excluirEntrega(id: string): Promise<Resultado> {
  const { supabase, erro } = await exigirGerente()
  if (erro) return { ok: false, erro }
  const { data: atual } = await supabase.from("ent_entregas").select("viagem_id").eq("id", id).maybeSingle()
  const { error } = await supabase.from("ent_entregas").delete().eq("id", id)
  if (error) return { ok: false, erro: error.message }
  await recalcularRota(supabase, atual?.viagem_id)
  revalidar(atual?.viagem_id)
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
      supabase.from("ent_viagens").select("status").eq("id", viagemId).maybeSingle(),
    ])
    ordem = (ult?.ordem ?? -1) + 1
    status = vg?.status === "em_rota" ? "em_rota" : "programada"
  }
  const { data: atual } = await supabase.from("ent_entregas").select("viagem_id").eq("id", id).maybeSingle()
  const { error } = await supabase.from("ent_entregas")
    .update({ viagem_id: viagemId, ordem, status, atualizado_em: new Date().toISOString() }).eq("id", id)
  if (error) return { ok: false, erro: error.message }
  await recalcularRota(supabase, viagemId)
  if (atual?.viagem_id && atual.viagem_id !== viagemId) await recalcularRota(supabase, atual.viagem_id)
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
  await recalcularRota(supabase, viagemId)
  revalidar(viagemId)
  return { ok: true }
}

/** Ordena as paradas pela mais próxima (começa na origem e vai sempre para a mais perto) */
export async function ordenarPorProximidade(viagemId: string): Promise<Resultado> {
  const { supabase, erro } = await exigirGerente()
  if (erro) return { ok: false, erro }
  const cfg = await lerConfig(supabase)
  const { data } = await supabase.from("ent_entregas").select("id, lat, lng, ordem").eq("viagem_id", viagemId).neq("status", "cancelada").order("ordem")
  const com = (data || []).filter(p => p.lat != null)
  const sem = (data || []).filter(p => p.lat == null)
  const ordenadas: string[] = []
  let atual = { lat: cfg.origem_lat, lng: cfg.origem_lng }
  const restantes = [...com]
  while (restantes.length) {
    let melhor = 0
    let menor = Infinity
    restantes.forEach((p, i) => {
      const d = (Number(p.lat) - atual.lat) ** 2 + (Number(p.lng) - atual.lng) ** 2
      if (d < menor) { menor = d; melhor = i }
    })
    const [p] = restantes.splice(melhor, 1)
    ordenadas.push(p.id)
    atual = { lat: Number(p.lat), lng: Number(p.lng) }
  }
  return reordenarEntregas(viagemId, [...ordenadas, ...sem.map(s => s.id)])
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
  await recalcularRota(supabase, data?.[0]?.viagem_id)
  revalidar(data?.[0]?.viagem_id)
  return { ok: true }
}

// =====================================================================
// VIAGENS
// =====================================================================

/**
 * Cria/edita a viagem. Se vier `entregas`, essa passa a ser a lista de entregas da viagem
 * (as que saírem e ainda não foram entregues voltam para "a programar").
 */
export async function salvarViagem(
  v: Partial<EntViagem> & { saida_prevista: string; entregas?: string[] }
): Promise<Resultado<{ id: string }>> {
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
    ? await supabase.from("ent_viagens").update(campos).eq("id", v.id).select("id, status")
    : await supabase.from("ent_viagens").insert(campos).select("id, status")
  if (r.error) return { ok: false, erro: msgErro(r.error.message) }
  const id = r.data![0].id as string
  const statusParada = r.data![0].status === "em_rota" ? "em_rota" : "programada"

  if (v.entregas) {
    const { data: atuais } = await supabase.from("ent_entregas").select("id, status, ordem").eq("viagem_id", id)
    const ficam = new Set(v.entregas)
    // saem da viagem (as já entregues ficam)
    const saem = (atuais || []).filter(a => !ficam.has(a.id) && a.status !== "entregue").map(a => a.id)
    if (saem.length) {
      await supabase.from("ent_entregas").update({ viagem_id: null, status: "a_programar" }).in("id", saem)
    }
    // entram na viagem, mantendo a ordem escolhida
    const jaNaViagem = new Set((atuais || []).map(a => a.id))
    let ordem = Math.max(-1, ...(atuais || []).filter(a => ficam.has(a.id)).map(a => a.ordem)) + 1
    for (const eid of v.entregas) {
      if (jaNaViagem.has(eid)) continue
      await supabase.from("ent_entregas").update({ viagem_id: id, status: statusParada, ordem: ordem++, atualizado_em: new Date().toISOString() })
        .eq("id", eid).in("status", ["a_programar", "programada", "em_rota"])
    }
  }
  await recalcularRota(supabase, id)
  revalidar(id)
  return { ok: true, dados: { id } }
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
    await recalcularRota(supabase, id)
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
// CADASTROS E CONFIGURAÇÃO
// =====================================================================

async function salvarCadastro(
  supabase: Supa, tabela: string, id: string | undefined, campos: Record<string, unknown>
): Promise<Resultado<{ id: string }>> {
  const r = id
    ? await supabase.from(tabela).update(campos).eq("id", id).select("id")
    : await supabase.from(tabela).insert(campos).select("id")
  if (r.error) return { ok: false, erro: msgErro(r.error.message) }
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
    // frete próprio do veículo (vazio = tabela geral)
    frete_valor_km: numero(v.frete_valor_km), frete_valor_kg: numero(v.frete_valor_kg), frete_minimo: numero(v.frete_minimo),
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

/** Cidade de onde os caminhões saem (as distâncias são calculadas a partir dela) */
export async function salvarOrigem(ibge: number): Promise<Resultado> {
  const { supabase, erro } = await exigirGerente()
  if (erro) return { ok: false, erro }
  const c = cidadePorIbge(ibge)
  if (!c) return { ok: false, erro: "Cidade não encontrada." }
  const { error } = await supabase.from("ent_config").upsert({
    id: 1, origem_nome: c.nome, origem_uf: c.uf, origem_ibge: c.ibge, origem_lat: c.lat, origem_lng: c.lng,
    atualizado_em: new Date().toISOString(),
  })
  if (error) return { ok: false, erro: msgErro(error.message) }
  revalidar()
  return { ok: true }
}

// =====================================================================
// FRETE (cálculo no CRM e no orçamento)
// =====================================================================

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

/** Peso da carga de um orçamento = soma(quantidade × peso do produto) */
export async function pesoDoOrcamento(orcamentoId: string): Promise<number> {
  const { supabase } = await sessao()
  const { data: itens } = await supabase.from("orcamento_itens").select("quantidade, produtos(peso_bruto_kg)").eq("orcamento_id", orcamentoId)
  const total = (itens || []).reduce((s: number, i: Record<string, any>) => s + (Number(i.quantidade) || 0) * (Number(i.produtos?.peso_bruto_kg) || 0), 0)
  return Math.round(total * 100) / 100
}

/**
 * Calcula o frete da origem (ex.: Anápolis) até a cidade:
 * km cobrados (ida, ou ida e volta) × R$/km + peso × R$/kg, menos o desconto se aproveitar viagem,
 * nunca abaixo do mínimo.
 */
/** Veículos ativos para escolher na calculadora de frete */
export async function listarVeiculosFrete(): Promise<VeiculoFrete[]> {
  const { supabase, user } = await sessao()
  if (!user) return []
  const { data } = await supabase.from("ent_veiculos").select("*").eq("ativo", true).order("capacidade_kg", { nullsFirst: false })
  return (data || []).map((v: Record<string, any>) => ({
    id: v.id, placa: v.placa, descricao: v.descricao, proprio: v.proprio !== false,
    capacidade_kg: v.capacidade_kg != null ? Number(v.capacidade_kg) : null,
    frete_valor_km: v.frete_valor_km != null ? Number(v.frete_valor_km) : null,
    frete_valor_kg: v.frete_valor_kg != null ? Number(v.frete_valor_kg) : null,
    frete_minimo: v.frete_minimo != null ? Number(v.frete_minimo) : null,
  }))
}

export async function calcularFrete(p: {
  uf: string | null; cidade: string | null; cidade_ibge?: number | null; pesoKg?: number | null; aproveitarViagem?: boolean
  veiculoId?: string | null
}): Promise<Resultado<CalculoFrete>> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }
  const cid = cidadePorIbge(p.cidade_ibge) || acharCidade(p.cidade, p.uf)
  if (!cid) return { ok: false, erro: "Escolha o estado e a cidade de destino." }
  const cfg = await lerConfig(supabase)

  // tarifa: a do veículo escolhido; o que estiver vazio vem da tabela geral
  let veiculo: CalculoFrete["veiculo"] = null
  let tarifaKm = cfg.frete_valor_km, tarifaKg = cfg.frete_valor_kg, minimo = cfg.frete_minimo
  if (p.veiculoId) {
    const { data: v } = await supabase.from("ent_veiculos").select("*").eq("id", p.veiculoId).maybeSingle()
    if (v) {
      const proprioKm = v.frete_valor_km != null, proprioKg = v.frete_valor_kg != null, proprioMin = v.frete_minimo != null
      if (proprioKm) tarifaKm = Number(v.frete_valor_km)
      if (proprioKg) tarifaKg = Number(v.frete_valor_kg)
      if (proprioMin) minimo = Number(v.frete_minimo)
      veiculo = {
        id: v.id, nome: v.descricao ? `${v.descricao} (${v.placa})` : v.placa,
        capacidade_kg: v.capacidade_kg != null ? Number(v.capacidade_kg) : null,
        valorProprio: proprioKm || proprioKg || proprioMin,
      }
    }
  }

  const rota = await rotaPorEstrada([{ lat: cfg.origem_lat, lng: cfg.origem_lng }, { lat: cid.lat, lng: cid.lng }])
  if (!rota) return { ok: false, erro: "Não consegui calcular a distância." }

  const kmIda = rota.km
  const kmCobrados = Math.round(kmIda * (cfg.frete_cobrar_volta ? 2 : 1) * 10) / 10
  const pesoKg = Math.max(0, Number(p.pesoKg) || 0)
  const valorKm = kmCobrados * tarifaKm
  const valorPeso = pesoKg * tarifaKg
  const bruto = valorKm + valorPeso
  const desconto = p.aproveitarViagem ? bruto * (cfg.frete_desconto_viagem / 100) : 0
  let valor = bruto - desconto
  const minimoAplicado = minimo > 0 && valor < minimo
  if (minimoAplicado) valor = minimo
  valor = Math.round(valor * 100) / 100

  const origem = `${cfg.origem_nome}-${cfg.origem_uf}`
  const destino = `${cid.nome}-${cid.uf}`
  const descricao = [
    `Frete CIF ArcoForte: ${origem} → ${destino} (~${Math.round(kmIda).toLocaleString("pt-BR")} km)`,
    veiculo ? `veículo: ${veiculo.nome}` : "",
    p.aproveitarViagem ? "aproveitando viagem programada" : "",
    cfg.frete_observacao || "",
  ].filter(Boolean).join(" · ")

  return {
    ok: true,
    dados: {
      origem, destino, kmIda, kmCobrados, minutos: rota.minutos, estimada: rota.estimada, pesoKg,
      valorKm: Math.round(valorKm * 100) / 100, valorPeso: Math.round(valorPeso * 100) / 100,
      desconto: Math.round(desconto * 100) / 100, minimoAplicado, valor, descricao,
      tabela: {
        frete_valor_km: tarifaKm, frete_cobrar_volta: cfg.frete_cobrar_volta, frete_valor_kg: tarifaKg,
        frete_minimo: minimo, frete_desconto_viagem: cfg.frete_desconto_viagem,
      },
      veiculo,
      acimaCapacidade: !!veiculo?.capacidade_kg && pesoKg > veiculo.capacidade_kg,
    },
  }
}

/** Grava o frete no orçamento (entra no total e na proposta) */
export async function aplicarFreteNoOrcamento(orcamentoId: string, valor: number, descricao: string, leadId?: string | null): Promise<Resultado> {
  const { supabase, user } = await sessao()
  if (!user) return { ok: false, erro: "Não autenticado" }
  const v = Math.round((Number(valor) || 0) * 100) / 100
  if (v < 0) return { ok: false, erro: "Valor de frete inválido." }
  const { data, error } = await supabase.from("orcamentos")
    .update({ frete: v, tipo_frete: descricao?.trim() || null })
    .eq("id", orcamentoId).select("id, numero_pedido")
  if (error) return { ok: false, erro: error.message }
  if (!data?.length) return { ok: false, erro: "Sem permissão para alterar este orçamento (ele é de outro vendedor)." }
  if (leadId) {
    await supabase.from("crm_lead_atividades").insert({
      lead_id: leadId, tipo: "orcamento",
      descricao: `Frete ${brl.format(v)} aplicado no orçamento ${data[0].numero_pedido || "#" + String(orcamentoId).slice(0, 8).toUpperCase()}`,
    })
    revalidatePath(`/crm/lead/${leadId}`)
  }
  revalidatePath(`/orcamentos/${orcamentoId}`)
  return { ok: true }
}

/** Entregas ligadas a um lead, com viagem, caminhão e motorista */
export async function entregasDoLead(leadId: string): Promise<EntregaDoLead[]> {
  const { supabase, user } = await sessao()
  if (!user) return []
  const { data: entregas, error } = await supabase.from("ent_entregas").select("*").eq("lead_id", leadId).order("criado_em", { ascending: false })
  if (error || !entregas?.length) return []
  const ids = [...new Set(entregas.map(e => e.viagem_id).filter(Boolean))] as string[]
  const { data: viagens } = ids.length
    ? await supabase.from("ent_viagens").select("id, titulo, status, saida_prevista, retorno_previsto, ultima_posicao_em, veiculo_id, motorista_id").in("id", ids)
    : { data: [] as Record<string, any>[] }
  const veicIds = [...new Set((viagens || []).map(v => v.veiculo_id).filter(Boolean))] as string[]
  const motIds = [...new Set((viagens || []).map(v => v.motorista_id).filter(Boolean))] as string[]
  const [{ data: veics }, { data: mots }] = await Promise.all([
    veicIds.length ? supabase.from("ent_veiculos").select("id, placa").in("id", veicIds) : Promise.resolve({ data: [] as { id: string; placa: string }[] }),
    motIds.length ? supabase.from("ent_motoristas").select("id, nome").in("id", motIds) : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
  ])
  return (entregas as EntEntrega[]).map(e => {
    const v = (viagens || []).find(x => x.id === e.viagem_id)
    return {
      ...e,
      distancia_estimada: !!e.distancia_estimada,
      viagem: v ? { id: v.id, titulo: v.titulo, status: v.status, saida_prevista: v.saida_prevista, retorno_previsto: v.retorno_previsto, ultima_posicao_em: v.ultima_posicao_em } : null,
      veiculo: (veics || []).find(x => x.id === v?.veiculo_id)?.placa || null,
      motorista: (mots || []).find(x => x.id === v?.motorista_id)?.nome || null,
    }
  })
}

export async function salvarTabelaFrete(t: Pick<EntConfig, "frete_valor_km" | "frete_cobrar_volta" | "frete_valor_kg" | "frete_minimo" | "frete_desconto_viagem" | "frete_observacao">): Promise<Resultado> {
  const { supabase, erro } = await exigirGerente()
  if (erro) return { ok: false, erro }
  const { error } = await supabase.from("ent_config").upsert({
    id: 1,
    frete_valor_km: Math.max(0, numero(t.frete_valor_km) ?? 0),
    frete_cobrar_volta: !!t.frete_cobrar_volta,
    frete_valor_kg: Math.max(0, numero(t.frete_valor_kg) ?? 0),
    frete_minimo: Math.max(0, numero(t.frete_minimo) ?? 0),
    frete_desconto_viagem: Math.min(100, Math.max(0, numero(t.frete_desconto_viagem) ?? 0)),
    frete_observacao: texto(t.frete_observacao),
    atualizado_em: new Date().toISOString(),
  })
  if (error) return { ok: false, erro: /frete_/.test(error.message) ? "Rode a migração 20261119000000_entregas_frete.sql para salvar a tabela de frete." : msgErro(error.message) }
  revalidar()
  return { ok: true }
}
