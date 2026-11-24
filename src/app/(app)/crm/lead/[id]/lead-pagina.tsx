"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft, CalendarClock, Check, CheckCircle2, ChevronRight, ClipboardList, FileSignature, FileText,
  Link2, ListTodo, MapPin, MessageCircle, Phone, Plus, Save, Send, Trash2, Truck, Unlink, UserRound, X, XCircle,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  adicionarAtividade, alternarTarefa, assumirLead, atualizarLead, criarTarefa, definirOrcamentoFechado, desvincularOrcamento, excluirAtividade,
  excluirLead, excluirTarefa, listarOrcamentosSemLead, moverLead, vincularOrcamento,
} from "@/app/actions/crm"
import { TIPOS_ATIVIDADE, hojeISO, type CrmFichaLead, type CrmOrcamentoResumo, type CrmQuadro } from "@/lib/crm-types"
import { LeadCampos, leadParaValores, type LeadFormValores } from "../../lead-campos"
import { CamposQualificacao, ScoreBadge } from "../../crm-score"
import { EnviarFunilDialog, GanhoDialog, PerdidoDialog, type AlvoEtapa } from "../../crm-dialogs"
import { ClienteDoLead, type ModoCliente } from "../../cliente-do-lead"
import { CalculadoraFrete } from "../../../entregas/calculadora-frete"
import { STATUS_ENTREGA, formatarKm, posicaoRecente, type EntregaDoLead, type PrazoAlteracao } from "@/lib/entregas-types"
import { PrazoContrato } from "../../prazo-contrato"
import { EntregasNaRegiao } from "../../entregas-na-regiao"
import { brlCentavos, dataHora, diasDesde, formatarData, iniciais, inputClasse, linkWhatsApp, validarDataOpcional } from "../../crm-utils"

const ROTULO_ATIVIDADE: Record<string, string> = {
  nota: "Nota", ligacao: "Ligação", whatsapp: "WhatsApp", visita: "Visita", email: "E-mail",
  etapa: "Etapa", orcamento: "Orçamento", ganho: "Ganho", perdido: "Perdido", sistema: "Sistema",
}

const COR_STATUS_ORC: Record<string, string> = {
  Aprovado: "bg-emerald-600 text-white",
  Enviado: "bg-blue-500 text-white",
  Rascunho: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200",
  Perdido: "bg-red-600 text-white",
}

