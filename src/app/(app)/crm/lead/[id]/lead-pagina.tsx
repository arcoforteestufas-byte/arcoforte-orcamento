"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft, CalendarClock, Check, CheckCircle2, ChevronRight, ClipboardList, FileSignature, FileText,
  Link2, ListTodo, MapPin, MessageCircle, Phone, Plus, Save, Send, Trash2, Unlink, UserRound, XCircle,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  adicionarAtividade, alternarTarefa, assumirLead, atualizarLead, criarTarefa, desvincularOrcamento, excluirAtividade,
  excluirLead, excluirTarefa, listarOrcamentosSemLead, moverLead, vincularOrcamento,
} from "@/app/actions/crm"
import { TIPOS_ATIVIDADE, hojeISO, type CrmFichaLead, type CrmOrcamentoResumo, type CrmQuadro } from "@/lib/crm-types"
import { LeadCampos, leadParaValores, type LeadFormValores } from "../../lead-campos"
import { CamposQualificacao, ScoreBadge } from "../../crm-score"
import { EnviarFunilDialog, GanhoDialog, PerdidoDialog, type AlvoEtapa } from "../../crm-dialogs"
import { ClienteDoLead, type ModoCliente } from "../../cliente-do-lead"
import { brlCentavos, dataHora, diasDesde, formatarData, iniciais, inputClasse, linkWhatsApp } from "../../crm-utils"

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

