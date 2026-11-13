"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  CalendarClock, CheckCircle2, ExternalLink, FileText, Link2, Loader2, MessageCircle,
  Phone, Plus, Trash2, Unlink, UserPlus, XCircle,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  adicionarAtividade, alternarTarefa, atualizarLead, criarClienteDoLead, criarTarefa,
  desvincularOrcamento, excluirAtividade, excluirLead, excluirTarefa, listarOrcamentosSemLead,
  obterFichaLead, vincularOrcamento,
} from "@/app/actions/crm"
import { TIPOS_ATIVIDADE, hojeISO, type CrmEtapa, type CrmFichaLead, type CrmQuadro } from "@/lib/crm-types"
import { LeadCampos, leadParaValores, type LeadFormValores } from "./lead-campos"
import { brlCentavos, dataHora, formatarData, inputClasse, linkWhatsApp } from "./crm-utils"

const ROTULO_ATIVIDADE: Record<string, string> = {
  nota: "Nota", ligacao: "Ligação", whatsapp: "WhatsApp", visita: "Visita", email: "E-mail",
  etapa: "Etapa", orcamento: "Orçamento", ganho: "Ganho", perdido: "Perdido", sistema: "Sistema",
}

const COR_STATUS_ORC: Record<string, string> = {
  Aprovado: "bg-emerald-600 text-white",
  Enviado: "bg-blue-500 text-white",
  Rascunho: "bg-orange-50 text-orange-600 border border-orange-200",
  Perdido: "bg-red-600 text-white",
}