function Cartao({ titulo, icone, acoes, children, className = "" }: {
  titulo: string
  icone?: React.ReactNode
  acoes?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-xl border bg-background shadow-sm ${className}`}>
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">{icone}{titulo}</h3>
        {acoes}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

type FreteProximo = { id: string; titulo: string | null; saida_prevista: string; cidades: string[] }

export function LeadPagina({ ficha, quadro, orcamentoSalvoId = null, fretes = [], entregas = [], historicoPrazos = [] }: {
  ficha: CrmFichaLead; quadro: CrmQuadro; orcamentoSalvoId?: string | null; fretes?: FreteProximo[]; entregas?: EntregaDoLead[]
  historicoPrazos?: PrazoAlteracao[]
}) {
  const router = useRouter()
  const { lead, cliente, orcamentos, atividades, tarefas, podeEditar } = ficha
  const funil = quadro.funis.find(f => f.id === lead.funil_id)
  const etapas = quadro.etapas.filter(e => e.funil_id === lead.funil_id)
  const etapa = etapas.find(e => e.id === lead.etapa_id)
  const etapasAbertas = etapas.filter(e => e.tipo === "aberta")
  // Ganho só no funil de vendas
  const etapaGanho = funil?.permite_ganho ? etapas.find(e => e.tipo === "ganho") : undefined
  const etapaPerdido = etapas.find(e => e.tipo === "perdido")
  const nomeUsuario = (id: string | null) => quadro.usuarios.find(u => u.id === id)?.nome || "—"
  const whats = linkWhatsApp(lead.telefone)
  const equipe = funil?.usuarios || []
  const podeAssumir = (quadro.liberadoVerTodos || (!quadro.restrito && !!funil?.membros_veem_todos)) && lead.status === "aberto" && lead.vendedor_id !== quadro.userId
    && (equipe.includes(quadro.userId) || (!equipe.length && !quadro.isAdmin))

  // Formulários (voltam ao valor salvo quando o lead muda no servidor)
  const chaveSalva = JSON.stringify([lead.atualizado_em, lead.campos])
  const [valores, setValores] = useState<LeadFormValores>(() => leadParaValores(lead as unknown as Record<string, unknown>))
  const [campos, setCampos] = useState<Record<string, unknown>>(lead.campos || {})
  useEffect(() => {
    setValores(leadParaValores(lead as unknown as Record<string, unknown>))
    setCampos(lead.campos || {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveSalva])
  const dadosMudaram = JSON.stringify(valores) !== JSON.stringify(leadParaValores(lead as unknown as Record<string, unknown>))
  const camposMudaram = JSON.stringify(campos) !== JSON.stringify(lead.campos || {})

  const [salvando, setSalvando] = useState<"" | "dados" | "campos">("")
  const [ganho, setGanho] = useState<AlvoEtapa>(null)
  const [perdido, setPerdido] = useState<AlvoEtapa>(null)
  const [enviar, setEnviar] = useState(false)
  const [modoCliente, setModoCliente] = useState<ModoCliente>(null)
  const [precisaCliente, setPrecisaCliente] = useState(false)
  const [irParaOrcamento, setIrParaOrcamento] = useState(false)

  const atualizar = () => router.refresh()

  const salvar = async (qual: "dados" | "campos") => {
    setSalvando(qual)
    const r = await atualizarLead(lead.id, qual === "dados" ? valores : { campos })
    setSalvando("")
    if (!r.ok) return toast.error(r.erro)
    toast.success(qual === "dados" ? "Dados salvos" : "Qualificação salva")
    atualizar()
  }

  const moverPara = async (etapaId: string) => {
    if (!podeEditar || etapaId === lead.etapa_id) return
    const r = await moverLead(lead.id, etapaId, Date.now())
    if (!r.ok) return toast.error(r.erro)
    atualizar()
  }

  const abrirOrcamentoNovo = (clienteId: string) => {
    router.push(`/orcamentos/novo?lead=${lead.id}&cliente=${clienteId}`)
  }

  const novoOrcamento = () => {
    if (cliente) return abrirOrcamentoNovo(cliente.id)
    setIrParaOrcamento(true)
    setPrecisaCliente(true)
  }

  // venda fechada: o valor é sempre a soma dos orçamentos aprovados
  const aprovados = orcamentos.filter(o => o.status === "Aprovado")
  const valor = lead.status === "ganho"
    ? (aprovados.length ? aprovados.reduce((s, o) => s + (Number(o.valor_total) || 0), 0) : Number(lead.valor_fechado) || 0)
    : Number(lead.valor_estimado) || Math.max(0, ...orcamentos.map(o => o.valor_total))

  // prazo de entrega contratual: quanto falta (ou se já foi entregue)
  const entregue = entregas.find(en => en.status === "entregue")
  const prazoInfo = (() => {
    if (!lead.prazo_entrega) return null
    const br = lead.prazo_entrega.split("-").reverse().join("/")
    if (entregue?.entregue_em) {
      const dia = entregue.entregue_em.slice(0, 10)
      const atraso = Math.round((new Date(dia + "T12:00:00").getTime() - new Date(lead.prazo_entrega + "T12:00:00").getTime()) / 86400000)
      return atraso > 0
        ? { texto: `Entregue com ${atraso} dia(s) de atraso (prazo ${br})`, classe: "bg-red-600 text-white" }
        : { texto: `Entregue no prazo (${br})`, classe: "bg-emerald-600 text-white" }
    }
    const falta = Math.round((new Date(lead.prazo_entrega + "T12:00:00").getTime() - new Date(hojeISO() + "T12:00:00").getTime()) / 86400000)
    if (lead.status !== "ganho") return { texto: `Prazo de entrega: ${br}`, classe: "bg-muted text-foreground" }
    if (falta < 0) return { texto: `Entrega ATRASADA ${-falta} dia(s) — prazo era ${br}`, classe: "bg-red-600 text-white" }
    if (falta === 0) return { texto: `Entrega vence HOJE (${br})`, classe: "bg-red-600 text-white" }
    if (falta <= 7) return { texto: `Entregar até ${br} · faltam ${falta} dia(s)`, classe: "bg-amber-500 text-white" }
    return { texto: `Entregar até ${br} · faltam ${falta} dias`, classe: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200" }
  })()

  // Orçamento mais recente (fora os perdidos): sugere usar o valor dele no negócio
  const orcRecente = orcamentos.find(o => o.status !== "Perdido")
  const sugerirValor = podeEditar && lead.status === "aberto" && !!orcRecente && orcRecente.valor_total > 0
    && Math.abs(orcRecente.valor_total - Number(lead.valor_estimado || 0)) >= 0.01
  const [usandoValor, setUsandoValor] = useState(false)
  const usarValorDoOrcamento = async () => {
    if (!orcRecente) return
    setUsandoValor(true)
    const r = await atualizarLead(lead.id, { valor_estimado: orcRecente.valor_total.toFixed(2).replace(".", ",") })
    setUsandoValor(false)
    if (!r.ok) return toast.error(r.erro)
    toast.success("Valor do negócio atualizado")
    atualizar()
  }

  // Faixa de confirmação depois de salvar um orçamento a partir do lead
  const orcSalvo = orcamentoSalvoId ? orcamentos.find(o => o.id === orcamentoSalvoId) : null
  const [mostrarSalvo, setMostrarSalvo] = useState(!!orcamentoSalvoId)
  const fecharSalvo = () => {
    setMostrarSalvo(false)
    router.replace(`/crm/lead/${lead.id}`, { scroll: false })
  }

  return (
    <div className="flex flex-col gap-5 pb-12">
      {lead.status === "aberto" && fretes.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 shadow-sm">
          <Truck className="h-5 w-5 shrink-0 text-blue-600" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold">Aproveite o frete: tem caminhão indo para {lead.uf}</div>
            <div className="text-xs text-blue-800">
              {fretes.map(f => `${formatarData(f.saida_prevista)} → ${f.cidades.slice(0, 3).join(", ")}${f.cidades.length > 3 ? "…" : ""}`).join(" · ")}
            </div>
          </div>
          <Link href="/entregas?aba=rotas" className="text-xs font-semibold text-blue-700 hover:underline">ver rotas</Link>
        </div>
      )}
      {mostrarSalvo && orcamentoSalvoId && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold">
              Orçamento salvo{orcSalvo ? ` — ${orcSalvo.numero_pedido || `#${orcSalvo.id.slice(0, 8).toUpperCase()}`} · ${brlCentavos.format(orcSalvo.valor_total)}` : ""}
            </div>
            <div className="text-xs text-emerald-800">
              Ele já está ligado a este lead.
              {orcSalvo && Number(lead.valor_estimado) === Math.round(orcSalvo.valor_total * 100) / 100 ? " O valor do negócio foi atualizado com o valor dele." : ""}
            </div>
          </div>
          <Link href={`/orcamentos/${orcamentoSalvoId}`} className={buttonVariants({ size: "sm", className: "bg-emerald-600 hover:bg-emerald-700 gap-1" })}>
            <FileText className="h-4 w-4" /> Abrir orçamento
          </Link>
          <button onClick={fecharSalvo} className="text-emerald-700 hover:text-emerald-900" title="Fechar"><X className="h-4 w-4" /></button>
        </div>
      )}
      {/* ------------------------------------------------ Cabeçalho */}
      <div className="rounded-2xl border bg-background shadow-sm overflow-hidden">
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${funil?.cor || "#d97021"}, ${etapa?.cor || "#d97021"})` }} />
        <div className="p-5 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Link href={quadro.ehLogistica ? "/entregas?aba=vendas" : `/crm?funil=${lead.funil_id}`} className={buttonVariants({ variant: "outline", size: "icon", className: "shrink-0 mt-1" })} title={quadro.ehLogistica ? "Voltar às entregas" : "Voltar ao funil"}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {funil && (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium text-white" style={{ backgroundColor: funil.cor }}>
                    {funil.nome}
                  </span>
                )}
                {etapa && <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 font-medium">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: etapa.cor }} />{etapa.nome}
                </span>}
                <ScoreBadge score={lead.score} config={quadro.config} />
                {prazoInfo && <span className={`rounded-full px-2.5 py-0.5 font-medium ${prazoInfo.classe}`} title="Prazo de entrega contratual">{prazoInfo.texto}</span>}
                {lead.status === "ganho" && <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 font-medium text-white">Ganho</span>}
                {lead.status === "perdido" && <span className="rounded-full bg-red-600 px-2.5 py-0.5 font-medium text-white">Perdido</span>}
              </div>
              <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight break-words">{lead.titulo}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#d97021]/15 text-[9px] font-bold text-[#a8541a]">{iniciais(nomeUsuario(lead.vendedor_id))}</span>
                  {nomeUsuario(lead.vendedor_id)}
                </span>
                {(lead.cidade || lead.uf) && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[lead.cidade, lead.uf].filter(Boolean).join(" - ")}</span>}
                {lead.telefone && <a href={`tel:${lead.telefone}`} className="inline-flex items-center gap-1 hover:text-foreground"><Phone className="h-3.5 w-3.5" />{lead.telefone}</a>}
                {whats && <a href={whats} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:underline"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a>}
                <span>{diasDesde(lead.etapa_desde)}d nesta etapa</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
            <div className="text-left lg:text-right">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{lead.status === "ganho" ? "Valor fechado" : "Valor do negócio"}</div>
              <div className={`text-2xl font-bold ${lead.status === "ganho" ? "text-emerald-700" : ""}`}>{valor ? brlCentavos.format(valor) : "—"}</div>
              {sugerirValor && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs lg:justify-end">
                  <span className="text-muted-foreground">Último orçamento: <b className="text-foreground">{brlCentavos.format(orcRecente!.valor_total)}</b></span>
                  <button disabled={usandoValor} onClick={usarValorDoOrcamento}
                    className="rounded-md bg-orange-50 px-2 py-0.5 font-medium text-[#a8541a] ring-1 ring-inset ring-orange-200 hover:bg-orange-100 disabled:opacity-50">
                    {usandoValor ? "Atualizando..." : "Usar este valor"}
                  </button>
                </div>
              )}
            </div>
            {lead.status === "ganho" && (
              <Link href={`/entregas?lead=${lead.id}`} className={buttonVariants({ className: "gap-1 bg-emerald-600 hover:bg-emerald-700" })}>
                <Truck className="h-4 w-4" /> Programar entrega
              </Link>
            )}
            {podeAssumir && (
              <Button className="gap-1 bg-[#d97021] hover:bg-[#c3631b]" onClick={async () => {
                const r = await assumirLead(lead.id)
                if (!r.ok) return toast.error(r.erro)
                toast.success("Agora o lead é seu")
                atualizar()
              }}>
                <UserRound className="h-4 w-4" /> Assumir lead
              </Button>
            )}
            {podeEditar && (
              <div className="flex flex-wrap gap-2">
                {quadro.funis.length > 1 && (
                  <Button variant="outline" className="gap-1" onClick={() => setEnviar(true)}>
                    <Send className="h-4 w-4" /> Enviar para funil
                  </Button>
                )}
                {lead.status === "aberto" && !funil?.permite_ganho && (
                  <span className="self-center text-xs text-muted-foreground" title="Só o funil de vendas permite marcar Ganho">
                    Ganho só no funil de vendas
                  </span>
                )}
                {lead.status === "aberto" && etapaGanho && (
                  <Button className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => setGanho({ leadId: lead.id, etapaId: etapaGanho.id })}>
                    <CheckCircle2 className="h-4 w-4" /> Ganho
                  </Button>
                )}
                {lead.status === "aberto" && etapaPerdido && (
                  <Button variant="outline" className="gap-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setPerdido({ leadId: lead.id, etapaId: etapaPerdido.id })}>
                    <XCircle className="h-4 w-4" /> Perdido
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Etapas do funil */}
        {etapasAbertas.length > 0 && (
          <div className="border-t bg-muted/30 px-5 py-3 overflow-x-auto">
            <ol className="flex items-center gap-1 min-w-max">
              {etapasAbertas.map((e, i) => {
                const idxAtual = etapasAbertas.findIndex(x => x.id === lead.etapa_id)
                const feita = lead.status === "aberto" ? i < idxAtual : lead.status === "ganho"
                const atual = e.id === lead.etapa_id
                return (
                  <li key={e.id} className="flex items-center gap-1">
                    <button disabled={!podeEditar} onClick={() => moverPara(e.id)}
                      title={podeEditar ? `Mover para "${e.nome}"` : e.nome}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${atual
                        ? "text-white shadow-sm"
                        : feita ? "bg-background text-foreground ring-1 ring-inset ring-border" : "text-muted-foreground hover:bg-background"}`}
                      style={atual ? { backgroundColor: e.cor } : undefined}>
                      {feita && !atual ? <Check className="h-3 w-3" style={{ color: e.cor }} /> : <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: atual ? "#fff" : e.cor }} />}
                      {e.nome}
                    </button>
                    {i < etapasAbertas.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
                  </li>
                )
              })}
            </ol>
          </div>
        )}
        {lead.status === "perdido" && (
          <div className="border-t bg-red-50 px-5 py-2.5 text-sm text-red-800">
            Perdido em {formatarData(lead.perdido_em)} — {quadro.motivos.find(m => m.id === lead.motivo_perda_id)?.nome || "sem motivo"}
            {lead.motivo_perda_obs ? `: ${lead.motivo_perda_obs}` : ""}
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ------------------------------------------------ Coluna principal */}
        <div className="lg:col-span-2 space-y-5">
          <Cartao titulo="Negócio: orçamento → proposta → contrato" icone={<FileText className="h-4 w-4 text-[#d97021]" />}
            acoes={podeEditar && (
              <div className="flex gap-1.5">
                <LigarOrcamento leadId={lead.id} clienteId={lead.cliente_id} onLigado={atualizar} />
                <Button size="sm" className="gap-1 bg-[#d97021] hover:bg-[#c3631b]" onClick={novoOrcamento}>
                  <Plus className="h-4 w-4" /> Novo orçamento
                </Button>
              </div>
            )}>
            {orcamentos.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed p-8 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm font-medium">Nenhum orçamento ainda</p>
                <p className="text-xs text-muted-foreground">Crie o orçamento daqui: ele já fica ligado a este lead e ao cliente.</p>
                {podeEditar && (
                  <Button className="mt-3 gap-1 bg-[#d97021] hover:bg-[#c3631b]" onClick={novoOrcamento}>
                    <Plus className="h-4 w-4" /> Fazer orçamento
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {orcamentos.map(o => (
                  <OrcamentoFluxo key={o.id} o={o} podeEditar={podeEditar}
                    fechado={lead.status === "ganho" && o.status === "Aprovado"}
                    onFechado={lead.status === "ganho" && podeEditar ? async (sim) => {
                      const r = await definirOrcamentoFechado(lead.id, o.id, sim)
                      if (!r.ok) return toast.error(r.erro)
                      toast.success(sim ? "Orçamento marcado como fechado" : "Orçamento desmarcado")
                      atualizar()
                    } : undefined}
                    onDesligar={async () => {
                      if (!confirm("Desligar este orçamento do lead? O orçamento não é apagado.")) return
                      const r = await desvincularOrcamento(lead.id, o.id)
                      if (!r.ok) return toast.error(r.erro)
                      atualizar()
                    }} />
                ))}
              </div>
            )}
          </Cartao>

          <Cartao titulo="Entregas na região" icone={<MapPin className="h-4 w-4 text-[#d97021]" />}>
            <EntregasNaRegiao leadId={lead.id} cidade={lead.cidade} uf={lead.uf} />
          </Cartao>

          <Cartao titulo="Entrega e frete" icone={<Truck className="h-4 w-4 text-[#d97021]" />}
            acoes={lead.status === "ganho" && (
              <Link href={`/entregas?lead=${lead.id}`} className={buttonVariants({ size: "sm", className: "gap-1 bg-emerald-600 hover:bg-emerald-700" })}>
                <Truck className="h-3.5 w-3.5" /> Programar entrega
              </Link>
            )}>
            <div className="space-y-5">
              {entregas.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entregas deste cliente</div>
                  {entregas.map(en => <LinhaEntrega key={en.id} en={en} />)}
                </div>
              )}
              {(
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Calcular frete</div>
                  <CalculadoraFrete
                    uf={lead.uf} cidade={lead.cidade} leadId={lead.id}
                    orcamentos={!podeEditar ? [] : orcamentos.filter(o => o.status !== "Perdido").map(o => ({
                      id: o.id, frete: o.frete,
                      rotulo: `${o.numero_pedido || "#" + o.id.slice(0, 8).toUpperCase()} · ${brlCentavos.format(o.valor_total)}${o.frete ? ` · frete ${brlCentavos.format(o.frete)}` : " · sem frete"}`,
                    }))}
                    viagemDisponivel={fretes.length ? fretes.map(f => `saída ${formatarData(f.saida_prevista)} → ${f.cidades.slice(0, 3).join(", ")}`).join(" · ") : null}
                    onAplicado={atualizar} />
                </div>
              )}
            </div>
          </Cartao>

          <Cartao titulo="Qualificação do lead" icone={<ClipboardList className="h-4 w-4 text-[#d97021]" />}
            acoes={podeEditar && camposMudaram && (
              <Button size="sm" className="gap-1 bg-[#d97021] hover:bg-[#c3631b]" disabled={salvando === "campos"} onClick={() => salvar("campos")}>
                <Save className="h-3.5 w-3.5" /> {salvando === "campos" ? "Salvando..." : "Salvar qualificação"}
              </Button>
            )}>
            <CamposQualificacao campos={quadro.campos} funilId={lead.funil_id} valores={campos} onChange={setCampos}
              config={quadro.config} desabilitado={!podeEditar} />
          </Cartao>

          <Cartao titulo="Dados do lead" icone={<UserRound className="h-4 w-4 text-[#d97021]" />}
            acoes={podeEditar && dadosMudaram && (
              <Button size="sm" className="gap-1 bg-[#d97021] hover:bg-[#c3631b]" disabled={salvando === "dados"} onClick={() => salvar("dados")}>
                <Save className="h-3.5 w-3.5" /> {salvando === "dados" ? "Salvando..." : "Salvar dados"}
              </Button>
            )}>
            <fieldset disabled={!podeEditar}>
              <LeadCampos valores={valores} onChange={setValores} origens={quadro.origens} usuarios={quadro.usuarios} podeTrocarVendedor={quadro.isAdmin}
                prazoTravado={lead.status === "ganho"} />
            </fieldset>
            <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>Criado em {dataHora.format(new Date(lead.criado_em))}</span>
              {quadro.isAdmin && (
                <Button variant="ghost" size="sm" className="text-red-600 gap-1" onClick={async () => {
                  if (!confirm("Excluir este lead e todo o histórico dele? Os orçamentos e o cliente continuam existindo.")) return
                  const r = await excluirLead(lead.id)
                  if (!r.ok) return toast.error(r.erro)
                  toast.success("Lead excluído")
                  router.push(`/crm?funil=${lead.funil_id}`)
                }}>
                  <Trash2 className="h-3.5 w-3.5" /> Excluir lead
                </Button>
              )}
            </div>
          </Cartao>
        </div>

        {/* ------------------------------------------------ Coluna lateral */}
        <div className="space-y-5">
          {lead.status === "ganho" && (
            <PrazoContrato leadId={lead.id} prazo={lead.prazo_entrega} situacao={prazoInfo} isAdmin={quadro.isAdmin}
              historico={historicoPrazos} onMudou={atualizar} />
          )}
          <Cartao titulo="Cliente" icone={<UserRound className="h-4 w-4 text-[#d97021]" />}>
            <ClienteDoLead lead={lead} cliente={cliente} podeEditar={podeEditar} modo={modoCliente} setModo={setModoCliente}
              onMudou={atualizar}
              depoisDeLigar={(clienteId) => { if (irParaOrcamento) { setIrParaOrcamento(false); abrirOrcamentoNovo(clienteId) } }} />
          </Cartao>

          <Tarefas leadId={lead.id} tarefas={tarefas} nomeUsuario={nomeUsuario} onMudou={atualizar} />

          <Historico leadId={lead.id} atividades={atividades} nomeUsuario={nomeUsuario} userId={quadro.userId} isAdmin={quadro.isAdmin} onMudou={atualizar} />
        </div>
      </div>

      {/* Antes do orçamento: escolher ou cadastrar o cliente */}
      <Dialog open={precisaCliente} onOpenChange={o => { if (!o) { setPrecisaCliente(false); setIrParaOrcamento(false) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quem é o cliente deste orçamento?</DialogTitle>
            <DialogDescription>O orçamento precisa de um cliente. Escolha um já cadastrado ou cadastre agora — depois o orçamento abre direto.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {([
              ["buscar", "Selecionar cliente cadastrado", "Já existe no sistema"],
              ["simples", "Cadastro simples", "Nome, telefone e cidade — completa depois"],
              ["completo", "Cadastro completo", "CPF/CNPJ, endereço e contato"],
            ] as const).map(([m, t, d]) => (
              <button key={m} className="rounded-lg border p-3 text-left hover:border-[#d97021] hover:bg-orange-50 transition-colors"
                onClick={() => { setPrecisaCliente(false); setModoCliente(m) }}>
                <div className="font-medium text-sm">{t}</div>
                <div className="text-xs text-muted-foreground">{d}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <GanhoDialog alvo={ganho} onFechar={() => setGanho(null)} onFeito={() => { setGanho(null); atualizar() }} />
      <PerdidoDialog alvo={perdido} motivos={quadro.motivos} config={quadro.config} onFechar={() => setPerdido(null)} onFeito={() => { setPerdido(null); atualizar() }} />
      <EnviarFunilDialog
        alvo={enviar ? { leadId: lead.id, titulo: lead.titulo, funilAtualId: lead.funil_id, vendedorId: lead.vendedor_id } : null}
        funis={quadro.funis}
        usuarios={quadro.usuarios}
        onFechar={() => setEnviar(false)}
        onFeito={(funilId) => { setEnviar(false); router.push(`/crm?funil=${funilId}`) }}
      />
    </div>
  )
}

// ======================================================================

/** Um orçamento do lead com os passos até o contrato */
function OrcamentoFluxo({ o, fechado, podeEditar, onDesligar, onFechado }: {
  o: CrmOrcamentoResumo
  fechado: boolean
  podeEditar: boolean
  onDesligar: () => void
  /** lead ganho: marcar/desmarcar como fechado pelo cliente */
  onFechado?: (fechado: boolean) => void
}) {
  const [mudando, setMudando] = useState(false)
  const faltam = o.faltam_para_proposta || []
  const detalhesOk = faltam.length === 0
  const propostaOk = !!o.proposta

  type Passo = {
    nome: string; ok: boolean; texto: string; dica?: string; emBreve?: boolean
    href?: string; acao?: string; principal?: boolean
    bloqueado?: string // motivo: mostra o botão desabilitado com o motivo ao lado
  }
  const passos: Passo[] = [
    { nome: "Orçamento", ok: true, texto: brlCentavos.format(o.valor_total), href: `/orcamentos/${o.id}`, acao: "Abrir orçamento" },
    {
      nome: "Detalhes comerciais", ok: detalhesOk,
      texto: detalhesOk ? "Completo" : `Faltam ${faltam.length}`, dica: faltam.join(", "),
      href: `/orcamentos/${o.id}`, acao: detalhesOk ? "Ver detalhes comerciais" : "Abrir detalhes comerciais",
      principal: !detalhesOk,
    },
    propostaOk
      ? { nome: "Proposta", ok: true, texto: `${o.proposta!.status} · ${formatarData(o.proposta!.criado_em)}`, href: `/propostas/${o.proposta!.id}`, acao: "Ver proposta" }
      : detalhesOk
        ? (podeEditar
          ? { nome: "Proposta", ok: false, texto: "Pronta para gerar", href: `/orcamentos/${o.id}/proposta`, acao: "Gerar proposta", principal: true }
          : { nome: "Proposta", ok: false, texto: "Ainda não gerada" })
        : { nome: "Proposta", ok: false, texto: "Bloqueada", acao: "Gerar proposta", bloqueado: `Preencha antes os detalhes comerciais (faltam ${faltam.length}).` },
    { nome: "Contrato", ok: false, texto: "Em breve", emBreve: true },
  ]

  return (
    <div className={`rounded-xl border p-3 transition-colors ${fechado ? "border-emerald-300 bg-emerald-50/40" : "hover:border-[#d97021]/40"}`}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-sm">{o.numero_pedido || `#${o.id.slice(0, 8).toUpperCase()}`}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COR_STATUS_ORC[o.status] || "bg-muted"}`}>{o.status}</span>
        {fechado && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-medium text-white">Fechado</span>}
        {o.frete ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-inset ring-blue-200" title={o.tipo_frete || ""}>Frete {brlCentavos.format(o.frete)}</span>
          : <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">sem frete</span>}
        <span className="text-xs text-muted-foreground">
          {formatarData(o.criado_em)}
          {o.largura && o.comprimento ? ` · ${o.largura} × ${o.comprimento} m (${Math.round(o.largura * o.comprimento).toLocaleString("pt-BR")} m²)` : ""}
        </span>
        {onFechado && (
          <label className={`ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${fechado ? "bg-emerald-600 text-white ring-emerald-600" : "bg-background text-muted-foreground ring-border hover:text-foreground"}`}>
            <input type="checkbox" className="h-3.5 w-3.5 accent-white" checked={fechado} disabled={mudando}
              onChange={async e => { setMudando(true); await onFechado(e.target.checked); setMudando(false) }} />
            Cliente fechou
          </label>
        )}
        {podeEditar && (
          <button title="Desligar do lead" className={`${onFechado ? "" : "ml-auto "}text-muted-foreground hover:text-red-600`} onClick={onDesligar}>
            <Unlink className="h-4 w-4" />
          </button>
        )}
      </div>
      <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {passos.map((p, i) => (
          <li key={p.nome} className={`relative rounded-lg border p-2.5 ${p.ok ? "border-emerald-200 bg-emerald-50/60" : p.emBreve ? "border-dashed bg-muted/30" : "bg-background"}`}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${p.ok ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
                {p.ok ? <Check className="h-2.5 w-2.5" /> : i + 1}
              </span>
              {p.nome}
            </div>
            <div className="mt-1 text-sm font-medium truncate" title={p.dica || p.texto}>{p.texto}</div>
            {p.emBreve ? (
              <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"><FileSignature className="h-3 w-3" /> em desenvolvimento</span>
            ) : p.bloqueado ? (
              <div className="mt-1.5 space-y-1">
                <button disabled title={p.bloqueado}
                  className="inline-flex cursor-not-allowed items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                  {p.acao}
                </button>
                <p className="text-[11px] leading-snug text-amber-700">{p.bloqueado}</p>
              </div>
            ) : p.href && p.principal ? (
              <Link href={p.href} className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-[#d97021] px-2 py-1 text-xs font-medium text-white hover:bg-[#c3631b]">
                {p.acao} <ChevronRight className="h-3 w-3" />
              </Link>
            ) : p.href ? (
              <Link href={p.href} className="mt-1 inline-flex items-center gap-0.5 text-xs font-medium text-[#d97021] hover:underline">
                {p.acao} <ChevronRight className="h-3 w-3" />
              </Link>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  )
}

function LigarOrcamento({ leadId, clienteId, onLigado }: { leadId: string; clienteId: string | null; onLigado: () => void }) {
  const [aberto, setAberto] = useState(false)
  const [lista, setLista] = useState<Awaited<ReturnType<typeof listarOrcamentosSemLead>> | null>(null)
  const [escolhido, setEscolhido] = useState("")
  useEffect(() => {
    if (!aberto) return
    setLista(null); setEscolhido("")
    listarOrcamentosSemLead(clienteId).then(setLista)
  }, [aberto, clienteId])

  return (
    <>
      <Button size="sm" variant="outline" className="gap-1" onClick={() => setAberto(true)}>
        <Link2 className="h-4 w-4" /> Ligar existente
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ligar orçamento já feito</DialogTitle>
            <DialogDescription>{clienteId ? "Orçamentos deste cliente que ainda não estão em nenhum lead." : "Orçamentos que ainda não estão em nenhum lead."}</DialogDescription>
          </DialogHeader>
          {!lista ? <p className="text-sm text-muted-foreground">Carregando...</p>
            : lista.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum orçamento disponível.</p>
            : (
              <div className="max-h-72 overflow-y-auto divide-y rounded-lg border">
                {lista.map(o => (
                  <label key={o.id} className={`flex items-center gap-3 p-3 text-sm cursor-pointer ${escolhido === o.id ? "bg-orange-50" : "hover:bg-muted/50"}`}>
                    <input type="radio" checked={escolhido === o.id} onChange={() => setEscolhido(o.id)} className="accent-[#d97021]" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium truncate">{o.numero_pedido || o.id.slice(0, 8).toUpperCase()} · {o.cliente_nome}</span>
                      <span className="block text-xs text-muted-foreground">{o.status} · {formatarData(o.criado_em)}</span>
                    </span>
                    <b>{brlCentavos.format(o.valor_total)}</b>
                  </label>
                ))}
              </div>
            )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button disabled={!escolhido} className="bg-[#d97021] hover:bg-[#c3631b]" onClick={async () => {
              const r = await vincularOrcamento(leadId, escolhido)
              if (!r.ok) return toast.error(r.erro)
              toast.success("Orçamento ligado ao lead")
              setAberto(false)
              onLigado()
            }}>Ligar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Tarefas({ leadId, tarefas, nomeUsuario, onMudou }: {
  leadId: string
  tarefas: CrmFichaLead["tarefas"]
  nomeUsuario: (id: string | null) => string
  onMudou: () => void
}) {
  const [lista, setLista] = useState(tarefas)
  useEffect(() => { setLista(tarefas) }, [tarefas])

  const [titulo, setTitulo] = useState("")
  const [data, setData] = useState("")
  const [dataInvalida, setDataInvalida] = useState(false)
  const [erroData, setErroData] = useState<string | null>(null)
  const [chaveData, setChaveData] = useState(0)
  const [salvando, setSalvando] = useState(false)
  const hoje = hojeISO()
  const abertas = lista.filter(t => !t.concluida).length

  const limparData = () => {
    setData("")
    setDataInvalida(false)
    setErroData(null)
    setChaveData(k => k + 1)
  }

  const aoMudarData = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const val = e.currentTarget.value
    const bad = !!e.currentTarget.validity?.badInput
    setData(val)
    setDataInvalida(bad)
    setErroData(validarDataOpcional(val, bad))
  }

  const salvarTarefa = async () => {
    if (!titulo.trim() || salvando) return
    const erro = validarDataOpcional(data, dataInvalida)
    if (erro) {
      setErroData(erro)
      toast.error(erro)
      return
    }
    setSalvando(true)
    const r = await criarTarefa(leadId, titulo, data.trim() || null)
    setSalvando(false)
    if (!r.ok) {
      setErroData(r.erro)
      return toast.error(r.erro)
    }
    if (r.dados) setLista(prev => [r.dados!, ...prev])
    setTitulo("")
    limparData()
    toast.success("Tarefa adicionada")
    onMudou()
  }

  return (
    <Cartao titulo={`Tarefas${abertas ? ` (${abertas})` : ""}`} icone={<ListTodo className="h-4 w-4 text-[#d97021]" />}>
      <form
        noValidate
        className="space-y-2"
        onSubmit={e => {
          e.preventDefault()
          salvarTarefa()
        }}
      >
        <input
          className={inputClasse}
          aria-label="Título da tarefa"
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          placeholder="Ex.: Ligar para confirmar medidas"
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[150px] flex items-center gap-1">
            <input
              key={chaveData}
              className={`${inputClasse} ${erroData ? "border-red-500 ring-1 ring-red-500" : ""}`}
              type="date"
              min="2000-01-01"
              max="2100-12-31"
              aria-label="Data da tarefa"
              aria-invalid={!!erroData}
              value={data}
              onChange={aoMudarData}
              onInput={aoMudarData}
              onKeyDown={e => {
                if ((e.key === "Backspace" || e.key === "Delete" || e.key === "Escape") && (dataInvalida || erroData)) {
                  limparData()
                }
              }}
            />
            {(data || dataInvalida || erroData) && (
              <button
                type="button"
                onClick={limparData}
                title="Limpar data"
                aria-label="Limpar data"
                className="shrink-0 rounded-md border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button
            type="submit"
            disabled={salvando || !titulo.trim()}
            className="shrink-0 gap-1 bg-[#d97021] hover:bg-[#c3631b]"
          >
            <Plus className="h-4 w-4" /> Adicionar tarefa
          </Button>
        </div>
        {erroData && (
          <p role="alert" className="text-xs font-medium text-red-600">
            {erroData}
          </p>
        )}
      </form>
      {lista.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {lista.map(t => {
            const atrasada = !t.concluida && t.vence_em && t.vence_em < hoje
            return (
              <li key={t.id} className={`group flex items-start gap-2.5 rounded-lg border p-2.5 text-sm ${atrasada ? "border-red-200 bg-red-50/60" : ""}`}>
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#d97021]" checked={t.concluida} onChange={async (e) => {
                  const concluida = e.target.checked
                  setLista(prev => prev.map(x => x.id === t.id ? { ...x, concluida } : x))
                  await alternarTarefa(t.id, concluida)
                  onMudou()
                }} />
                <div className="flex-1 min-w-0">
                  <div className={t.concluida ? "line-through text-muted-foreground" : ""}>{t.titulo}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
                    {t.vence_em && <span className={`inline-flex items-center gap-1 ${atrasada ? "text-red-600 font-semibold" : ""}`}><CalendarClock className="h-3 w-3" />{formatarData(t.vence_em)}</span>}
                    <span>{nomeUsuario(t.responsavel_id)}</span>
                  </div>
                </div>
                <button type="button" aria-label="Excluir tarefa" className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600" onClick={async () => {
                  setLista(prev => prev.filter(x => x.id !== t.id))
                  await excluirTarefa(t.id)
                  onMudou()
                }}><Trash2 className="h-3.5 w-3.5" /></button>
              </li>
            )
          })}
        </ul>
      )}
    </Cartao>
  )
}

function Historico({ leadId, atividades, nomeUsuario, userId, isAdmin, onMudou }: {
  leadId: string
  atividades: CrmFichaLead["atividades"]
  nomeUsuario: (id: string | null) => string
  userId: string
  isAdmin: boolean
  onMudou: () => void
}) {
  const [lista, setLista] = useState(atividades)
  useEffect(() => { setLista(atividades) }, [atividades])

  const [tipo, setTipo] = useState("nota")
  const [texto, setTexto] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [notaSalva, setNotaSalva] = useState(false)
  const corDoTipo = useMemo(() => (t: string) =>
    t === "ganho" ? "bg-emerald-600" : t === "perdido" ? "bg-red-600" : t === "etapa" ? "bg-sky-500" : t === "orcamento" ? "bg-violet-500" : t === "sistema" ? "bg-slate-400" : "bg-[#d97021]", [])

  const registrarNota = async () => {
    if (!texto.trim() || salvando) return
    setSalvando(true)
    const r = await adicionarAtividade(leadId, tipo, texto)
    setSalvando(false)
    if (!r.ok) return toast.error(r.erro)
    if (r.dados) setLista(prev => [r.dados!, ...prev])
    setTexto("")
    setNotaSalva(true)
    setTimeout(() => setNotaSalva(false), 4000)
    toast.success("Nota salva")
    onMudou()
  }

  return (
    <Cartao titulo="Histórico" icone={<MessageCircle className="h-4 w-4 text-[#d97021]" />}>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {TIPOS_ATIVIDADE.map(t => (
            <button key={t.valor} type="button" onClick={() => setTipo(t.valor)}
              className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${tipo === t.valor ? "bg-[#d97021] text-white" : "bg-muted hover:bg-muted/70"}`}>
              {t.rotulo}
            </button>
          ))}
        </div>
        <Textarea rows={2} value={texto} onChange={e => { setTexto(e.target.value); if (notaSalva) setNotaSalva(false) }} placeholder="O que foi conversado / combinado?" />
        <div className="flex items-center justify-between gap-2">
          <div>
            {notaSalva && (
              <span role="status" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                <Check className="h-3.5 w-3.5" /> Nota salva
              </span>
            )}
          </div>
          <Button size="sm" disabled={salvando || !texto.trim()} onClick={registrarNota}>
            {salvando ? "Salvando..." : "Registrar"}
          </Button>
        </div>
      </div>
      <ol className="relative mt-4 space-y-4 border-l pl-5">
        {lista.map(a => (
          <li key={a.id} className="group text-sm">
            <span className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-background ${corDoTipo(a.tipo)}`} />
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <b className="text-foreground">{ROTULO_ATIVIDADE[a.tipo] || a.tipo}</b>
              <span>{dataHora.format(new Date(a.criado_em))}</span>
              <span>· {nomeUsuario(a.usuario_id)}</span>
              {["nota", "ligacao", "whatsapp", "visita", "email"].includes(a.tipo) && (a.usuario_id === userId || isAdmin) && (
                <button type="button" aria-label="Apagar registro" className="opacity-0 group-hover:opacity-100 hover:text-red-600" onClick={async () => {
                  if (!confirm("Apagar este registro?")) return
                  setLista(prev => prev.filter(x => x.id !== a.id))
                  await excluirAtividade(a.id)
                  onMudou()
                }}><Trash2 className="h-3 w-3" /></button>
              )}
            </div>
            <p className="whitespace-pre-wrap">{a.descricao}</p>
          </li>
        ))}
      </ol>
    </Cartao>
  )
}

/** Uma entrega do lead (status, viagem, caminhão, motorista e datas) */
function LinhaEntrega({ en }: { en: EntregaDoLead }) {
  const st = STATUS_ENTREGA[en.status]
  const aoVivo = en.viagem?.status === "em_rota" && posicaoRecente(en.viagem.ultima_posicao_em)
  const passos: { nome: string; feito: boolean; atual: boolean }[] = [
    { nome: "Solicitada", feito: true, atual: en.status === "a_programar" },
    { nome: "Programada", feito: ["programada", "em_rota", "entregue"].includes(en.status), atual: en.status === "programada" },
    { nome: "Em rota", feito: ["em_rota", "entregue"].includes(en.status), atual: en.status === "em_rota" },
    { nome: "Entregue", feito: en.status === "entregue", atual: en.status === "entregue" },
  ]
  return (
    <div className={`rounded-xl border p-3 ${en.status === "cancelada" ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-[#d97021]" />
            <b>{[en.cidade, en.uf].filter(Boolean).join(" - ") || en.destinatario}</b>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${st.classe}`}>{st.rotulo}</span>
            {aoVivo && <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-medium text-white">● ao vivo</span>}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            {en.distancia_km != null && <span>{formatarKm(en.distancia_km)}</span>}
            {en.viagem && <span>Saída {formatarData(en.viagem.saida_prevista)}</span>}
            {en.chegada_prevista && <span>Chegada prevista {formatarData(en.chegada_prevista)}</span>}
            {en.entregue_em && <span className="text-emerald-700">Entregue {formatarData(en.entregue_em)}</span>}
            {en.veiculo && <span>🚚 {en.veiculo}</span>}
            {en.motorista && <span>{en.motorista}</span>}
            {en.peso_kg ? <span>{Number(en.peso_kg).toLocaleString("pt-BR")} kg</span> : null}
          </div>
        </div>
        {en.viagem && <Link href={`/entregas/viagem/${en.viagem.id}`} className="text-xs font-medium text-[#d97021] hover:underline">ver viagem</Link>}
      </div>
      {en.status !== "cancelada" && (
        <ol className="mt-3 grid grid-cols-4 gap-1">
          {passos.map(p => (
            <li key={p.nome} className="space-y-1">
              <div className={`h-1.5 rounded-full ${p.feito ? (p.nome === "Entregue" ? "bg-emerald-500" : "bg-[#d97021]") : "bg-muted"}`} />
              <div className={`text-[10px] ${p.atual ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{p.nome}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
