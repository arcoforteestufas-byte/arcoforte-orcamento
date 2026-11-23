"use server"

// Separação e conferência da carga no galpão.
// Fluxo: a separar → separando → aguardando conferência → conferindo → conferida.
// Quem confere não pode ser quem separou. Falta de produto é registrada com motivo.

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import {
  chavesDosItens, type EntItemCarga, type EntregaExpedicao, type SepItem, type Separacao,
} from "@/lib/entregas-types"

type Resultado<T = undefined> = { ok: true; dados?: T } | { ok: false; erro: string }

const SQL_FALTANDO = "Rode a migração 20261130000000_entregas_separacao.sql no Supabase para usar a separação."

function podeSeparar(cargo: unknown) {
  return cargo === "Administrador" || cargo === "Logística" || cargo === "Expedição"
}

async function sessao() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, nome: "", gerente: false, erro: "Faça login novamente." }
  const cargo = user.user_metadata?.cargo
  const nome = String(user.user_metadata?.nome || user.email?.split("@")[0] || "Usuário")
  const gerente = cargo === "Administrador" || cargo === "Logística"
  if (!podeSeparar(cargo)) return { supabase, user, nome, gerente, erro: "Somente Expedição, Logística ou Administrador pode separar e conferir." }
  return { supabase, user, nome, gerente, erro: null as string | null }
}

function erroTabela(m: string) {
  return /ent_separacoes|ent_pode_separar/.test(m) ? SQL_FALTANDO : m
}

function revalidar(id?: string) {
  revalidatePath("/expedicao")
  revalidatePath("/entregas")
  if (id) revalidatePath(`/expedicao/${id}`)
}

const CAMPOS_ENTREGA = "id, destinatario, cidade, uf, status, chegada_prevista, pedido_erp, descricao_carga, observacoes, peso_kg, itens, lead_id, viagem_id"

type LinhaEntrega = {
  id: string; destinatario: string; cidade: string | null; uf: string | null; status: EntregaExpedicao["status"]
  chegada_prevista: string | null; pedido_erp: string | null; descricao_carga: string | null; observacoes: string | null
  peso_kg: number | null; itens: EntItemCarga[] | null; lead_id: string | null; viagem_id: string | null
}

/** Fila do galpão: entregas ainda não saídas que têm produtos importados */
export async function filaExpedicao(ids?: string[]): Promise<{ entregas: EntregaExpedicao[]; erro?: string }> {
  const { supabase, erro } = await sessao()
  if (erro) return { entregas: [], erro }
  let qEnt = supabase.from("ent_entregas").select(CAMPOS_ENTREGA).in("status", ["a_programar", "programada", "em_rota"])
  let qSep = supabase.from("ent_separacoes").select("*")
  if (ids) {
    if (!ids.length) return { entregas: [] }
    qEnt = qEnt.in("id", ids.slice(0, 50))
    qSep = qSep.in("entrega_id", ids.slice(0, 50))
  }
  const [en, sep] = await Promise.all([qEnt.limit(500), qSep])
  if (en.error) return { entregas: [], erro: en.error.message }
  if (sep.error) return { entregas: [], erro: erroTabela(sep.error.message) }
  const linhas = ((en.data || []) as LinhaEntrega[]).filter(e => (e.itens || []).length)
  const idsViagem = Array.from(new Set(linhas.map(e => e.viagem_id).filter(Boolean))) as string[]
  const vi = idsViagem.length
    ? await supabase.from("ent_viagens").select("id, titulo, saida_prevista, status").in("id", idsViagem)
    : { data: [] as EntregaExpedicao["viagem"][] }
  const viagens = new Map((vi.data || []).map(v => [v!.id, v!]))
  const seps = new Map(((sep.data || []) as Separacao[]).map(s => [s.entrega_id, s]))

  const entregas: EntregaExpedicao[] = linhas
    // em rota só aparece se saiu sem conferir (para registro)
    .filter(e => e.status !== "em_rota" || seps.get(e.id)?.status !== "conferida")
    .map(e => ({
      id: e.id, destinatario: e.destinatario, cidade: e.cidade, uf: e.uf, status: e.status,
      chegada_prevista: e.chegada_prevista, pedido_erp: e.pedido_erp, descricao_carga: e.descricao_carga,
      observacoes: e.observacoes, peso_kg: e.peso_kg, itens: e.itens || [],
      viagem: e.viagem_id ? viagens.get(e.viagem_id) || null : null,
      separacao: seps.get(e.id) || null,
    }))
  // primeiro o que sai antes
  const quando = (e: EntregaExpedicao) => e.viagem?.saida_prevista || e.chegada_prevista || "9999"
  entregas.sort((a, b) => quando(a).localeCompare(quando(b)))
  return { entregas }
}