export function LeadFicha({
  leadId,
  quadro,
  onFechar,
  onGanho,
  onPerdido,
}: {
  leadId: string | null
  quadro: CrmQuadro
  onFechar: () => void
  onGanho: (leadId: string) => void
  onPerdido: (leadId: string) => void
}) {
  const router = useRouter()
  const [ficha, setFicha] = useState<CrmFichaLead | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [valores, setValores] = useState<LeadFormValores | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [aba, setAba] = useState("resumo")

  const [notaTipo, setNotaTipo] = useState("nota")
  const [notaTexto, setNotaTexto] = useState("")
  const [tarefaTitulo, setTarefaTitulo] = useState("")
  const [tarefaData, setTarefaData] = useState("")
  const [orcLivres, setOrcLivres] = useState<Awaited<ReturnType<typeof listarOrcamentosSemLead>> | null>(null)
  const [orcEscolhido, setOrcEscolhido] = useState("")

  // onFechar muda a cada render do quadro (router.refresh); em ref para a ficha não
  // recarregar sozinha nem voltar para a aba "Dados" depois de cada ação
  const onFecharRef = useRef(onFechar)
  onFecharRef.current = onFechar

  const carregar = useCallback(async (id: string, silencioso = false) => {
    if (!silencioso) setCarregando(true)
    const r = await obterFichaLead(id)
    setCarregando(false)
    if (!r.ok) {
      toast.error(r.erro)
      onFecharRef.current()
      return
    }
    setFicha(r.dados!)
    setValores(leadParaValores(r.dados!.lead as unknown as Record<string, unknown>))
  }, [])

  useEffect(() => {
    if (leadId) {
      setAba("resumo")
      setOrcLivres(null)
      carregar(leadId)
    } else {
      setFicha(null)
      setValores(null)
    }
  }, [leadId, carregar])

  const recarregar = async () => {
    if (leadId) await carregar(leadId, true)
    router.refresh()
  }

  const lead = ficha?.lead
  const etapa: CrmEtapa | undefined = quadro.etapas.find(e => e.id === lead?.etapa_id)
  const nomeUsuario = (id: string | null) => quadro.usuarios.find(u => u.id === id)?.nome || "—"
  const whats = linkWhatsApp(lead?.telefone)

  const salvar = async () => {
    if (!leadId || !valores) return
    setSalvando(true)
    const r = await atualizarLead(leadId, valores)
    setSalvando(false)
    if (!r.ok) return toast.error(r.erro)
    toast.success("Lead salvo")
    recarregar()
  }

  const novoOrcamento = async () => {
    if (!lead) return
    let clienteId = lead.cliente_id
    if (!clienteId) {
      const r = await criarClienteDoLead(lead.id)
      if (!r.ok) return toast.error(r.erro)
      clienteId = r.dados!.clienteId
      toast.success("Cliente cadastrado com os dados do lead")
    }
    router.push(`/orcamentos/novo?lead=${lead.id}&cliente=${clienteId}`)
  }

  const abrirLigarOrcamento = async () => {
    setOrcLivres(await listarOrcamentosSemLead(lead?.cliente_id))
    setOrcEscolhido("")
  }

  return (
    <Dialog open={!!leadId} onOpenChange={(o) => { if (!o) onFechar() }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        {carregando || !lead || !valores ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando lead...
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl pr-8">{lead.titulo}</DialogTitle>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {etapa && (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: etapa.cor }}>
                    {etapa.nome}
                  </span>
                )}
                {lead.status === "ganho" && <Badge className="bg-emerald-600">Ganho {lead.valor_fechado ? `· ${brlCentavos.format(lead.valor_fechado)}` : ""}</Badge>}
                {lead.status === "perdido" && <Badge variant="destructive">Perdido</Badge>}
                <span className="text-muted-foreground">Vendedor: {nomeUsuario(lead.vendedor_id)}</span>
                {lead.telefone && (
                  <a href={`tel:${lead.telefone}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                    <Phone className="h-3.5 w-3.5" /> {lead.telefone}
                  </a>
                )}
                {whats && (
                  <a href={whats} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:underline">
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                )}
              </div>
              {lead.status === "aberto" && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1" onClick={() => onGanho(lead.id)}>
                    <CheckCircle2 className="h-4 w-4" /> Marcar ganho
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 gap-1" onClick={() => onPerdido(lead.id)}>
                    <XCircle className="h-4 w-4" /> Marcar perdido
                  </Button>
                </div>
              )}
            </DialogHeader>

            <Tabs value={aba} onValueChange={(v) => setAba(String(v))} className="mt-2">
              <TabsList>
                <TabsTrigger value="resumo">Dados</TabsTrigger>
                <TabsTrigger value="orcamentos">Orçamentos ({ficha!.orcamentos.length})</TabsTrigger>
                <TabsTrigger value="historico">Histórico ({ficha!.atividades.length})</TabsTrigger>
                <TabsTrigger value="tarefas">Tarefas ({ficha!.tarefas.filter(t => !t.concluida).length})</TabsTrigger>
              </TabsList>

              {/* ---------------- DADOS ---------------- */}
              <TabsContent value="resumo" className="pt-4 space-y-4">
                <div className="rounded-md border bg-muted/30 p-3 text-sm flex flex-wrap items-center gap-2">
                  {lead.cliente_id ? (
                    <>
                      <span>Cliente cadastrado: <b>{lead.cliente_nome}</b></span>
                      <Link href="/clientes" className="text-[#d97021] hover:underline inline-flex items-center gap-1">
                        ver clientes <ExternalLink className="h-3 w-3" />
                      </Link>
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground">Ainda sem cadastro de cliente.</span>
                      <Button size="sm" variant="outline" className="gap-1" onClick={async () => {
                        const r = await criarClienteDoLead(lead.id)
                        if (!r.ok) return toast.error(r.erro)
                        toast.success("Cliente cadastrado")
                        recarregar()
                      }}>
                        <UserPlus className="h-4 w-4" /> Cadastrar cliente com estes dados
                      </Button>
                    </>
                  )}
                </div>

                {lead.status === "perdido" && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    Perdido em {formatarData(lead.perdido_em)} — {quadro.motivos.find(m => m.id === lead.motivo_perda_id)?.nome || "sem motivo"}
                    {lead.motivo_perda_obs ? `: ${lead.motivo_perda_obs}` : ""}
                  </div>
                )}

                <LeadCampos
                  valores={valores}
                  onChange={setValores}
                  origens={quadro.origens}
                  usuarios={quadro.usuarios}
                  podeTrocarVendedor={quadro.isAdmin}
                />

                <div className="flex justify-between gap-2 pt-2">
                  {quadro.isAdmin ? (
                    <Button variant="ghost" className="text-red-600 gap-1" onClick={async () => {
                      if (!confirm("Excluir este lead e todo o histórico dele? Os orçamentos continuam existindo.")) return
                      const r = await excluirLead(lead.id)
                      if (!r.ok) return toast.error(r.erro)
                      toast.success("Lead excluído")
                      onFechar()
                      router.refresh()
                    }}>
                      <Trash2 className="h-4 w-4" /> Excluir lead
                    </Button>
                  ) : <span />}
                  <Button onClick={salvar} disabled={salvando} className="bg-[#d97021] hover:bg-[#c3631b]">
                    {salvando ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Criado em {dataHora.format(new Date(lead.criado_em))} · Na etapa atual desde {formatarData(lead.etapa_desde)}
                </p>
              </TabsContent>

              {/* ---------------- ORÇAMENTOS ---------------- */}
              <TabsContent value="orcamentos" className="pt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="gap-1 bg-[#d97021] hover:bg-[#c3631b]" onClick={novoOrcamento}>
                    <Plus className="h-4 w-4" /> Novo orçamento para este lead
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={abrirLigarOrcamento}>
                    <Link2 className="h-4 w-4" /> Ligar orçamento já feito
                  </Button>
                </div>

                {orcLivres && (
                  <div className="rounded-md border p-3 flex flex-col sm:flex-row gap-2">
                    {orcLivres.length === 0 ? (
                      <span className="text-sm text-muted-foreground">Nenhum orçamento sem lead {lead.cliente_id ? "para este cliente" : ""}.</span>
                    ) : (
                      <>
                        <select className={inputClasse} value={orcEscolhido} onChange={e => setOrcEscolhido(e.target.value)}>
                          <option value="">Escolha o orçamento...</option>
                          {orcLivres.map(o => (
                            <option key={o.id} value={o.id}>
                              {o.numero_pedido || o.id.slice(0, 8).toUpperCase()} · {o.cliente_nome} · {brlCentavos.format(o.valor_total)} · {o.status} · {formatarData(o.criado_em)}
                            </option>
                          ))}
                        </select>
                        <Button size="sm" disabled={!orcEscolhido} onClick={async () => {
                          const r = await vincularOrcamento(lead.id, orcEscolhido)
                          if (!r.ok) return toast.error(r.erro)
                          toast.success("Orçamento ligado ao lead")
                          setOrcLivres(null)
                          recarregar()
                        }}>Ligar</Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setOrcLivres(null)}>Cancelar</Button>
                  </div>
                )}

                {ficha!.orcamentos.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Nenhum orçamento ainda.</p>
                ) : (
                  <div className="divide-y rounded-md border">
                    {ficha!.orcamentos.map(o => (
                      <div key={o.id} className="flex items-center gap-3 p-3 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium flex items-center gap-2">
                            {o.numero_pedido || o.id.slice(0, 8).toUpperCase()}
                            {lead.orcamento_ganho_id === o.id && <Badge className="bg-emerald-600">Fechado</Badge>}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {formatarData(o.criado_em)}
                            {o.largura && o.comprimento ? ` · ${o.largura} × ${o.comprimento} m (${Math.round(o.largura * o.comprimento)} m²)` : ""}
                          </div>
                        </div>
                        <span className={`rounded px-2 py-0.5 text-xs ${COR_STATUS_ORC[o.status] || "bg-muted"}`}>{o.status}</span>
                        <span className="font-semibold w-28 text-right">{brlCentavos.format(o.valor_total)}</span>
                        <Link href={`/orcamentos/${o.id}`} className="text-[#d97021] hover:underline text-xs">abrir</Link>
                        <button title="Desligar do lead" className="text-muted-foreground hover:text-red-600" onClick={async () => {
                          if (!confirm("Desligar este orçamento do lead? O orçamento não é apagado.")) return
                          const r = await desvincularOrcamento(lead.id, o.id)
                          if (!r.ok) return toast.error(r.erro)
                          recarregar()
                        }}>
                          <Unlink className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ---------------- HISTÓRICO ---------------- */}
              <TabsContent value="historico" className="pt-4 space-y-3">
                <div className="rounded-md border p-3 space-y-2">
                  <div className="flex gap-2">
                    <select className={`${inputClasse} w-40`} value={notaTipo} onChange={e => setNotaTipo(e.target.value)}>
                      {TIPOS_ATIVIDADE.map(t => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
                    </select>
                  </div>
                  <Textarea rows={2} value={notaTexto} onChange={e => setNotaTexto(e.target.value)} placeholder="O que foi conversado / combinado?" />
                  <div className="flex justify-end">
                    <Button size="sm" disabled={!notaTexto.trim()} onClick={async () => {
                      const r = await adicionarAtividade(lead.id, notaTipo, notaTexto)
                      if (!r.ok) return toast.error(r.erro)
                      setNotaTexto("")
                      recarregar()
                    }}>Registrar</Button>
                  </div>
                </div>
                <ol className="relative border-l pl-5 space-y-4">
                  {ficha!.atividades.map(a => (
                    <li key={a.id} className="text-sm group">
                      <span className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-background ${
                        a.tipo === "ganho" ? "bg-emerald-600" : a.tipo === "perdido" ? "bg-red-600" : a.tipo === "etapa" ? "bg-sky-500" : "bg-[#d97021]"
                      }`} />
                      <div className="text-xs text-muted-foreground flex gap-2 items-center">
                        <b className="text-foreground">{ROTULO_ATIVIDADE[a.tipo] || a.tipo}</b>
                        {dataHora.format(new Date(a.criado_em))} · {nomeUsuario(a.usuario_id)}
                        {["nota", "ligacao", "whatsapp", "visita", "email"].includes(a.tipo) && (a.usuario_id === quadro.userId || quadro.isAdmin) && (
                          <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600" onClick={async () => {
                            if (!confirm("Apagar este registro?")) return
                            await excluirAtividade(a.id)
                            recarregar()
                          }}><Trash2 className="h-3 w-3" /></button>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap">{a.descricao}</p>
                    </li>
                  ))}
                </ol>
              </TabsContent>

              {/* ---------------- TAREFAS ---------------- */}
              <TabsContent value="tarefas" className="pt-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input className={inputClasse} value={tarefaTitulo} onChange={e => setTarefaTitulo(e.target.value)} placeholder="Ex.: Ligar para confirmar medidas" />
                  <input className={`${inputClasse} sm:w-44`} type="date" value={tarefaData} onChange={e => setTarefaData(e.target.value)} />
                  <Button disabled={!tarefaTitulo.trim()} onClick={async () => {
                    const r = await criarTarefa(lead.id, tarefaTitulo, tarefaData || null)
                    if (!r.ok) return toast.error(r.erro)
                    setTarefaTitulo("")
                    setTarefaData("")
                    recarregar()
                  }}>Adicionar</Button>
                </div>
                {ficha!.tarefas.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma tarefa.</p>
                ) : (
                  <ul className="divide-y rounded-md border">
                    {ficha!.tarefas.map(t => {
                      const atrasada = !t.concluida && t.vence_em && t.vence_em < hojeISO()
                      return (
                        <li key={t.id} className="flex items-center gap-3 p-3 text-sm group">
                          <input type="checkbox" className="h-4 w-4 accent-[#d97021]" checked={t.concluida} onChange={async (e) => {
                            await alternarTarefa(t.id, e.target.checked)
                            recarregar()
                          }} />
                          <span className={`flex-1 ${t.concluida ? "line-through text-muted-foreground" : ""}`}>{t.titulo}</span>
                          {t.vence_em && (
                            <span className={`text-xs inline-flex items-center gap-1 ${atrasada ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
                              <CalendarClock className="h-3.5 w-3.5" /> {formatarData(t.vence_em)}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">{nomeUsuario(t.responsavel_id)}</span>
                          <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600" onClick={async () => {
                            await excluirTarefa(t.id)
                            recarregar()
                          }}><Trash2 className="h-4 w-4" /></button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