export function LeadPagina({ ficha, quadro }: { ficha: CrmFichaLead; quadro: CrmQuadro }) {
  const router = useRouter()
  const { lead, cliente, orcamentos, atividades, tarefas, podeEditar } = ficha
  const funil = quadro.funis.find(f => f.id === lead.funil_id)
  const etapas = quadro.etapas.filter(e => e.funil_id === lead.funil_id)
  const etapa = etapas.find(e => e.id === lead.etapa_id)
  const etapasAbertas = etapas.filter(e => e.tipo === "aberta")
  const etapaGanho = etapas.find(e => e.tipo === "ganho")
  const etapaPerdido = etapas.find(e => e.tipo === "perdido")
  const nomeUsuario = (id: string | null) => quadro.usuarios.find(u => u.id === id)?.nome || "—"
  const whats = linkWhatsApp(lead.telefone)
  const equipe = funil?.usuarios || []
  const podeAssumir = !!funil?.membros_veem_todos && lead.status === "aberto" && lead.vendedor_id !== quadro.userId
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

  const valor = lead.status === "ganho" && lead.valor_fechado
    ? Number(lead.valor_fechado)
    : Number(lead.valor_estimado) || Math.max(0, ...orcamentos.map(o => o.valor_total))

  return (
    <div className="flex flex-col gap-5 pb-12">
      {/* ------------------------------------------------ Cabeçalho */}
      <div className="rounded-2xl border bg-background shadow-sm overflow-hidden">
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${funil?.cor || "#d97021"}, ${etapa?.cor || "#d97021"})` }} />
        <div className="p-5 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Link href={`/crm?funil=${lead.funil_id}`} className={buttonVariants({ variant: "outline", size: "icon", className: "shrink-0 mt-1" })} title="Voltar ao funil">
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
            </div>
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
                  <OrcamentoFluxo key={o.id} o={o} fechado={lead.orcamento_ganho_id === o.id} podeEditar={podeEditar}
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
              <LeadCampos valores={valores} onChange={setValores} origens={quadro.origens} usuarios={quadro.usuarios} podeTrocarVendedor={quadro.isAdmin} />
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
function OrcamentoFluxo({ o, fechado, podeEditar, onDesligar }: {
  o: CrmOrcamentoResumo
  fechado: boolean
  podeEditar: boolean
  onDesligar: () => void
}) {
  const faltam = o.faltam_para_proposta || []
  const detalhesOk = faltam.length === 0
  const propostaOk = !!o.proposta

  const passos = [
    { nome: "Orçamento", ok: true, texto: brlCentavos.format(o.valor_total), href: `/orcamentos/${o.id}`, acao: "Abrir" },
    {
      nome: "Detalhes comerciais", ok: detalhesOk,
      texto: detalhesOk ? "Completo" : `Faltam ${faltam.length}`, dica: faltam.join(", "),
      href: `/orcamentos/${o.id}`, acao: detalhesOk ? "Ver" : "Preencher",
    },
    {
      nome: "Proposta", ok: propostaOk,
      texto: propostaOk ? `${o.proposta!.status} · ${formatarData(o.proposta!.criado_em)}` : detalhesOk ? "Pronta para gerar" : "Aguardando detalhes",
      href: propostaOk ? `/propostas/${o.proposta!.id}` : detalhesOk ? `/orcamentos/${o.id}/proposta` : undefined,
      acao: propostaOk ? "Ver proposta" : "Gerar proposta",
    },
    { nome: "Contrato", ok: false, texto: "Em breve", emBreve: true },
  ]

  return (
    <div className={`rounded-xl border p-3 transition-colors ${fechado ? "border-emerald-300 bg-emerald-50/40" : "hover:border-[#d97021]/40"}`}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-sm">{o.numero_pedido || `#${o.id.slice(0, 8).toUpperCase()}`}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COR_STATUS_ORC[o.status] || "bg-muted"}`}>{o.status}</span>
        {fechado && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-medium text-white">Fechado</span>}
        <span className="text-xs text-muted-foreground">
          {formatarData(o.criado_em)}
          {o.largura && o.comprimento ? ` · ${o.largura} × ${o.comprimento} m (${Math.round(o.largura * o.comprimento).toLocaleString("pt-BR")} m²)` : ""}
        </span>
        {podeEditar && (
          <button title="Desligar do lead" className="ml-auto text-muted-foreground hover:text-red-600" onClick={onDesligar}>
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
            ) : p.href ? (
              <Link href={p.href} className="mt-1 inline-flex items-center gap-0.5 text-xs font-medium text-[#d97021] hover:underline">
                {p.acao} <ChevronRight className="h-3 w-3" />
              </Link>
            ) : (
              <span className="mt-1 inline-block text-xs text-muted-foreground">{p.acao}</span>
            )}
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
  const [titulo, setTitulo] = useState("")
  const [data, setData] = useState("")
  const hoje = hojeISO()
  const abertas = tarefas.filter(t => !t.concluida).length

  return (
    <Cartao titulo={`Tarefas${abertas ? ` (${abertas})` : ""}`} icone={<ListTodo className="h-4 w-4 text-[#d97021]" />}>
      <div className="space-y-2">
        <input className={inputClasse} value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex.: Ligar para confirmar medidas" />
        <div className="flex gap-2">
          <input className={inputClasse} type="date" value={data} onChange={e => setData(e.target.value)} />
          <Button disabled={!titulo.trim()} onClick={async () => {
            const r = await criarTarefa(leadId, titulo, data || null)
            if (!r.ok) return toast.error(r.erro)
            setTitulo(""); setData("")
            onMudou()
          }}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>
      {tarefas.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {tarefas.map(t => {
            const atrasada = !t.concluida && t.vence_em && t.vence_em < hoje
            return (
              <li key={t.id} className={`group flex items-start gap-2.5 rounded-lg border p-2.5 text-sm ${atrasada ? "border-red-200 bg-red-50/60" : ""}`}>
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#d97021]" checked={t.concluida} onChange={async (e) => {
                  await alternarTarefa(t.id, e.target.checked)
                  onMudou()
                }} />
                <div className="flex-1 min-w-0">
                  <div className={t.concluida ? "line-through text-muted-foreground" : ""}>{t.titulo}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
                    {t.vence_em && <span className={`inline-flex items-center gap-1 ${atrasada ? "text-red-600 font-semibold" : ""}`}><CalendarClock className="h-3 w-3" />{formatarData(t.vence_em)}</span>}
                    <span>{nomeUsuario(t.responsavel_id)}</span>
                  </div>
                </div>
                <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600" onClick={async () => {
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
  const [tipo, setTipo] = useState("nota")
  const [texto, setTexto] = useState("")
  const corDoTipo = useMemo(() => (t: string) =>
    t === "ganho" ? "bg-emerald-600" : t === "perdido" ? "bg-red-600" : t === "etapa" ? "bg-sky-500" : t === "orcamento" ? "bg-violet-500" : t === "sistema" ? "bg-slate-400" : "bg-[#d97021]", [])

  return (
    <Cartao titulo="Histórico" icone={<MessageCircle className="h-4 w-4 text-[#d97021]" />}>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {TIPOS_ATIVIDADE.map(t => (
            <button key={t.valor} onClick={() => setTipo(t.valor)}
              className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${tipo === t.valor ? "bg-[#d97021] text-white" : "bg-muted hover:bg-muted/70"}`}>
              {t.rotulo}
            </button>
          ))}
        </div>
        <Textarea rows={2} value={texto} onChange={e => setTexto(e.target.value)} placeholder="O que foi conversado / combinado?" />
        <div className="flex justify-end">
          <Button size="sm" disabled={!texto.trim()} onClick={async () => {
            const r = await adicionarAtividade(leadId, tipo, texto)
            if (!r.ok) return toast.error(r.erro)
            setTexto("")
            onMudou()
          }}>Registrar</Button>
        </div>
      </div>
      <ol className="relative mt-4 space-y-4 border-l pl-5">
        {atividades.map(a => (
          <li key={a.id} className="group text-sm">
            <span className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-background ${corDoTipo(a.tipo)}`} />
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <b className="text-foreground">{ROTULO_ATIVIDADE[a.tipo] || a.tipo}</b>
              <span>{dataHora.format(new Date(a.criado_em))}</span>
              <span>· {nomeUsuario(a.usuario_id)}</span>
              {["nota", "ligacao", "whatsapp", "visita", "email"].includes(a.tipo) && (a.usuario_id === userId || isAdmin) && (
                <button className="opacity-0 group-hover:opacity-100 hover:text-red-600" onClick={async () => {
                  if (!confirm("Apagar este registro?")) return
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