export type TelaSeparacao = { entrega: EntregaExpedicao; userId: string; gerente: boolean }

export async function obterSeparacao(id: string): Promise<{ dados?: TelaSeparacao; erro?: string }> {
  const { supabase, user, gerente, erro } = await sessao()
  if (erro || !user) return { erro: erro || "Faça login novamente." }
  const { data: e, error } = await supabase.from("ent_entregas").select(CAMPOS_ENTREGA).eq("id", id).maybeSingle()
  if (error) return { erro: error.message }
  if (!e) return { erro: "Entrega não encontrada." }
  const l = e as LinhaEntrega
  const [sep, vi] = await Promise.all([
    supabase.from("ent_separacoes").select("*").eq("entrega_id", id).maybeSingle(),
    l.viagem_id ? supabase.from("ent_viagens").select("id, titulo, saida_prevista, status").eq("id", l.viagem_id).maybeSingle() : Promise.resolve({ data: null }),
  ])
  if (sep.error) return { erro: erroTabela(sep.error.message) }
  return {
    dados: {
      userId: user.id, gerente,
      entrega: {
        id: l.id, destinatario: l.destinatario, cidade: l.cidade, uf: l.uf, status: l.status,
        chegada_prevista: l.chegada_prevista, pedido_erp: l.pedido_erp, descricao_carga: l.descricao_carga,
        observacoes: l.observacoes, peso_kg: l.peso_kg, itens: l.itens || [],
        viagem: (vi.data as EntregaExpedicao["viagem"]) || null,
        separacao: (sep.data as Separacao) || null,
      },
    },
  }
}

async function carregar(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const [{ data: e }, { data: s, error }] = await Promise.all([
    supabase.from("ent_entregas").select("itens, lead_id, status").eq("id", id).maybeSingle(),
    supabase.from("ent_separacoes").select("*").eq("entrega_id", id).maybeSingle(),
  ])
  return { itens: ((e?.itens || []) as EntItemCarga[]), leadId: (e?.lead_id as string | null) || null, statusEntrega: e?.status as string | undefined, sep: s as Separacao | null, erro: error ? erroTabela(error.message) : null }
}

/** Começa a separar (cria o registro) */
export async function iniciarSeparacao(id: string): Promise<Resultado> {
  const { supabase, user, nome, erro } = await sessao()
  if (erro || !user) return { ok: false, erro: erro || "" }
  const c = await carregar(supabase, id)
  if (c.erro) return { ok: false, erro: c.erro }
  if (!c.itens.length) return { ok: false, erro: "Esta entrega não tem produtos. Importe o pedido do Sensio na entrega." }
  if (c.statusEntrega === "entregue" || c.statusEntrega === "cancelada") return { ok: false, erro: "Esta entrega já foi encerrada." }
  if (c.sep) return { ok: true }
  const { error } = await supabase.from("ent_separacoes").insert({
    entrega_id: id, status: "separando", itens: [], separado_por: user.id, separado_por_nome: nome,
  })
  if (error) return { ok: false, erro: erroTabela(error.message) }
  revalidar(id)
  return { ok: true }
}

function numeroOk(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 1000) / 1000 : null
}

