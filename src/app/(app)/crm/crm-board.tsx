"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import {
  AlertTriangle, CalendarClock, CheckCircle2, FileText, Flame, ListTodo, MapPin, Plus, Search, Send,
  Settings, Target, TrendingUp, Trophy, UserRound, Wallet, X, XCircle,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { assumirLead, criarLead, listarClientesParaLead, moverLead } from "@/app/actions/crm"
import {
  TEMPERATURA_INFO, campoNoFunil, hojeISO, temperatura,
  type CrmEtapa, type CrmLead, type CrmQuadro, type Temperatura,
} from "@/lib/crm-types"
import { LeadCampos, LEAD_VAZIO, type LeadFormValores } from "./lead-campos"
import { CamposQualificacao, ScoreBadge } from "./crm-score"
import { EnviarFunilDialog, GanhoDialog, PerdidoDialog, type AlvoEtapa } from "./crm-dialogs"
import { brl, diasDesde, formatarData, iniciais, inputClasse } from "./crm-utils"

function valorDoLead(l: CrmLead) {
  if (l.status === "ganho" && l.valor_fechado) return Number(l.valor_fechado)
  return Number(l.valor_estimado) || Number(l.maior_orcamento) || 0
}

const COLUNA_ENVIAR = "__enviar__"
const SEM_RESPONSAVEL = "__fila__"

