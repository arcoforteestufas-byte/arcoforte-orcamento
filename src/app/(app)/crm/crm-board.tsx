"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import {
  AlertTriangle, CalendarClock, CheckCircle2, FileText, ListTodo, MapPin, Plus, Search, Settings, XCircle,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { criarLead, marcarGanho, marcarPerdido, moverLead, obterFichaLead } from "@/app/actions/crm"
import type { CrmEtapa, CrmLead, CrmOrcamentoResumo, CrmQuadro } from "@/lib/crm-types"
import { LeadCampos, LEAD_VAZIO, type LeadFormValores } from "./lead-campos"
import { LeadFicha } from "./lead-ficha"
import { brl, brlCentavos, diasDesde, formatarData, inputClasse } from "./crm-utils"

function valorDoLead(l: CrmLead) {
  if (l.status === "ganho" && l.valor_fechado) return Number(l.valor_fechado)
  return Number(l.valor_estimado) || Number(l.maior_orcamento) || 0
}

function iniciais(nome: string) {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("")
}

export function CrmBoard({ quadro, leadInicial }: { quadro: CrmQuadro; leadInicial: string | null }) {
  const router = useRouter()
  const [leads, setLeads] = useState<CrmLead[]>(quadro.leads)
  useEffect(() => setLeads(quadro.leads), [quadro.leads])

  const [busca, setBusca] = useState("")
  const [vendedor, setVendedor] = useState("")
  const [periodoFechados, setPeriodoFechados] = useState("30")
  const [leadAberto, setLeadAberto] = useState<string | null>(leadInicial)
  const [novoAberto, setNovoAberto] = useState(false)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [colunaAlvo, setColunaAlvo] = useState<string | null>(null)
  const [cartaoAlvo, setCartaoAlvo] = useState<string | null>(null)
  const [ganho, setGanho] = useState<{ leadId: string; etapaId: string } | null>(null)
  const [perdido, setPerdido] = useState<{ leadId: string; etapaId: string } | null>(null)

  // Mantém ?lead= na barra de endereço para poder compartilhar o link do lead
  useEffect(() => {
    const url = new URL(window.location.href)
    if (leadAberto) url.searchParams.set("lead", leadAberto)
    else url.searchParams.delete("lead")
    window.history.replaceState(null, "", url.toString())
  }, [leadAberto])

  const nomeUsuario = (id: string) => quadro.usuarios.find(u => u.id === id)?.nome || "?"
  const etapaGanho = quadro.etapas.find(e => e.tipo === "ganho")
  const etapaPerdido = quadro.etapas.find(e => e.tipo === "perdido")
  const mostraFiltroVendedor = quadro.isAdmin || quadro.config.vendedor_ve_todos

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const limite = periodoFechados === "todos" ? 0 : Date.now() - Number(periodoFechados) * 86400000
    return leads.filter(l => {
      if (vendedor && l.vendedor_id !== vendedor) return false
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
  }, [leads, busca, vendedor, periodoFechados])

  const porEtapa = useMemo(() => {
    const m: Record<string, CrmLead[]> = {}
    for (const e of quadro.etapas) m[e.id] = []
    for (const l of filtrados) (m[l.etapa_id] ||= []).push(l)
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.ordem - b.ordem)
    return m
  }, [filtrados, quadro.etapas])

  const resumo = useMemo(() => {
    let aberto = 0, ponderado = 0, ganhos = 0, qtdGanhos = 0, qtdPerdidos = 0
    for (const l of filtrados) {
      const v = valorDoLead(l)
      if (l.status === "aberto") {
        aberto += v
        ponderado += v * ((quadro.etapas.find(e => e.id === l.etapa_id)?.probabilidade || 0) / 100)
      } else if (l.status === "ganho") { ganhos += v; qtdGanhos++ }
      else qtdPerdidos++
    }
    const conversao = qtdGanhos + qtdPerdidos ? Math.round((qtdGanhos / (qtdGanhos + qtdPerdidos)) * 100) : null
    return { aberto, ponderado, ganhos, qtdGanhos, conversao }
  }, [filtrados, quadro.etapas])

  // ------------------------------------------------------------------
  // Arrastar e soltar
  // ------------------------------------------------------------------
  const soltar = async (etapa: CrmEtapa) => {
    const id = arrastando
    const antesDe = cartaoAlvo
    setArrastando(null); setColunaAlvo(null); setCartaoAlvo(null)
    if (!id) return
    const lead = leads.find(l => l.id === id)
    if (!lead) return

    if (etapa.tipo === "ganho") { if (lead.etapa_id !== etapa.id) setGanho({ leadId: id, etapaId: etapa.id }); return }
    if (etapa.tipo === "perdido") { if (lead.etapa_id !== etapa.id) setPerdido({ leadId: id, etapaId: etapa.id }); return }

    // calcula a nova posição dentro da coluna
    const coluna = (porEtapa[etapa.id] || []).filter(l => l.id !== id)
    let ordem: number
    const idx = antesDe ? coluna.findIndex(l => l.id === antesDe) : -1
    if (idx === -1) ordem = coluna.length ? coluna[coluna.length - 1].ordem + 1000 : Date.now()
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

  // ------------------------------------------------------------------

  if (quadro.erro) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-amber-900">
        <h2 className="text-lg font-semibold mb-1">CRM indisponível</h2>
        <p>{quadro.erro}</p>
      </div>
    )
  }

  if (!quadro.funilAtual) {
    return (
      <div className="rounded-lg border p-8 text-center space-y-3">
        <p>Nenhum funil configurado.</p>
        {quadro.isAdmin && (
          <Link href="/admin/configuracoes?tab=crm" className={buttonVariants({ className: "bg-[#d97021] hover:bg-[#c3631b]" })}>
            Configurar CRM
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-7rem)]">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Funil de vendas</h2>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground mt-1">
            <span>Em aberto: <b className="text-foreground">{brl.format(resumo.aberto)}</b></span>
            <span title="Valor em aberto × probabilidade de cada etapa">Previsão: <b className="text-foreground">{brl.format(resumo.ponderado)}</b></span>
            <span>Ganhos no período: <b className="text-emerald-700">{brl.format(resumo.ganhos)}</b> ({resumo.qtdGanhos})</span>
            {resumo.conversao !== null && <span>Conversão: <b className="text-foreground">{resumo.conversao}%</b></span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {quadro.funis.length > 1 && (
            <select className={`${inputClasse} w-auto`} value={quadro.funilAtual.id}
              onChange={e => router.push(`/crm?funil=${e.target.value}`)}>
              {quadro.funis.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input className={`${inputClasse} pl-8 w-52`} placeholder="Buscar lead, cidade..." value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          {mostraFiltroVendedor && (
            <select className={`${inputClasse} w-auto`} value={vendedor} onChange={e => setVendedor(e.target.value)}>
              <option value="">Todos os vendedores</option>
              {quadro.usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          )}
          <select className={`${inputClasse} w-auto`} value={periodoFechados} onChange={e => setPeriodoFechados(e.target.value)} title="Quais ganhos/perdidos aparecer">
            <option value="30">Fechados: 30 dias</option>
            <option value="90">Fechados: 90 dias</option>
            <option value="365">Fechados: 12 meses</option>
            <option value="todos">Fechados: todos</option>
          </select>
          {quadro.isAdmin && (
            <Link href="/admin/configuracoes?tab=crm" title="Configurar funis e etapas" className={buttonVariants({ variant: "outline", size: "icon" })}>
              <Settings className="h-4 w-4" />
            </Link>
          )}
          <Button className="gap-1 bg-[#d97021] hover:bg-[#c3631b]" onClick={() => setNovoAberto(true)}>
            <Plus className="h-4 w-4" /> Novo lead
          </Button>
        </div>
      </div>

      {/* Quadro */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2">
        <div className="flex gap-3 h-full min-w-max">
          {quadro.etapas.map(etapa => {
            const cards = porEtapa[etapa.id] || []
            const total = cards.reduce((s, l) => s + valorDoLead(l), 0)
            const ativa = colunaAlvo === etapa.id
            return (
              <div
                key={etapa.id}
                className={`w-72 shrink-0 flex flex-col rounded-lg border bg-muted/40 transition-colors ${ativa ? "ring-2 ring-[#d97021] bg-orange-50/60" : ""}`}
                onDragOver={e => { e.preventDefault(); if (colunaAlvo !== etapa.id) setColunaAlvo(etapa.id) }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { setColunaAlvo(null); setCartaoAlvo(null) } }}
                onDrop={e => { e.preventDefault(); soltar(etapa) }}
              >
                <div className="p-3 border-b bg-background/60 rounded-t-lg" style={{ borderTop: `3px solid ${etapa.cor}` }}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm flex items-center gap-1.5">
                      {etapa.tipo === "ganho" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                      {etapa.tipo === "perdido" && <XCircle className="h-4 w-4 text-red-600" />}
                      {etapa.nome}
                    </span>
                    <span className="text-xs rounded-full bg-muted px-2 py-0.5">{cards.length}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {brl.format(total)}{etapa.tipo === "aberta" && etapa.probabilidade ? ` · ${etapa.probabilidade}%` : ""}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {cards.map(l => {
                    const dias = diasDesde(l.etapa_desde)
                    const parado = l.status === "aberto" && dias >= quadro.config.dias_alerta_parado
                    const hoje = new Date().toISOString().slice(0, 10)
                    const contatoAtrasado = l.status === "aberto" && l.proxima_acao_em && l.proxima_acao_em < hoje
                    const valor = valorDoLead(l)
                    return (
                      <div
                        key={l.id}
                        draggable
                        onDragStart={e => { setArrastando(l.id); e.dataTransfer.effectAllowed = "move" }}
                        onDragEnd={() => { setArrastando(null); setColunaAlvo(null); setCartaoAlvo(null) }}
                        onDragOver={() => { if (cartaoAlvo !== l.id) setCartaoAlvo(l.id) }}
                        onClick={() => setLeadAberto(l.id)}
                        className={`group rounded-md border bg-background p-3 shadow-sm cursor-pointer hover:shadow-md hover:border-[#d97021]/50 transition-all
                          ${arrastando === l.id ? "opacity-40" : ""}
                          ${cartaoAlvo === l.id && arrastando && arrastando !== l.id ? "border-t-4 border-t-[#d97021]" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-sm leading-snug">{l.titulo}</span>
                          <span title={nomeUsuario(l.vendedor_id)} className="shrink-0 h-6 w-6 rounded-full bg-[#d97021]/15 text-[#a8541a] text-[10px] font-bold flex items-center justify-center">
                            {iniciais(nomeUsuario(l.vendedor_id))}
                          </span>
                        </div>
                        {(l.cidade || l.uf) && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" /> {[l.cidade, l.uf].filter(Boolean).join(" - ")}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-sm font-semibold ${l.status === "ganho" ? "text-emerald-700" : ""}`}>
                            {valor ? brl.format(valor) : <span className="text-muted-foreground font-normal text-xs">sem valor</span>}
                          </span>
                          {l.area_m2 ? <span className="text-xs text-muted-foreground">{Number(l.area_m2).toLocaleString("pt-BR")} m²</span> : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px]">
                          {l.status === "aberto" && (
                            <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 ${parado ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground"}`}
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
                            <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 ${l.tarefa_atrasada ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"}`} title="Tarefas abertas">
                              <ListTodo className="h-3 w-3" />{l.tarefas_abertas}
                            </span>
                          )}
                          {l.proxima_acao_em && l.status === "aberto" && (
                            <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 ${contatoAtrasado ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"}`} title="Próximo contato">
                              <CalendarClock className="h-3 w-3" />{formatarData(l.proxima_acao_em).slice(0, 5)}
                            </span>
                          )}
                          {l.status === "perdido" && l.motivo_perda_id && (
                            <span className="rounded bg-red-50 text-red-700 px-1.5 py-0.5">{quadro.motivos.find(m => m.id === l.motivo_perda_id)?.nome}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {cards.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-6 border-2 border-dashed rounded-md">
                      {etapa.tipo === "aberta" ? "Arraste leads para cá" : etapa.tipo === "ganho" ? "Solte aqui para ganhar" : "Solte aqui para perder"}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <NovoLeadDialog
        aberto={novoAberto}
        onFechar={() => setNovoAberto(false)}
        quadro={quadro}
        onCriado={(id) => { setNovoAberto(false); router.refresh(); setLeadAberto(id) }}
      />

      <LeadFicha
        leadId={leadAberto}
        quadro={quadro}
        onFechar={() => setLeadAberto(null)}
        onGanho={(id) => etapaGanho ? setGanho({ leadId: id, etapaId: etapaGanho.id }) : toast.error("Este funil não tem etapa de Ganho.")}
        onPerdido={(id) => etapaPerdido ? setPerdido({ leadId: id, etapaId: etapaPerdido.id }) : toast.error("Este funil não tem etapa de Perdido.")}
      />

      <GanhoDialog
        alvo={ganho}
        onFechar={() => setGanho(null)}
        onFeito={() => { setGanho(null); setLeadAberto(null); router.refresh() }}
      />

      <PerdidoDialog
        alvo={perdido}
        quadro={quadro}
        onFechar={() => setPerdido(null)}
        onFeito={() => { setPerdido(null); setLeadAberto(null); router.refresh() }}
      />
    </div>
  )
}

// ======================================================================

function NovoLeadDialog({ aberto, onFechar, quadro, onCriado }: {
  aberto: boolean
  onFechar: () => void
  quadro: CrmQuadro
  onCriado: (id: string) => void
}) {
  const [valores, setValores] = useState<LeadFormValores>({ ...LEAD_VAZIO, vendedor_id: quadro.userId })
  const [etapaId, setEtapaId] = useState("")
  const [salvando, setSalvando] = useState(false)
  const abertas = quadro.etapas.filter(e => e.tipo === "aberta")

  useEffect(() => {
    if (aberto) {
      setValores({ ...LEAD_VAZIO, vendedor_id: quadro.userId })
      setEtapaId(abertas[0]?.id || "")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  const salvar = async () => {
    if (!quadro.funilAtual) return
    setSalvando(true)
    const r = await criarLead({ ...valores, funil_id: quadro.funilAtual.id, etapa_id: etapaId })
    setSalvando(false)
    if (!r.ok) return toast.error(r.erro)
    toast.success("Lead criado")
    onCriado(r.dados!.id)
  }

  return (
    <Dialog open={aberto} onOpenChange={o => { if (!o) onFechar() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Novo lead</DialogTitle></DialogHeader>
        <div className="grid gap-1.5 mb-1">
          <Label>Etapa</Label>
          <select className={inputClasse} value={etapaId} onChange={e => setEtapaId(e.target.value)}>
            {abertas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
        <LeadCampos valores={valores} onChange={setValores} origens={quadro.origens} usuarios={quadro.usuarios} podeTrocarVendedor={quadro.isAdmin} />
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

function GanhoDialog({ alvo, onFechar, onFeito }: {
  alvo: { leadId: string; etapaId: string } | null
  onFechar: () => void
  onFeito: () => void
}) {
  const [orcamentos, setOrcamentos] = useState<CrmOrcamentoResumo[] | null>(null)
  const [titulo, setTitulo] = useState("")
  const [escolhido, setEscolhido] = useState("")
  const [valor, setValor] = useState("")
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!alvo) return
    setOrcamentos(null); setEscolhido(""); setValor("")
    obterFichaLead(alvo.leadId).then(r => {
      if (!r.ok) { toast.error(r.erro); return onFechar() }
      const orcs = r.dados!.orcamentos.filter(o => o.status !== "Perdido")
      setTitulo(r.dados!.lead.titulo)
      setOrcamentos(orcs)
      if (orcs.length === 1) setEscolhido(orcs[0].id)
      else if (!orcs.length) setValor(r.dados!.lead.valor_estimado ? String(r.dados!.lead.valor_estimado) : "")
    })
  }, [alvo, onFechar])

  const confirmar = async () => {
    if (!alvo) return
    setSalvando(true)
    const v = valor ? Number(valor.replace(/\./g, "").replace(",", ".")) : null
    const r = await marcarGanho(alvo.leadId, alvo.etapaId, escolhido || null, escolhido ? null : v)
    setSalvando(false)
    if (!r.ok) return toast.error(r.erro)
    toast.success("Venda ganha! 🎉")
    onFeito()
  }

  return (
    <Dialog open={!!alvo} onOpenChange={o => { if (!o) onFechar() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="text-emerald-600" /> Marcar como ganho</DialogTitle></DialogHeader>
        {!orcamentos ? <p className="text-sm text-muted-foreground py-4">Carregando...</p> : (
          <div className="space-y-3">
            <p className="text-sm"><b>{titulo}</b></p>
            {orcamentos.length > 0 ? (
              <>
                <Label>Qual orçamento foi fechado?</Label>
                <div className="space-y-2">
                  {orcamentos.map(o => (
                    <label key={o.id} className={`flex items-center gap-3 rounded-md border p-3 text-sm cursor-pointer ${escolhido === o.id ? "border-emerald-600 bg-emerald-50" : ""}`}>
                      <input type="radio" name="orc" checked={escolhido === o.id} onChange={() => setEscolhido(o.id)} className="accent-emerald-600" />
                      <span className="flex-1">{o.numero_pedido || o.id.slice(0, 8).toUpperCase()} · {formatarData(o.criado_em)} · {o.status}</span>
                      <b>{brlCentavos.format(o.valor_total)}</b>
                    </label>
                  ))}
                  <label className={`flex items-center gap-3 rounded-md border p-3 text-sm cursor-pointer ${escolhido === "" ? "border-emerald-600 bg-emerald-50" : ""}`}>
                    <input type="radio" name="orc" checked={escolhido === ""} onChange={() => setEscolhido("")} className="accent-emerald-600" />
                    Fechou sem um destes orçamentos
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">O orçamento escolhido passa para o status <b>Aprovado</b>.</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Este lead não tem orçamento ligado.</p>
            )}
            {escolhido === "" && (
              <div className="grid gap-1.5">
                <Label>Valor fechado (R$)</Label>
                <input className={inputClasse} inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} />
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={confirmar} disabled={salvando || !orcamentos} className="bg-emerald-600 hover:bg-emerald-700">
            {salvando ? "Salvando..." : "Confirmar ganho"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PerdidoDialog({ alvo, quadro, onFechar, onFeito }: {
  alvo: { leadId: string; etapaId: string } | null
  quadro: CrmQuadro
  onFechar: () => void
  onFeito: () => void
}) {
  const [motivo, setMotivo] = useState("")
  const [obs, setObs] = useState("")
  const [perderOrcs, setPerderOrcs] = useState(true)
  const [salvando, setSalvando] = useState(false)
  useEffect(() => { if (alvo) { setMotivo(""); setObs(""); setPerderOrcs(true) } }, [alvo])
  const obrigatorio = quadro.config.motivo_perda_obrigatorio

  const confirmar = async () => {
    if (!alvo) return
    setSalvando(true)
    const r = await marcarPerdido(alvo.leadId, alvo.etapaId, motivo || null, obs, perderOrcs)
    setSalvando(false)
    if (!r.ok) return toast.error(r.erro)
    toast("Lead marcado como perdido")
    onFeito()
  }

  return (
    <Dialog open={!!alvo} onOpenChange={o => { if (!o) onFechar() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><XCircle className="text-red-600" /> Marcar como perdido</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Motivo da perda{obrigatorio ? " *" : ""}</Label>
            <select className={inputClasse} value={motivo} onChange={e => setMotivo(e.target.value)}>
              <option value="">Escolha...</option>
              {quadro.motivos.filter(m => m.ativo).map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>Detalhes (opcional)</Label>
            <Textarea rows={2} value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex.: fechou com concorrente por R$ 10 mil a menos" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={perderOrcs} onChange={e => setPerderOrcs(e.target.checked)} className="accent-red-600" />
            Marcar os orçamentos em aberto deste lead como Perdido
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button variant="destructive" onClick={confirmar} disabled={salvando || (obrigatorio && !motivo)}>
            {salvando ? "Salvando..." : "Confirmar perda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
