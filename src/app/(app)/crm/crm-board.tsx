"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import {
  AlertTriangle, CalendarClock, CheckCircle2, Clock, FileText, Flame, ListTodo, MapPin, Plus, Search, Send,
  Settings, SlidersHorizontal, Target, TrendingUp, Trophy, UserRound, Wallet, X, XCircle,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { alternarFollowup, assumirLead, criarLead, listarClientesParaLead, moverLead } from "@/app/actions/crm"
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
const COLUNA_FOLLOWUP = "__followup__"
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
  const [maisFiltros, setMaisFiltros] = useState(false)
  const [etapaMobile, setEtapaMobile] = useState("")

  const funil = quadro.funilAtual
  const proximoFunil = quadro.funis.find(f => f.id === funil?.proximo_funil_id)
  // Follow-up: funil filho que fica dentro do funil de vendas
  const funilPai = funil?.funil_pai_id ? quadro.funis.find(f => f.id === funil.funil_pai_id) || null : funil
  const funilFollowup = funilPai ? quadro.funis.find(f => f.funil_pai_id === funilPai.id) || null : null
  const noFollowup = !!funil?.funil_pai_id
  const abasPrincipais = quadro.funis.filter(f => !f.funil_pai_id)
  const contagemComFilhos = (id: string) => quadro.funis
    .filter(f => f.id === id || f.funil_pai_id === id)
    .reduce((s, f) => s + (quadro.contagemFunis[f.id] || 0), 0)
  const nomeUsuario = (id: string) => quadro.usuarios.find(u => u.id === id)?.nome || "?"
  // vê leads dos outros: admin, liberado pelo admin, ou funil "membros veem todos" (menos para vendedor)
  const veOutros = quadro.isAdmin || quadro.liberadoVerTodos || (!quadro.restrito && !!funil?.membros_veem_todos)
  const mostraFiltroVendedor = veOutros
  const equipe = useMemo(() => funil?.usuarios || [], [funil])
  // Pode pegar leads da fila: funil compartilhado e a pessoa trabalha nele
  const podeAssumir = veOutros && (equipe.includes(quadro.userId) || (!equipe.length && !quadro.isAdmin))

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

  // Lead com etapa que não é deste funil (dado antigo/inconsistente): mostra na primeira
  // coluna com aviso, em vez de sumir do quadro. Arrastar para uma coluna corrige.
  const orfaos = useMemo(() => {
    const ids = new Set(quadro.etapas.map(e => e.id))
    return new Set(filtrados.filter(l => !ids.has(l.etapa_id)).map(l => l.id))
  }, [filtrados, quadro.etapas])

  const porEtapa = useMemo(() => {
    const m: Record<string, CrmLead[]> = {}
    for (const e of quadro.etapas) m[e.id] = []
    const primeira = quadro.etapas.find(e => e.tipo === "aberta") || quadro.etapas[0]
    for (const l of filtrados) {
      const destino = m[l.etapa_id] ? l.etapa_id : primeira?.id
      if (destino) m[destino].push(l)
    }
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
  const moverFollowup = async (lead: CrmLead) => {
    const r = await alternarFollowup(lead.id)
    if (!r.ok) return toast.error(r.erro)
    setLeads(ls => ls.filter(l => l.id !== lead.id))
    toast.success(noFollowup ? `"${lead.titulo}" voltou para ${funilPai?.nome || "Vendas"} (Negociação)` : `"${lead.titulo}" foi para o Follow-up`)
    router.refresh()
  }

  const soltar = async (etapa: CrmEtapa | typeof COLUNA_ENVIAR | typeof COLUNA_FOLLOWUP) => {
    const id = arrastando
    const antesDe = cartaoAlvo
    setArrastando(null); setColunaAlvo(null); setCartaoAlvo(null)
    if (!id) return
    const lead = leads.find(l => l.id === id)
    if (!lead) return

    if (etapa === COLUNA_ENVIAR) { setEnviar(lead); return }
    if (etapa === COLUNA_FOLLOWUP) { if (lead.status === "aberto") moverFollowup(lead); else toast.error("Só lead em andamento pode mudar de funil."); return }
    if (etapa.tipo === "ganho") {
      if (!funil?.permite_ganho) { toast.error("Ganho só no funil de vendas. Envie o lead para o funil de vendas."); return }
      if (lead.etapa_id !== etapa.id) setGanho({ leadId: id, etapaId: etapa.id }); return
    }
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

  const eventosColuna = (chave: string, alvo: CrmEtapa | typeof COLUNA_ENVIAR | typeof COLUNA_FOLLOWUP) => ({
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

  const etapasVisiveis = quadro.etapas.filter(e => e.tipo !== "ganho" || funil?.permite_ganho || (porEtapa[e.id] || []).length > 0)
  const etapaAtivaMobile = etapasVisiveis.find(e => e.id === etapaMobile) || etapasVisiveis.find(e => e.tipo === "aberta") || etapasVisiveis[0]
  const filtrosExtras = (vendedor && vendedor !== quadro.userId && vendedor !== SEM_RESPONSAVEL ? 1 : 0) + (ordenacao !== "manual" ? 1 : 0) + (periodoFechados !== "30" ? 1 : 0)
  const temFiltro = !!(temp || busca || vendedor || ordenacao !== "manual" || periodoFechados !== "30")
  const chip = (ativo: boolean) => cn(
    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
    ativo ? "border-foreground bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30",
  )
  const cartao = (l: CrmLead) => (
    <CartaoLead key={l.id} l={l} quadro={quadro} nomeUsuario={nomeUsuario}
      arrastando={arrastando} cartaoAlvo={cartaoAlvo}
      onDragStart={() => setArrastando(l.id)}
      onDragEnd={() => { setArrastando(null); setColunaAlvo(null); setCartaoAlvo(null) }}
      onDragOver={() => { if (cartaoAlvo !== l.id) setCartaoAlvo(l.id) }}
      onAbrir={() => router.push(`/crm/lead/${l.id}`)}
      naFila={equipe.length > 0 && !equipe.includes(l.vendedor_id)}
      foraDeEtapa={orfaos.has(l.id)}
      onAssumir={podeAssumir && l.status === "aberto" && l.vendedor_id !== quadro.userId ? () => assumir(l) : undefined} />
  )
  const iconeEtapa = (etapa: CrmEtapa) => etapa.tipo === "ganho" ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
    : etapa.tipo === "perdido" ? <XCircle className="h-3.5 w-3.5 shrink-0 text-red-600" />
    : <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: etapa.cor }} />

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-7rem)] min-h-0">
      {/* ------------------------------------------------ Cabeçalho: título, funis e ação principal */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight">CRM</h2>
          <p className="hidden sm:block text-sm text-muted-foreground truncate">
            {funil.descricao || `${resumo.qtdAbertos} lead(s) em andamento em ${funilPai?.nome || funil.nome}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {quadro.isAdmin && (
            <Link href="/admin/configuracoes?tab=crm" title="Configurar funis, etapas e campos" aria-label="Configurar CRM"
              className={buttonVariants({ variant: "ghost", size: "icon" })}>
              <Settings className="h-4 w-4" />
            </Link>
          )}
          <Button className="gap-1.5 bg-[#d97021] hover:bg-[#c3631b]" onClick={() => setNovoAberto(true)}>
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo lead</span><span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {/* Funis (abas) + Vendas | Follow-up */}
      {(abasPrincipais.length > 1 || funilFollowup) && (
        <div className="flex flex-col gap-2 border-b md:flex-row md:items-end md:justify-between">
          <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Funis">
            {abasPrincipais.map(f => {
              const ativo = f.id === funil.id || f.id === funil.funil_pai_id
              return (
                <button key={f.id} onClick={() => router.push(`/crm?funil=${f.id}`)} aria-current={ativo ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2 border-b-2 px-3 pb-2 pt-1 text-sm font-medium transition-colors",
                    ativo ? "border-[#d97021] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                  )}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.cor }} />
                  {f.nome}
                  <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums text-muted-foreground">{contagemComFilhos(f.id)}</span>
                </button>
              )
            })}
          </nav>
          {funilPai && funilFollowup && (
            <div className="mb-2 inline-flex w-fit items-center rounded-lg bg-muted p-0.5 text-sm" role="tablist" aria-label="Negociação ou Follow-up">
              {[funilPai, funilFollowup].map(f => {
                const ativo = f.id === funil.id
                return (
                  <button key={f.id} role="tab" aria-selected={ativo} onClick={() => router.push(`/crm?funil=${f.id}`)}
                    title={f.id === funilFollowup.id ? "Leads quentes que receberam proposta e não estão no momento de comprar" : undefined}
                    className={cn("flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-all",
                      ativo ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                    {f.id === funilFollowup.id ? <><CalendarClock className="h-3.5 w-3.5" /> Follow-up</> : "Em negociação"}
                    <span className="tabular-nums text-xs text-muted-foreground">{quadro.contagemFunis[f.id] || 0}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Indicadores: uma faixa só */}
      <div className="flex overflow-x-auto rounded-xl border bg-background divide-x shrink-0">
        {kpis.map(k => (
          <div key={k.rotulo} className="min-w-[150px] flex-1 px-4 py-2.5" title={k.dica}>
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <k.icone className="h-3.5 w-3.5" />{k.rotulo}
            </div>
            <div className="mt-0.5 text-lg font-semibold tabular-nums leading-tight">{k.valor}</div>
            {k.extra && <div className="text-[11px] text-muted-foreground truncate">{k.extra}</div>}
          </div>
        ))}
      </div>

      {/* Busca e filtros */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input className={cn(inputClasse, "pl-8 bg-background")} placeholder="Buscar lead, cliente, cidade..." value={busca} onChange={e => setBusca(e.target.value)} aria-label="Buscar lead" />
          </div>
          <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto">
            {mostraFiltroVendedor && (
              <button className={chip(vendedor === quadro.userId)} onClick={() => setVendedor(vendedor === quadro.userId ? "" : quadro.userId)}>
                <UserRound className="h-3 w-3" /> Meus leads
              </button>
            )}
            {mostraFiltroVendedor && equipe.length > 0 && (
              <button className={chip(vendedor === SEM_RESPONSAVEL)} onClick={() => setVendedor(vendedor === SEM_RESPONSAVEL ? "" : SEM_RESPONSAVEL)}
                title="Leads que ainda não têm ninguém da equipe como responsável">
                Na fila
              </button>
            )}
            {(["quente", "morno", "frio"] as const).map(v => (
              <button key={v} className={chip(temp === v)} onClick={() => setTemp(temp === v ? "" : v)}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TEMPERATURA_INFO[v].cor }} />
                {TEMPERATURA_INFO[v].rotulo}s
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 bg-background" onClick={() => setMaisFiltros(m => !m)} aria-expanded={maisFiltros}>
            <SlidersHorizontal className="h-4 w-4" /> <span className="hidden sm:inline">Filtros</span>
            {filtrosExtras > 0 && <span className="rounded-full bg-[#d97021] px-1.5 text-[10px] font-semibold text-white">{filtrosExtras}</span>}
          </Button>
          {temFiltro && (
            <button className="hidden sm:inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => { setTemp(""); setBusca(""); setVendedor(""); setOrdenacao("manual"); setPeriodoFechados("30") }}>
              <X className="h-3 w-3" /> Limpar
            </button>
          )}
        </div>
        {maisFiltros && (
          <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-background p-3">
            {/* no celular os atalhos ficam aqui */}
            <div className="flex w-full flex-wrap gap-1.5 sm:hidden">
              {mostraFiltroVendedor && (
                <button className={chip(vendedor === quadro.userId)} onClick={() => setVendedor(vendedor === quadro.userId ? "" : quadro.userId)}>
                  <UserRound className="h-3 w-3" /> Meus leads
                </button>
              )}
              {(["quente", "morno", "frio"] as const).map(v => (
                <button key={v} className={chip(temp === v)} onClick={() => setTemp(temp === v ? "" : v)}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TEMPERATURA_INFO[v].cor }} />
                  {TEMPERATURA_INFO[v].rotulo}s
                </button>
              ))}
            </div>
            {mostraFiltroVendedor && (
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                Responsável
                <select className={cn(inputClasse, "w-48 bg-background text-foreground")} value={vendedor} onChange={e => setVendedor(e.target.value)}>
                  <option value="">Todos</option>
                  {equipe.length > 0 && <option value={SEM_RESPONSAVEL}>Na fila (sem responsável)</option>}
                  {quadro.usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </label>
            )}
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Ordem dos cartões
              <select className={cn(inputClasse, "w-44 bg-background text-foreground")} value={ordenacao} onChange={e => setOrdenacao(e.target.value as "manual" | "score")}>
                <option value="manual">Manual (arrastar)</option>
                <option value="score">Mais quentes primeiro</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Ganhos e perdidos de
              <select className={cn(inputClasse, "w-40 bg-background text-foreground")} value={periodoFechados} onChange={e => setPeriodoFechados(e.target.value)}>
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
                <option value="365">Últimos 12 meses</option>
                <option value="todos">Todo o período</option>
              </select>
            </label>
            {temFiltro && (
              <Button variant="ghost" size="sm" className="gap-1 sm:hidden" onClick={() => { setTemp(""); setBusca(""); setVendedor(""); setOrdenacao("manual"); setPeriodoFechados("30") }}>
                <X className="h-3 w-3" /> Limpar filtros
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------ Celular: uma etapa por vez */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 md:hidden">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {etapasVisiveis.map(etapa => {
            const ativa = etapa.id === etapaAtivaMobile?.id
            return (
              <button key={etapa.id} onClick={() => setEtapaMobile(etapa.id)}
                className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
                  ativa ? "border-foreground bg-foreground text-background" : "bg-background text-muted-foreground")}>
                {iconeEtapa(etapa)}{etapa.nome}
                <span className="tabular-nums opacity-70">{(porEtapa[etapa.id] || []).length}</span>
              </button>
            )
          })}
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-4">
          {etapaAtivaMobile && (porEtapa[etapaAtivaMobile.id] || []).map(cartao)}
          {etapaAtivaMobile && (porEtapa[etapaAtivaMobile.id] || []).length === 0 && (
            <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">Nenhum lead nesta etapa.</p>
          )}
        </div>
      </div>

      {/* ------------------------------------------------ Quadro (computador) */}
      <div className="hidden min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2 md:block">
        <div className="flex h-full min-w-max gap-3">
          {etapasVisiveis.map(etapa => {
            const cards = porEtapa[etapa.id] || []
            const total = cards.reduce((s, l) => s + valorDoLead(l), 0)
            const ativa = colunaAlvo === etapa.id
            return (
              <section key={etapa.id} aria-label={etapa.nome}
                className={cn("flex w-[272px] shrink-0 flex-col rounded-xl bg-muted/50 transition-colors", ativa && "bg-orange-50 ring-2 ring-[#d97021]")}
                {...eventosColuna(etapa.id, etapa)}>
                <header className="px-3 pb-2 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                      {iconeEtapa(etapa)}<span className="truncate">{etapa.nome}</span>
                      <span className="text-xs font-normal tabular-nums text-muted-foreground">{cards.length}</span>
                    </h3>
                    {etapa.tipo === "aberta" && etapa.probabilidade ? (
                      <span className="text-[11px] tabular-nums text-muted-foreground" title="Chance de fechar nesta etapa">{etapa.probabilidade}%</span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">{brl.format(total)}</div>
                </header>
                <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                  {cards.map(cartao)}
                  {cards.length === 0 && (
                    <div className="rounded-lg border-2 border-dashed border-muted-foreground/15 py-8 text-center text-xs text-muted-foreground">
                      {etapa.tipo === "aberta" ? "Arraste leads para cá" : etapa.tipo === "ganho" ? "Solte aqui para ganhar" : "Solte aqui para perder"}
                    </div>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </div>

      {/* Destinos ao arrastar: aparecem só enquanto um cartão está sendo arrastado */}
      {arrastando && (funilFollowup || quadro.funis.length > 1) && (
        <div className="fixed inset-x-0 bottom-6 z-40 hidden justify-center gap-3 px-4 md:flex">
          {funilFollowup && (
            <div {...eventosColuna(COLUNA_FOLLOWUP, COLUNA_FOLLOWUP)}
              className={cn("flex w-72 items-center gap-3 rounded-xl border-2 border-dashed bg-background/95 p-3 shadow-lg backdrop-blur transition-colors",
                colunaAlvo === COLUNA_FOLLOWUP ? "border-sky-500 bg-sky-50" : "border-slate-300")}>
              <CalendarClock className="h-5 w-5 shrink-0 text-sky-600" />
              <div className="text-left">
                <div className="text-sm font-semibold">{noFollowup ? "Voltar para negociação" : "Mover para Follow-up"}</div>
                <div className="text-xs text-muted-foreground">{noFollowup ? `Volta para ${funilPai?.nome || "Vendas"}, em Negociação` : "Não vai comprar agora"}</div>
              </div>
            </div>
          )}
          {quadro.funis.length > 1 && (
            <div {...eventosColuna(COLUNA_ENVIAR, COLUNA_ENVIAR)}
              className={cn("flex w-72 items-center gap-3 rounded-xl border-2 border-dashed bg-background/95 p-3 shadow-lg backdrop-blur transition-colors",
                colunaAlvo === COLUNA_ENVIAR ? "border-[#d97021] bg-orange-50" : "border-slate-300")}>
              <Send className="h-5 w-5 shrink-0 text-[#d97021]" />
              <div className="text-left">
                <div className="text-sm font-semibold">{proximoFunil ? `Enviar para ${proximoFunil.nome}` : "Enviar para outro funil"}</div>
                <div className="text-xs text-muted-foreground">Passa o lead para outra equipe</div>
              </div>
            </div>
          )}
        </div>
      )}

      <NovoLeadDialog
        aberto={novoAberto}
        onFechar={() => setNovoAberto(false)}
        quadro={quadro}
        onCriado={(novoLead, abrirFicha) => {
          setLeads(ls => ls.some(x => x.id === novoLead.id) ? ls : [...ls, novoLead])
          setNovoAberto(false)
          if (abrirFicha) {
            router.push(`/crm/lead/${novoLead.id}`)
          } else {
            router.refresh()
          }
        }}
      />

      <GanhoDialog
        alvo={ganho}
        onFechar={() => setGanho(null)}
        onFeito={() => {
          if (ganho) {
            const agora = new Date().toISOString()
            setLeads(ls => ls.map(x => x.id === ganho.leadId ? { ...x, status: "ganho", etapa_id: ganho.etapaId, ganho_em: agora, etapa_desde: agora } : x))
          }
          setGanho(null)
          router.refresh()
        }}
      />
      <PerdidoDialog
        alvo={perdido}
        motivos={quadro.motivos}
        config={quadro.config}
        onFechar={() => setPerdido(null)}
        onFeito={(motivoId, foiParaNutricao) => {
          if (perdido && foiParaNutricao) {
            // foi para o funil de Marketing: sai deste quadro
            setLeads(ls => ls.filter(x => x.id !== perdido.leadId))
          } else if (perdido) {
            const agora = new Date().toISOString()
            setLeads(ls => ls.map(x => x.id === perdido.leadId ? { ...x, status: "perdido", etapa_id: perdido.etapaId, perdido_em: agora, etapa_desde: agora, motivo_perda_id: motivoId ?? null } : x))
          }
          setPerdido(null)
          router.refresh()
        }}
      />
      <EnviarFunilDialog
        alvo={enviar ? { leadId: enviar.id, titulo: enviar.titulo, funilAtualId: enviar.funil_id, vendedorId: enviar.vendedor_id } : null}
        funis={quadro.funis}
        usuarios={quadro.usuarios}
        onFechar={() => setEnviar(null)}
        onFeito={() => {
          if (enviar) setLeads(ls => ls.filter(x => x.id !== enviar.id))
          setEnviar(null)
          router.refresh()
        }}
      />
    </div>
  )
}

// ======================================================================

function CartaoLead({ l, quadro, nomeUsuario, arrastando, cartaoAlvo, onDragStart, onDragEnd, onDragOver, onAbrir, naFila, foraDeEtapa = false, onAssumir }: {
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
  foraDeEtapa?: boolean
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
    <article
      draggable
      onDragStart={e => { onDragStart(); e.dataTransfer.effectAllowed = "move" }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onClick={onAbrir}
      onKeyDown={e => { if (e.key === "Enter") onAbrir() }}
      tabIndex={0}
      aria-label={l.titulo}
      className={cn(
        "group relative cursor-pointer rounded-lg border bg-background p-3 shadow-xs outline-none transition-[border-color,box-shadow] hover:border-foreground/20 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[#d97021]/50",
        arrastando === l.id && "opacity-40",
        cartaoAlvo === l.id && arrastando && arrastando !== l.id && "border-t-2 border-t-[#d97021]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium leading-snug line-clamp-2">{l.titulo}</div>
          {l.cliente_nome && l.cliente_nome !== l.titulo && (
            <div className="truncate text-xs text-muted-foreground">{l.cliente_nome}</div>
          )}
        </div>
        <span title={nomeUsuario(l.vendedor_id)} aria-label={`Responsável: ${nomeUsuario(l.vendedor_id)}`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
          {iniciais(nomeUsuario(l.vendedor_id))}
        </span>
      </div>

      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className={cn("text-sm font-semibold tabular-nums", l.status === "ganho" && "text-emerald-700")}>
            {valor ? brl.format(valor) : <span className="text-xs font-normal text-muted-foreground">Sem valor</span>}
          </div>
          {(l.cidade || l.uf) && (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{[l.cidade, l.uf].filter(Boolean).join(" - ")}</span>
            </div>
          )}
        </div>
        {temCampos && l.status === "aberto" && (
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium" style={{ color: TEMPERATURA_INFO[t].cor }} title={`Score ${l.score}`}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TEMPERATURA_INFO[t].cor }} />{TEMPERATURA_INFO[t].rotulo}
          </span>
        )}
      </div>

      {(l.status === "aberto" || !!l.qtd_orcamentos || foraDeEtapa || (l.status === "perdido" && l.motivo_perda_id)) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2 text-[11px] text-muted-foreground">
          {l.status === "aberto" && (
            <span className={cn("inline-flex items-center gap-1", parado && "font-medium text-amber-700")} title="Dias nesta etapa">
              {parado ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}{dias}d
            </span>
          )}
          {l.proxima_acao_em && l.status === "aberto" && (
            <span className={cn("inline-flex items-center gap-1", contatoAtrasado && "font-medium text-red-600")} title={contatoAtrasado ? "Próximo contato atrasado" : "Próximo contato"}>
              <CalendarClock className="h-3 w-3" />{formatarData(l.proxima_acao_em).slice(0, 5)}
            </span>
          )}
          {!!l.tarefas_abertas && (
            <span className={cn("inline-flex items-center gap-1", l.tarefa_atrasada && "font-medium text-red-600")} title={l.tarefa_atrasada ? "Tarefa atrasada" : "Tarefas abertas"}>
              <ListTodo className="h-3 w-3" />{l.tarefas_abertas}
            </span>
          )}
          {!!l.qtd_orcamentos && (
            <span className="inline-flex items-center gap-1" title="Orçamentos">
              <FileText className="h-3 w-3" />{l.qtd_orcamentos}
            </span>
          )}
          {naFila && l.status === "aberto" && <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">na fila</span>}
          {foraDeEtapa && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-700" title="A etapa gravada não é deste funil. Arraste o cartão para a coluna certa.">sem etapa</span>
          )}
          {l.status === "perdido" && l.motivo_perda_id && (
            <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700">{quadro.motivos.find(m => m.id === l.motivo_perda_id)?.nome}</span>
          )}
          {onAssumir && (
            <button onClick={e => { e.stopPropagation(); onAssumir() }}
              className={cn("ml-auto rounded-md px-2 py-0.5 font-semibold transition-colors",
                naFila ? "bg-[#d97021] text-white hover:bg-[#c3631b]" : "text-[#d97021] opacity-0 hover:bg-orange-50 group-hover:opacity-100 focus:opacity-100")}>
              Assumir
            </button>
          )}
        </div>
      )}
    </article>
  )
}

// ======================================================================

type ClienteBusca = Awaited<ReturnType<typeof listarClientesParaLead>>[number]

function NovoLeadDialog({ aberto, onFechar, quadro, onCriado }: {
  aberto: boolean
  onFechar: () => void
  quadro: CrmQuadro
  onCriado: (lead: CrmLead, abrirFicha?: boolean) => void
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

  const salvar = async (abrirFicha = false) => {
    if (!quadro.funilAtual) return
    setSalvando(true)
    const r = await criarLead({ ...valores, cliente_id: cliente?.id || "", funil_id: quadro.funilAtual.id, etapa_id: etapaId, campos })
    setSalvando(false)
    if (!r.ok) return toast.error(r.erro)
    toast.success("Lead criado")
    onCriado(r.dados!.lead, abrirFicha)
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
          <Button variant="outline" onClick={() => salvar(true)} disabled={salvando || !valores.titulo.trim()}>
            Criar e abrir ficha
          </Button>
          <Button onClick={() => salvar(false)} disabled={salvando || !valores.titulo.trim()} className="bg-[#d97021] hover:bg-[#c3631b]">
            {salvando ? "Salvando..." : "Criar lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