export function CrmBoard({ quadro }: { quadro: CrmQuadro }) {
  const router = useRouter()
  const [leads, setLeads] = useState<CrmLead[]>(quadro.leads)
  useEffect(() => setLeads(quadro.leads), [quadro.leads])

  const [busca, setBusca] = useState("")
  const [vendedor, setVendedor] = useState("")
  const [temp, setTemp] = useState<"" | Temperatura>("")
  const [ordenacao, setOrdenacao] = useState<"manual" | "score">("manual")
  const [periodoFechados, setPeriodoFechados] = useState("30")
  const [novoAberto, setNovoAberto] = useState(false)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [colunaAlvo, setColunaAlvo] = useState<string | null>(null)
  const [cartaoAlvo, setCartaoAlvo] = useState<string | null>(null)
  const [ganho, setGanho] = useState<AlvoEtapa>(null)
  const [perdido, setPerdido] = useState<AlvoEtapa>(null)
  const [enviar, setEnviar] = useState<CrmLead | null>(null)

  const funil = quadro.funilAtual
  const proximoFunil = quadro.funis.find(f => f.id === funil?.proximo_funil_id)
  const nomeUsuario = (id: string) => quadro.usuarios.find(u => u.id === id)?.nome || "?"
  const mostraFiltroVendedor = quadro.isAdmin || !!funil?.membros_veem_todos
  const equipe = useMemo(() => funil?.usuarios || [], [funil])
  // Pode pegar leads da fila: funil compartilhado e a pessoa trabalha nele
  const podeAssumir = !!funil?.membros_veem_todos && (equipe.includes(quadro.userId) || (!equipe.length && !quadro.isAdmin))

  const assumir = async (l: CrmLead) => {
    const r = await assumirLead(l.id)
    if (!r.ok) return toast.error(r.erro)
    toast.success(`Você assumiu "${l.titulo}"`)
    setLeads(ls => ls.map(x => x.id === l.id ? { ...x, vendedor_id: quadro.userId } : x))
    router.refresh()
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const limite = periodoFechados === "todos" ? 0 : Date.now() - Number(periodoFechados) * 86400000
    return leads.filter(l => {
      if (vendedor === SEM_RESPONSAVEL) { if (!equipe.length || equipe.includes(l.vendedor_id)) return false }
      else if (vendedor && l.vendedor_id !== vendedor) return false
      if (temp && temperatura(l.score, quadro.config) !== temp) return false
      if (termo) {
        const alvo = [l.titulo, l.contato_nome, l.cidade, l.uf, l.cliente_nome, l.telefone].filter(Boolean).join(" ").toLowerCase()
        if (!alvo.includes(termo)) return false
      }
      if (limite && l.status !== "aberto") {
        const quando = new Date(l.ganho_em || l.perdido_em || l.atualizado_em).getTime()
        if (quando < limite) return false
      }
      return true
    })
  }, [leads, busca, vendedor, temp, periodoFechados, quadro.config, equipe])

  const porEtapa = useMemo(() => {
    const m: Record<string, CrmLead[]> = {}
    for (const e of quadro.etapas) m[e.id] = []
    for (const l of filtrados) (m[l.etapa_id] ||= []).push(l)
    for (const k of Object.keys(m)) {
      m[k].sort(ordenacao === "score" ? (a, b) => b.score - a.score || a.ordem - b.ordem : (a, b) => a.ordem - b.ordem)
    }
    return m
  }, [filtrados, quadro.etapas, ordenacao])

  const resumo = useMemo(() => {
    let aberto = 0, ponderado = 0, ganhos = 0, qtdAbertos = 0, qtdGanhos = 0, qtdPerdidos = 0, quentes = 0
    for (const l of filtrados) {
      const v = valorDoLead(l)
      if (l.status === "aberto") {
        qtdAbertos++
        aberto += v
        ponderado += v * ((quadro.etapas.find(e => e.id === l.etapa_id)?.probabilidade || 0) / 100)
        if (temperatura(l.score, quadro.config) === "quente") quentes++
      } else if (l.status === "ganho") { ganhos += v; qtdGanhos++ }
      else qtdPerdidos++
    }
    const conversao = qtdGanhos + qtdPerdidos ? Math.round((qtdGanhos / (qtdGanhos + qtdPerdidos)) * 100) : null
    return { aberto, ponderado, ganhos, qtdAbertos, qtdGanhos, conversao, quentes }
  }, [filtrados, quadro.etapas, quadro.config])

  // ------------------------------------------------------------------
  // Arrastar e soltar
  // ------------------------------------------------------------------
  const soltar = async (etapa: CrmEtapa | typeof COLUNA_ENVIAR) => {
    const id = arrastando
    const antesDe = cartaoAlvo
    setArrastando(null); setColunaAlvo(null); setCartaoAlvo(null)
    if (!id) return
    const lead = leads.find(l => l.id === id)
    if (!lead) return

    if (etapa === COLUNA_ENVIAR) { setEnviar(lead); return }
    if (etapa.tipo === "ganho") { if (lead.etapa_id !== etapa.id) setGanho({ leadId: id, etapaId: etapa.id }); return }
    if (etapa.tipo === "perdido") { if (lead.etapa_id !== etapa.id) setPerdido({ leadId: id, etapaId: etapa.id }); return }

    // calcula a nova posição dentro da coluna
    const coluna = (porEtapa[etapa.id] || []).filter(l => l.id !== id)
    let ordem: number
    const idx = antesDe ? coluna.findIndex(l => l.id === antesDe) : -1
    if (ordenacao === "score" || idx === -1) ordem = coluna.length ? Math.max(...coluna.map(l => l.ordem)) + 1000 : Date.now()
    else if (idx === 0) ordem = coluna[0].ordem - 1000
    else ordem = (coluna[idx - 1].ordem + coluna[idx].ordem) / 2

    if (lead.etapa_id === etapa.id && lead.ordem === ordem) return
    const anterior = leads
    setLeads(ls => ls.map(l => l.id === id ? {
      ...l, etapa_id: etapa.id, ordem, status: "aberto",
      etapa_desde: l.etapa_id === etapa.id ? l.etapa_desde : new Date().toISOString(),
    } : l))
    const r = await moverLead(id, etapa.id, ordem)
    if (!r.ok) { toast.error(r.erro); setLeads(anterior); return }
    router.refresh()
  }

  const eventosColuna = (chave: string, alvo: CrmEtapa | typeof COLUNA_ENVIAR) => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); if (colunaAlvo !== chave) setColunaAlvo(chave) },
    onDragLeave: (e: React.DragEvent<HTMLElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) { setColunaAlvo(null); setCartaoAlvo(null) }
    },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); soltar(alvo) },
  })

  // ------------------------------------------------------------------

  if (quadro.erro) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
        <h2 className="text-lg font-semibold mb-1">CRM indisponível</h2>
        <p>{quadro.erro}</p>
      </div>
    )
  }

  if (!funil) {
    return (
      <div className="rounded-xl border bg-background p-10 text-center space-y-3">
        <Target className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <p className="font-medium">Você ainda não tem acesso a nenhum funil.</p>
        <p className="text-sm text-muted-foreground">Peça ao administrador para incluir você em um funil em Configurações → CRM.</p>
        {quadro.isAdmin && (
          <Link href="/admin/configuracoes?tab=crm" className={buttonVariants({ className: "bg-[#d97021] hover:bg-[#c3631b]" })}>
            Configurar CRM
          </Link>
        )}
      </div>
    )
  }

  const kpis = [
    { rotulo: "Leads em aberto", valor: String(resumo.qtdAbertos), icone: UserRound, cor: "text-slate-600 bg-slate-100" },
    { rotulo: "Valor em aberto", valor: brl.format(resumo.aberto), icone: Wallet, cor: "text-orange-700 bg-orange-100" },
    { rotulo: "Previsão", valor: brl.format(resumo.ponderado), icone: TrendingUp, cor: "text-violet-700 bg-violet-100", dica: "Valor em aberto × chance de cada etapa" },
    { rotulo: "Ganhos no período", valor: `${brl.format(resumo.ganhos)}`, extra: `${resumo.qtdGanhos} venda(s)${resumo.conversao !== null ? ` · ${resumo.conversao}% conversão` : ""}`, icone: Trophy, cor: "text-emerald-700 bg-emerald-100" },
    { rotulo: "Leads quentes", valor: String(resumo.quentes), icone: Flame, cor: "text-red-700 bg-red-100" },
  ]

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-7rem)]">
      {/* ------------------------------------------------ Cabeçalho */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight">CRM</h2>
            {funil.descricao && <p className="text-sm text-muted-foreground truncate">{funil.descricao}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input className={cn(inputClasse, "pl-8 w-52 bg-background")} placeholder="Buscar lead, cidade..." value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          {mostraFiltroVendedor && (
            <select className={cn(inputClasse, "w-auto bg-background")} value={vendedor} onChange={e => setVendedor(e.target.value)}>
              <option value="">Todos os responsáveis</option>
              {equipe.length > 0 && <option value={SEM_RESPONSAVEL}>Na fila (sem responsável)</option>}
              {quadro.usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          )}
          <select className={cn(inputClasse, "w-auto bg-background")} value={ordenacao} onChange={e => setOrdenacao(e.target.value as "manual" | "score")}>
            <option value="manual">Ordem: manual</option>
            <option value="score">Ordem: mais quentes</option>
          </select>
          <select className={cn(inputClasse, "w-auto bg-background")} value={periodoFechados} onChange={e => setPeriodoFechados(e.target.value)} title="Quais ganhos/perdidos aparecem">
            <option value="30">Fechados: 30 dias</option>
            <option value="90">Fechados: 90 dias</option>
            <option value="365">Fechados: 12 meses</option>
            <option value="todos">Fechados: todos</option>
          </select>
          {quadro.isAdmin && (
            <Link href="/admin/configuracoes?tab=crm" title="Configurar funis, etapas e campos" className={buttonVariants({ variant: "outline", size: "icon", className: "bg-background" })}>
              <Settings className="h-4 w-4" />
            </Link>
          )}
          <Button className="gap-1 bg-[#d97021] hover:bg-[#c3631b] shadow-sm" onClick={() => setNovoAberto(true)}>
            <Plus className="h-4 w-4" /> Novo lead
          </Button>
        </div>
      </div>

      {/* Abas dos funis */}
      {quadro.funis.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border bg-background p-1 shadow-sm w-fit max-w-full">
          {quadro.funis.map((f, i) => {
            const ativo = f.id === funil.id
            return (
              <div key={f.id} className="flex items-center">
                <button onClick={() => router.push(`/crm?funil=${f.id}`)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${ativo ? "text-white shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                  style={ativo ? { backgroundColor: f.cor } : undefined}>
                  {!ativo && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.cor }} />}
                  {f.nome}
                  <span className={`rounded-full px-1.5 text-[11px] ${ativo ? "bg-white/25" : "bg-muted"}`}>{quadro.contagemFunis[f.id] || 0}</span>
                </button>
                {i < quadro.funis.length - 1 && f.proximo_funil_id === quadro.funis[i + 1]?.id && (
                  <span className="px-0.5 text-muted-foreground/40">›</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {kpis.map(k => (
          <div key={k.rotulo} className="flex items-center gap-3 rounded-xl border bg-background p-3 shadow-sm" title={k.dica}>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${k.cor}`}><k.icone className="h-4 w-4" /></span>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">{k.rotulo}</div>
              <div className="text-base font-bold leading-tight truncate">{k.valor}</div>
              {k.extra && <div className="text-[11px] text-muted-foreground truncate">{k.extra}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Filtro de temperatura */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {mostraFiltroVendedor && (
          <>
            <button onClick={() => setVendedor(vendedor === quadro.userId ? "" : quadro.userId)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ring-1 ring-inset transition-colors ${vendedor === quadro.userId
                ? "bg-[#d97021] text-white ring-[#d97021]" : "bg-background ring-border text-muted-foreground hover:text-foreground"}`}>
              <UserRound className="h-3 w-3" /> Meus leads
            </button>
            {equipe.length > 0 && (
              <button onClick={() => setVendedor(vendedor === SEM_RESPONSAVEL ? "" : SEM_RESPONSAVEL)}
                title="Leads que chegaram neste funil e ainda não têm ninguém da equipe como responsável"
                className={`rounded-full px-2.5 py-1 font-medium ring-1 ring-inset transition-colors ${vendedor === SEM_RESPONSAVEL
                  ? "bg-amber-500 text-white ring-amber-500" : "bg-background ring-border text-muted-foreground hover:text-foreground"}`}>
                Na fila (sem responsável)
              </button>
            )}
            <span className="mx-1 h-4 w-px bg-border" />
          </>
        )}
        <span className="text-muted-foreground mr-1">Temperatura:</span>
        {([["", "Todos"], ["quente", "Quentes"], ["morno", "Mornos"], ["frio", "Frios"]] as const).map(([v, r]) => (
          <button key={v} onClick={() => setTemp(v)}
            className={`rounded-full px-2.5 py-1 font-medium ring-1 ring-inset transition-colors ${temp === v
              ? v ? TEMPERATURA_INFO[v].classe + " ring-2" : "bg-foreground text-background ring-foreground"
              : "bg-background ring-border text-muted-foreground hover:text-foreground"}`}>
            {r}
          </button>
        ))}
        {(temp || busca || vendedor) && (
          <button className="ml-1 inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground" onClick={() => { setTemp(""); setBusca(""); setVendedor("") }}>
            <X className="h-3 w-3" /> limpar filtros
          </button>
        )}
      </div>

      {/* ------------------------------------------------ Quadro */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2 -mx-1 px-1">
        <div className="flex gap-3 h-full min-w-max">
          {quadro.etapas.map(etapa => {
            const cards = porEtapa[etapa.id] || []
            const total = cards.reduce((s, l) => s + valorDoLead(l), 0)
            const ativa = colunaAlvo === etapa.id
            return (
              <div key={etapa.id}
                className={`w-[280px] shrink-0 flex flex-col rounded-xl bg-slate-100/80 ring-1 ring-inset ring-slate-200/70 transition-all ${ativa ? "ring-2 ring-[#d97021] bg-orange-50" : ""}`}
                {...eventosColuna(etapa.id, etapa)}>
                <div className="px-3 pt-3 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-semibold text-sm min-w-0">
                      {etapa.tipo === "ganho" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        : etapa.tipo === "perdido" ? <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                        : <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: etapa.cor }} />}
                      <span className="truncate">{etapa.nome}</span>
                    </span>
                    <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium shadow-sm">{cards.length}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{brl.format(total)}</span>
                    {etapa.tipo === "aberta" && etapa.probabilidade ? <span>{etapa.probabilidade}% chance</span> : null}
                  </div>
                  <div className="mt-2 h-0.5 rounded-full" style={{ backgroundColor: etapa.cor, opacity: 0.6 }} />
                </div>

                <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                  {cards.map(l => (
                    <CartaoLead key={l.id} l={l} quadro={quadro} nomeUsuario={nomeUsuario}
                      arrastando={arrastando} cartaoAlvo={cartaoAlvo}
                      onDragStart={() => setArrastando(l.id)}
                      onDragEnd={() => { setArrastando(null); setColunaAlvo(null); setCartaoAlvo(null) }}
                      onDragOver={() => { if (cartaoAlvo !== l.id) setCartaoAlvo(l.id) }}
                      onAbrir={() => router.push(`/crm/lead/${l.id}`)}
                      naFila={equipe.length > 0 && !equipe.includes(l.vendedor_id)}
                      onAssumir={podeAssumir && l.status === "aberto" && l.vendedor_id !== quadro.userId ? () => assumir(l) : undefined} />
                  ))}
                  {cards.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-8 border-2 border-dashed border-slate-300/70 rounded-lg">
                      {etapa.tipo === "aberta" ? "Arraste leads para cá" : etapa.tipo === "ganho" ? "Solte aqui para ganhar" : "Solte aqui para perder"}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Coluna para enviar ao próximo funil */}
          {quadro.funis.length > 1 && (
            <div {...eventosColuna(COLUNA_ENVIAR, COLUNA_ENVIAR)}
              className={`w-[200px] shrink-0 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition-all ${colunaAlvo === COLUNA_ENVIAR ? "border-[#d97021] bg-orange-50" : "border-slate-300"}`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full text-white" style={{ backgroundColor: proximoFunil?.cor || "#94a3b8" }}>
                <Send className="h-4 w-4" />
              </span>
              <div className="text-sm font-semibold">{proximoFunil ? `Enviar para ${proximoFunil.nome}` : "Enviar para outro funil"}</div>
              <p className="text-xs text-muted-foreground">Arraste o lead aqui quando ele estiver pronto para a próxima equipe.</p>
            </div>
          )}
        </div>
      </div>

      <NovoLeadDialog aberto={novoAberto} onFechar={() => setNovoAberto(false)} quadro={quadro}
        onCriado={(id) => { setNovoAberto(false); router.push(`/crm/lead/${id}`) }} />

      <GanhoDialog alvo={ganho} onFechar={() => setGanho(null)} onFeito={() => { setGanho(null); router.refresh() }} />
      <PerdidoDialog alvo={perdido} motivos={quadro.motivos} config={quadro.config} onFechar={() => setPerdido(null)} onFeito={() => { setPerdido(null); router.refresh() }} />
      <EnviarFunilDialog
        alvo={enviar ? { leadId: enviar.id, titulo: enviar.titulo, funilAtualId: enviar.funil_id, vendedorId: enviar.vendedor_id } : null}
        funis={quadro.funis}
        usuarios={quadro.usuarios}
        onFechar={() => setEnviar(null)}
        onFeito={() => { setEnviar(null); router.refresh() }}
      />
    </div>
  )
}

// ======================================================================

function CartaoLead({ l, quadro, nomeUsuario, arrastando, cartaoAlvo, onDragStart, onDragEnd, onDragOver, onAbrir, naFila, onAssumir }: {
  l: CrmLead
  quadro: CrmQuadro
  nomeUsuario: (id: string) => string
  arrastando: string | null
  cartaoAlvo: string | null
  onDragStart: () => void
  onDragEnd: () => void
  onDragOver: () => void
  onAbrir: () => void
  naFila: boolean
  onAssumir?: () => void
}) {
  const dias = diasDesde(l.etapa_desde)
  const parado = l.status === "aberto" && dias >= quadro.config.dias_alerta_parado
  const hoje = hojeISO()
  const contatoAtrasado = l.status === "aberto" && l.proxima_acao_em && l.proxima_acao_em < hoje
  const valor = valorDoLead(l)
  const t = temperatura(l.score, quadro.config)
  const temCampos = quadro.campos.some(c => c.ativo)

  return (
    <div
      draggable
      onDragStart={e => { onDragStart(); e.dataTransfer.effectAllowed = "move" }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onClick={onAbrir}
      className={`group relative rounded-lg border bg-background p-3 shadow-sm cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md
        ${arrastando === l.id ? "opacity-40 rotate-1" : ""}
        ${cartaoAlvo === l.id && arrastando && arrastando !== l.id ? "border-t-4 border-t-[#d97021]" : ""}`}
      style={{ borderLeft: `3px solid ${l.status === "aberto" && temCampos ? TEMPERATURA_INFO[t].cor : "transparent"}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-sm leading-snug line-clamp-2">{l.titulo}</div>
          {l.cliente_nome && l.cliente_nome !== l.titulo && (
            <div className="text-xs text-muted-foreground truncate">{l.cliente_nome}</div>
          )}
        </div>
        <span title={nomeUsuario(l.vendedor_id)} className="shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-[#f3a35f] to-[#d97021] text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
          {iniciais(nomeUsuario(l.vendedor_id))}
        </span>
      </div>

      {(l.cidade || l.uf) && (
        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1.5">
          <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{[l.cidade, l.uf].filter(Boolean).join(" - ")}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-2.5">
        <span className={`text-base font-bold ${l.status === "ganho" ? "text-emerald-700" : ""}`}>
          {valor ? brl.format(valor) : <span className="text-muted-foreground font-normal text-xs">sem valor</span>}
        </span>
        {temCampos && l.status === "aberto" && <ScoreBadge score={l.score} config={quadro.config} />}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2.5 border-t text-[11px]">
        {l.status === "aberto" && (
          <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 ${parado ? "bg-amber-100 text-amber-800 font-medium" : "bg-muted text-muted-foreground"}`}
            title="Dias nesta etapa">
            {parado && <AlertTriangle className="h-3 w-3" />}{dias}d
          </span>
        )}
        {!!l.qtd_orcamentos && (
          <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 text-blue-700 px-1.5 py-0.5" title="Orçamentos">
            <FileText className="h-3 w-3" />{l.qtd_orcamentos}
          </span>
        )}
        {!!l.tarefas_abertas && (
          <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 ${l.tarefa_atrasada ? "bg-red-100 text-red-700 font-medium" : "bg-muted text-muted-foreground"}`}
            title={l.tarefa_atrasada ? "Tarefa atrasada" : "Tarefas abertas"}>
            <ListTodo className="h-3 w-3" />{l.tarefas_abertas}
          </span>
        )}
        {l.proxima_acao_em && l.status === "aberto" && (
          <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 ${contatoAtrasado ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"}`} title="Próximo contato">
            <CalendarClock className="h-3 w-3" />{formatarData(l.proxima_acao_em).slice(0, 5)}
          </span>
        )}
        {naFila && l.status === "aberto" && (
          <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 font-medium" title="Ninguém da equipe deste funil é o responsável ainda">na fila</span>
        )}
        {onAssumir && (
          <button onClick={e => { e.stopPropagation(); onAssumir() }}
            className={`ml-auto rounded-md px-2 py-0.5 font-semibold transition-colors ${naFila ? "bg-[#d97021] text-white hover:bg-[#c3631b]" : "text-[#d97021] opacity-0 group-hover:opacity-100 hover:bg-orange-50"}`}>
            Assumir
          </button>
        )}
        {l.status === "perdido" && l.motivo_perda_id && (
          <span className="rounded bg-red-50 text-red-700 px-1.5 py-0.5">{quadro.motivos.find(m => m.id === l.motivo_perda_id)?.nome}</span>
        )}
      </div>
    </div>
  )
}

// ======================================================================

type ClienteBusca = Awaited<ReturnType<typeof listarClientesParaLead>>[number]

function NovoLeadDialog({ aberto, onFechar, quadro, onCriado }: {
  aberto: boolean
  onFechar: () => void
  quadro: CrmQuadro
  onCriado: (id: string) => void
}) {
  const [valores, setValores] = useState<LeadFormValores>({ ...LEAD_VAZIO, vendedor_id: quadro.userId })
  const [campos, setCampos] = useState<Record<string, unknown>>({})
  const [etapaId, setEtapaId] = useState("")
  const [cliente, setCliente] = useState<ClienteBusca | null>(null)
  const [buscandoCliente, setBuscandoCliente] = useState(false)
  const [clientes, setClientes] = useState<ClienteBusca[] | null>(null)
  const [buscaCliente, setBuscaCliente] = useState("")
  const [mostrarQualificacao, setMostrarQualificacao] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const abertas = quadro.etapas.filter(e => e.tipo === "aberta")
  const funilId = quadro.funilAtual?.id || ""
  const temCampos = quadro.campos.some(c => c.ativo && campoNoFunil(c, funilId))

  useEffect(() => {
    if (aberto) {
      setValores({ ...LEAD_VAZIO, vendedor_id: quadro.userId })
      setCampos({})
      setCliente(null)
      setBuscandoCliente(false)
      setBuscaCliente("")
      setMostrarQualificacao(false)
      setEtapaId(abertas[0]?.id || "")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  useEffect(() => {
    if (buscandoCliente && !clientes) listarClientesParaLead().then(setClientes)
  }, [buscandoCliente, clientes])

  const clientesFiltrados = useMemo(() => {
    const t = buscaCliente.trim().toLowerCase()
    if (!t) return (clientes || []).slice(0, 8)
    return (clientes || []).filter(c => c.nome.toLowerCase().includes(t) || (c.cidade_uf || "").toLowerCase().includes(t)).slice(0, 8)
  }, [clientes, buscaCliente])

  const escolherCliente = (c: ClienteBusca) => {
    setCliente(c)
    setBuscandoCliente(false)
    const [cidade, uf] = (c.cidade_uf || "").split(/\s*[/-]\s*/)
    setValores(v => ({
      ...v,
      titulo: v.titulo || c.nome,
      telefone: v.telefone || c.telefone || "",
      cidade: v.cidade || cidade || "",
      uf: v.uf || (uf && uf.length === 2 ? uf.toUpperCase() : ""),
    }))
  }

  const salvar = async () => {
    if (!quadro.funilAtual) return
    setSalvando(true)
    const r = await criarLead({ ...valores, cliente_id: cliente?.id || "", funil_id: quadro.funilAtual.id, etapa_id: etapaId, campos })
    setSalvando(false)
    if (!r.ok) return toast.error(r.erro)
    toast.success("Lead criado")
    onCriado(r.dados!.id)
  }

  return (
    <Dialog open={aberto} onOpenChange={o => { if (!o) onFechar() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Novo lead
            {quadro.funilAtual && (
              <span className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: quadro.funilAtual.cor }}>
                {quadro.funilAtual.nome}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Cliente já cadastrado? */}
        <div className="rounded-lg border bg-muted/30 p-3">
          {cliente ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d97021]/15 text-xs font-bold text-[#a8541a]">{cliente.nome[0]?.toUpperCase()}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{cliente.nome}</div>
                <div className="text-xs text-muted-foreground">Cliente já cadastrado — será ligado ao lead</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setCliente(null)}><X className="h-4 w-4" /></Button>
            </div>
          ) : buscandoCliente ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input autoFocus className={`${inputClasse} pl-8 bg-background`} placeholder="Buscar cliente cadastrado..." value={buscaCliente} onChange={e => setBuscaCliente(e.target.value)} />
              </div>
              <div className="max-h-48 overflow-y-auto rounded-md border bg-background divide-y">
                {!clientes ? <p className="p-3 text-xs text-muted-foreground">Carregando...</p>
                  : clientesFiltrados.length === 0 ? <p className="p-3 text-xs text-muted-foreground">Nenhum cliente encontrado.</p>
                  : clientesFiltrados.map(c => (
                    <button key={c.id} className="block w-full px-3 py-2 text-left text-sm hover:bg-orange-50" onClick={() => escolherCliente(c)}>
                      <span className="font-medium">{c.nome}</span>
                      {c.cidade_uf && <span className="text-xs text-muted-foreground"> · {c.cidade_uf}</span>}
                    </button>
                  ))}
              </div>
              <Button size="sm" variant="ghost" onClick={() => setBuscandoCliente(false)}>Cancelar</Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">É um cliente que já está cadastrado?</span>
              <Button size="sm" variant="outline" className="gap-1 bg-background" onClick={() => setBuscandoCliente(true)}>
                <Search className="h-3.5 w-3.5" /> Selecionar cliente
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label>Etapa</Label>
          <select className={inputClasse} value={etapaId} onChange={e => setEtapaId(e.target.value)}>
            {abertas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
        <LeadCampos valores={valores} onChange={setValores} origens={quadro.origens} usuarios={quadro.usuarios} podeTrocarVendedor={quadro.isAdmin} autoFocar />

        {temCampos && (
          <div className="rounded-lg border">
            <button type="button" className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium" onClick={() => setMostrarQualificacao(m => !m)}>
              <span>Qualificação (score) — opcional</span>
              <span className="text-xs text-[#d97021]">{mostrarQualificacao ? "esconder" : "preencher agora"}</span>
            </button>
            {mostrarQualificacao && (
              <div className="border-t p-3">
                <CamposQualificacao campos={quadro.campos.filter(c => campoNoFunil(c, funilId))} funilId={funilId}
                  valores={campos} onChange={setCampos} config={quadro.config} />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando || !valores.titulo.trim()} className="bg-[#d97021] hover:bg-[#c3631b]">
            {salvando ? "Salvando..." : "Criar lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