/** Marca um produto: na separação (quantidade separada + motivo) ou na conferência (quantidade conferida) */
export async function marcarItem(id: string, chave: string, campos: { separada?: number | null; motivo?: string | null; conferida?: number | null }): Promise<Resultado<SepItem[]>> {
  const { supabase, user, nome, erro } = await sessao()
  if (erro || !user) return { ok: false, erro: erro || "" }
  const c = await carregar(supabase, id)
  if (c.erro) return { ok: false, erro: c.erro }
  if (!c.sep) return { ok: false, erro: "A separação desta entrega ainda não começou." }
  if (!chavesDosItens(c.itens).includes(chave)) return { ok: false, erro: "Este produto não está mais na entrega. Atualize a página." }

  const atual = c.sep.itens.find(i => i.chave === chave) || { chave, separada: null, motivo: null, conferida: null }
  const novo: SepItem = { ...atual }
  const upd: Record<string, unknown> = { atualizado_em: new Date().toISOString() }
  if (c.sep.status === "separando") {
    if ("separada" in campos) novo.separada = numeroOk(campos.separada)
    if ("motivo" in campos) novo.motivo = String(campos.motivo || "").trim().slice(0, 200) || null
    // quem está separando agora passa a ser o separador
    upd.separado_por = user.id
    upd.separado_por_nome = nome
  } else if (c.sep.status === "conferindo") {
    if (c.sep.conferido_por !== user.id) return { ok: false, erro: `Quem está conferindo é ${c.sep.conferido_por_nome || "outra pessoa"}.` }
    if ("conferida" in campos) novo.conferida = numeroOk(campos.conferida)
  } else {
    return { ok: false, erro: c.sep.status === "separada" ? "A separação já foi finalizada. Comece a conferência." : "Esta carga já foi conferida." }
  }
  const itens = [...c.sep.itens.filter(i => i.chave !== chave), novo]
  upd.itens = itens
  const { error } = await supabase.from("ent_separacoes").update(upd).eq("entrega_id", id).eq("status", c.sep.status)
  if (error) return { ok: false, erro: erroTabela(error.message) }
  return { ok: true, dados: itens }
}

/** Termina a separação: todos os produtos marcados; o que faltou precisa de motivo */
export async function finalizarSeparacao(id: string, obs: string): Promise<Resultado> {
  const { supabase, user, nome, erro } = await sessao()
  if (erro || !user) return { ok: false, erro: erro || "" }
  const c = await carregar(supabase, id)
  if (c.erro) return { ok: false, erro: c.erro }
  if (c.sep?.status !== "separando") return { ok: false, erro: "Esta entrega não está em separação." }
  const chaves = chavesDosItens(c.itens)
  const porChave = new Map(c.sep.itens.map(i => [i.chave, i]))
  let divergencia = false
  for (let k = 0; k < chaves.length; k++) {
    const s = porChave.get(chaves[k])
    const item = c.itens[k]
    if (!s || s.separada === null) return { ok: false, erro: `Falta marcar: ${item.descricao}` }
    if (s.separada !== Number(item.quantidade)) {
      divergencia = true
      if (!s.motivo) return { ok: false, erro: `Informe o motivo da diferença em: ${item.descricao}` }
    }
  }
  const { error } = await supabase.from("ent_separacoes").update({
    status: "separada", divergencia, obs: obs.trim().slice(0, 500) || null,
    separado_por: user.id, separado_por_nome: nome, separado_em: new Date().toISOString(), atualizado_em: new Date().toISOString(),
    // só os produtos que ainda estão na entrega
    itens: chaves.map(k => porChave.get(k)!),
  }).eq("entrega_id", id).eq("status", "separando")
  if (error) return { ok: false, erro: erroTabela(error.message) }
  revalidar(id)
  return { ok: true }
}

