"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient, createClient, obterUsuario } from "@/utils/supabase/server"
import type { PrazoAlteracao } from "@/lib/entregas-types"

const BUCKET = "contratos"
const MIGRACAO = "20261128000000_crm_v9_prazo_alteracoes.sql"

type Resultado = { ok: true } | { ok: false; erro: string }

const br = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—")
const hojeSP = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date())

async function exigirAdmin() {
  const supabase = await createClient()
  const user = await obterUsuario()
  if (!user) return { supabase, user: null, erro: "Faça login novamente." }
  if (user.user_metadata?.cargo !== "Administrador") {
    return { supabase, user: null, erro: "O prazo de entrega de uma venda fechada é contratual: só o administrador pode alterar." }
  }
  return { supabase, user, erro: null as string | null }
}

/**
 * Link para o navegador enviar o anexo direto ao armazenamento (sem passar pelo servidor,
 * que tem limite de 1 MB). O arquivo vai para o bucket privado "contratos".
 */
export async function linkEnvioAnexoPrazo(leadId: string, nomeArquivo: string): Promise<{ ok: true; caminho: string; token: string } | { ok: false; erro: string }> {
  const { supabase, user, erro } = await exigirAdmin()
  if (!user) return { ok: false, erro: erro! }
  const { data: lead } = await supabase.from("crm_leads").select("id").eq("id", leadId).maybeSingle()
  if (!lead) return { ok: false, erro: "Lead não encontrado." }
  const ext = (nomeArquivo.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin"
  const caminho = `prazos/${leadId}/${crypto.randomUUID()}.${ext}`
  const admin = await createAdminClient()
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(caminho)
  if (error || !data) {
    return { ok: false, erro: /bucket|not found/i.test(error?.message || "") ? `Para anexar arquivos, rode a migração ${MIGRACAO}.` : error?.message || "Falha ao preparar o envio." }
  }
  return { ok: true, caminho, token: data.token }
}

/**
 * Altera o prazo de entrega contratual de uma venda fechada.
 * Só o administrador. Motivo obrigatório; anexo opcional (print do "ok" do cliente, e-mail, aditivo).
 * Fica registrado em crm_prazo_alteracoes e no histórico do lead.
 */
export async function alterarPrazoContratual(dados: {
  leadId: string
  prazoNovo: string
  motivo: string
  pedidoPor: "cliente" | "empresa"
  anexoCaminho?: string | null
  anexoNome?: string | null
}): Promise<Resultado> {
  try {
    const { supabase, user, erro } = await exigirAdmin()
    if (!user) return { ok: false, erro: erro! }

    const { leadId, prazoNovo: novo } = dados
    const motivo = (dados.motivo || "").trim()
    const pedidoPor = dados.pedidoPor === "empresa" ? "empresa" : "cliente"
    const anexoCaminho = dados.anexoCaminho || null
    if (!/^\d{4}-\d{2}-\d{2}$/.test(novo || "")) return { ok: false, erro: "Informe a nova data de entrega." }
    if (novo < hojeSP()) return { ok: false, erro: "A nova data não pode ser no passado." }
    if (motivo.length < 5) return { ok: false, erro: "Escreva o motivo da mudança (fica registrado como prova)." }
    if (anexoCaminho && !anexoCaminho.startsWith(`prazos/${leadId}/`)) return { ok: false, erro: "Anexo inválido." }

    const { data: lead } = await supabase.from("crm_leads").select("id, status, prazo_entrega").eq("id", leadId).maybeSingle()
    if (!lead) return { ok: false, erro: "Lead não encontrado." }
    if (lead.status !== "ganho") return { ok: false, erro: "Este lead ainda não é venda fechada: altere o prazo nos dados do lead." }
    const anterior = (lead.prazo_entrega as string | null) ?? null
    if (anterior === novo) return { ok: false, erro: "A nova data é igual ao prazo atual." }

    // registro primeiro: sem registro (prova), o prazo não muda
    const { data: reg, error: errReg } = await supabase.from("crm_prazo_alteracoes").insert({
      lead_id: leadId, prazo_anterior: anterior, prazo_novo: novo, pedido_por: pedidoPor, motivo,
      anexo_caminho: anexoCaminho, anexo_nome: anexoCaminho ? (dados.anexoNome || "anexo").slice(0, 200) : null, criado_por: user.id,
    }).select("id").single()
    if (errReg || !reg) {
      return { ok: false, erro: /crm_prazo_alteracoes/.test(errReg?.message || "")
        ? `Rode a migração ${MIGRACAO} no Supabase para registrar mudanças de prazo.`
        : errReg?.message || "Falha ao registrar a mudança." }
    }

    const { error: errLead } = await supabase.from("crm_leads")
      .update({ prazo_entrega: novo, atualizado_em: new Date().toISOString() }).eq("id", leadId)
    if (errLead) {
      const admin = await createAdminClient()
      await admin.from("crm_prazo_alteracoes").delete().eq("id", reg.id) // desfaz o registro
      return { ok: false, erro: errLead.message }
    }

    await supabase.from("crm_lead_atividades").insert({
      lead_id: leadId, tipo: "sistema",
      descricao: `Prazo de entrega contratual alterado: ${br(anterior)} → ${br(novo)} · pedido ${pedidoPor === "cliente" ? "do cliente" : "da empresa"} · motivo: ${motivo}${anexoCaminho ? ` · com anexo` : ""}`,
    })
    // entrega ainda não programada que estava com o prazo antigo acompanha o novo
    if (anterior) {
      await supabase.from("ent_entregas").update({ chegada_prevista: novo })
        .eq("lead_id", leadId).eq("status", "a_programar").eq("chegada_prevista", anterior)
    }

    revalidatePath(`/crm/lead/${leadId}`)
    revalidatePath("/entregas")
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro ao alterar o prazo." }
  }
}

/** Histórico das mudanças de prazo de um lead (vazio se a migração ainda não rodou) */
export async function historicoPrazo(leadId: string): Promise<PrazoAlteracao[]> {
  const supabase = await createClient()
  const user = await obterUsuario()
  if (!user) return []
  const { data, error } = await supabase.from("crm_prazo_alteracoes").select("*").eq("lead_id", leadId).order("criado_em", { ascending: false })
  if (error || !data?.length) return []
  const ids = Array.from(new Set(data.map(d => d.criado_por).filter(Boolean))) as string[]
  const { data: usus } = ids.length ? await supabase.from("usuarios").select("id, nome").in("id", ids) : { data: [] as { id: string; nome: string }[] }
  const nomes = new Map((usus || []).map(u => [u.id, u.nome]))
  return data.map(d => ({
    id: d.id, lead_id: d.lead_id, prazo_anterior: d.prazo_anterior, prazo_novo: d.prazo_novo,
    pedido_por: d.pedido_por === "empresa" ? "empresa" : "cliente", motivo: d.motivo,
    anexo_nome: d.anexo_nome, tem_anexo: !!d.anexo_caminho,
    criado_por: d.criado_por, criado_por_nome: (d.criado_por && nomes.get(d.criado_por)) || null, criado_em: d.criado_em,
  }))
}

/** Link temporário (5 min) para abrir o anexo. Só quem enxerga o registro (regras do lead) consegue. */
export async function linkAnexoPrazo(id: string): Promise<{ ok: true; url: string } | { ok: false; erro: string }> {
  const supabase = await createClient()
  const user = await obterUsuario()
  if (!user) return { ok: false, erro: "Faça login novamente." }
  const { data } = await supabase.from("crm_prazo_alteracoes").select("anexo_caminho").eq("id", id).maybeSingle()
  if (!data?.anexo_caminho) return { ok: false, erro: "Anexo não encontrado." }
  const admin = await createAdminClient()
  const { data: link, error } = await admin.storage.from(BUCKET).createSignedUrl(data.anexo_caminho, 300)
  if (error || !link) return { ok: false, erro: error?.message || "Não foi possível abrir o anexo." }
  return { ok: true, url: link.signedUrl }
}