/** Começa a conferência (precisa ser outra pessoa) */
export async function iniciarConferencia(id: string): Promise<Resultado> {
  const { supabase, user, nome, erro } = await sessao()
  if (erro || !user) return { ok: false, erro: erro || "" }
  const c = await carregar(supabase, id)
  if (c.erro) return { ok: false, erro: c.erro }
  if (c.sep?.status === "conferindo" && c.sep.conferido_por === user.id) return { ok: true }
  if (c.sep?.status !== "separada") return { ok: false, erro: "A separação ainda não foi finalizada." }
  if (c.sep.separado_por === user.id) return { ok: false, erro: "Você separou esta carga. A conferência precisa ser feita por outra pessoa." }
  const { error } = await supabase.from("ent_separacoes").update({
    status: "conferindo", conferido_por: user.id, conferido_por_nome: nome, atualizado_em: new Date().toISOString(),
    itens: c.sep.itens.map(i => ({ ...i, conferida: null })),
  }).eq("entrega_id", id).eq("status", "separada")
  if (error) return { ok: false, erro: erroTabela(error.message) }
  revalidar(id)
  return { ok: true }
}

/** Termina a conferência: o conferido precisa bater com o separado */
export async function finalizarConferencia(id: string): Promise<Resultado> {
  const { supabase, user, erro } = await sessao()
  if (erro || !user) return { ok: false, erro: erro || "" }
  const c = await carregar(supabase, id)
  if (c.erro) return { ok: false, erro: c.erro }
  if (c.sep?.status !== "conferindo") return { ok: false, erro: "Esta entrega não está em conferência." }
  if (c.sep.conferido_por !== user.id) return { ok: false, erro: `Quem está conferindo é ${c.sep.conferido_por_nome || "outra pessoa"}.` }
  const chaves = chavesDosItens(c.itens)
  const porChave = new Map(c.sep.itens.map(i => [i.chave, i]))
  for (let k = 0; k < chaves.length; k++) {
    const s = porChave.get(chaves[k])
    const item = c.itens[k]
    if (!s || s.separada === null) return { ok: false, erro: `"${item.descricao}" não foi separado (o pedido mudou?). Devolva para a separação.` }
    if (s.conferida === null) return { ok: false, erro: `Falta conferir: ${item.descricao}` }
    if (s.conferida !== s.separada) return { ok: false, erro: `"${item.descricao}": conferido ${s.conferida}, separado ${s.separada}. Corrija ou devolva para a separação.` }
  }
  const agora = new Date().toISOString()
  const { error } = await supabase.from("ent_separacoes").update({ status: "conferida", conferido_em: agora, atualizado_em: agora })
    .eq("entrega_id", id).eq("status", "conferindo")
  if (error) return { ok: false, erro: erroTabela(error.message) }
  if (c.leadId) {
    await supabase.from("crm_lead_atividades").insert({
      lead_id: c.leadId, tipo: "sistema",
      descricao: `Carga separada por ${c.sep.separado_por_nome || "—"} e conferida por ${c.sep.conferido_por_nome || "—"}${c.sep.divergencia ? " (com falta registrada)" : ""}`,
    })
  }
  revalidar(id)
  return { ok: true }
}

/** Conferente achou diferença: volta para a separação com o motivo */
export async function devolverParaSeparacao(id: string, motivo: string): Promise<Resultado> {
  const { supabase, user, nome, gerente, erro } = await sessao()
  if (erro || !user) return { ok: false, erro: erro || "" }
  if (motivo.trim().length < 3) return { ok: false, erro: "Diga o que está errado." }
  const c = await carregar(supabase, id)
  if (c.erro) return { ok: false, erro: c.erro }
  if (!c.sep || !["separada", "conferindo"].includes(c.sep.status)) return { ok: false, erro: "Só dá para devolver uma carga separada ou em conferência." }
  if (c.sep.status === "conferindo" && c.sep.conferido_por !== user.id && !gerente) return { ok: false, erro: "Só quem está conferindo pode devolver." }
  const { error } = await supabase.from("ent_separacoes").update({
    status: "separando", separado_em: null, conferido_por: null, conferido_por_nome: null, conferido_em: null,
    itens: c.sep.itens.map(i => ({ ...i, conferida: null })),
    devolucoes: [...(c.sep.devolucoes || []), { em: new Date().toISOString(), por: nome, motivo: motivo.trim().slice(0, 300) }],
    atualizado_em: new Date().toISOString(),
  }).eq("entrega_id", id).eq("status", c.sep.status)
  if (error) return { ok: false, erro: erroTabela(error.message) }
  revalidar(id)
  return { ok: true }
}

/** Logística/Admin: apaga a separação e começa do zero (ex.: o pedido mudou depois de conferido) */
export async function reabrirSeparacao(id: string): Promise<Resultado> {
  const { supabase, gerente, erro } = await sessao()
  if (erro) return { ok: false, erro }
  if (!gerente) return { ok: false, erro: "Somente Logística ou Administrador pode refazer a separação." }
  const { error } = await supabase.from("ent_separacoes").delete().eq("entrega_id", id)
  if (error) return { ok: false, erro: erroTabela(error.message) }
  revalidar(id)
  return { ok: true }
}

// ---------------------------------------------------------------------
// Separação em lote: várias entregas separadas juntas (produtos somados)
// ---------------------------------------------------------------------

/** Começa a separação de várias entregas de uma vez */
export async function iniciarSeparacaoLote(ids: string[]): Promise<Resultado<{ erros: { id: string; erro: string }[] }>> {
  const erros: { id: string; erro: string }[] = []
  for (const id of ids.slice(0, 50)) {
    const r = await iniciarSeparacao(id)
    if (!r.ok) erros.push({ id, erro: r.erro })
  }
  return { ok: true, dados: { erros } }
}

/** Marca vários produtos (de várias entregas) numa vez só — uma gravação por entrega */
export async function marcarSeparacaoLote(marcas: { entregaId: string; chave: string; separada: number | null; motivo: string | null }[]): Promise<Resultado<Record<string, SepItem[]>>> {
  const { supabase, user, nome, erro } = await sessao()
  if (erro || !user) return { ok: false, erro: erro || "" }
  const porEntrega = new Map<string, typeof marcas>()
  for (const m of marcas.slice(0, 2000)) porEntrega.set(m.entregaId, [...(porEntrega.get(m.entregaId) || []), m])
  const resultado: Record<string, SepItem[]> = {}
  for (const [id, lista] of porEntrega) {
    const c = await carregar(supabase, id)
    if (c.erro) return { ok: false, erro: c.erro }
    if (c.sep?.status !== "separando") return { ok: false, erro: "Uma das entregas não está mais em separação. Atualize a página." }
    const validas = new Set(chavesDosItens(c.itens))
    const itens = new Map(c.sep.itens.map(i => [i.chave, i]))
    for (const m of lista) {
      if (!validas.has(m.chave)) return { ok: false, erro: "Os produtos de uma das entregas mudaram. Atualize a página." }
      const atual = itens.get(m.chave) || { chave: m.chave, separada: null, motivo: null, conferida: null }
      itens.set(m.chave, { ...atual, separada: numeroOk(m.separada), motivo: String(m.motivo || "").trim().slice(0, 200) || null })
    }
    const nova = Array.from(itens.values())
    const { error } = await supabase.from("ent_separacoes").update({
      itens: nova, separado_por: user.id, separado_por_nome: nome, atualizado_em: new Date().toISOString(),
    }).eq("entrega_id", id).eq("status", "separando")
    if (error) return { ok: false, erro: erroTabela(error.message) }
    resultado[id] = nova
  }
  return { ok: true, dados: resultado }
}

/** Finaliza a separação de várias entregas; devolve o que não deu para finalizar */
export async function finalizarSeparacaoLote(ids: string[], obs: string): Promise<Resultado<{ erros: { id: string; erro: string }[] }>> {
  const erros: { id: string; erro: string }[] = []
  for (const id of ids.slice(0, 50)) {
    const r = await finalizarSeparacao(id, obs)
    if (!r.ok) erros.push({ id, erro: r.erro })
  }
  revalidar()
  return { ok: true, dados: { erros } }
}
