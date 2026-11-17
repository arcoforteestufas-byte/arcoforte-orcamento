"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Building2, Check, Crosshair, MapPin, Navigation, Package, Route, Search, Truck, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { listarClientesParaLead } from "@/app/actions/crm"
import {
  distanciaDaOrigem, geocodificar, salvarEntrega, salvarMotorista, salvarTransportadora, salvarVeiculo, salvarViagem,
} from "@/app/actions/entregas"
import {
  STATUS_ENTREGA, formatarDuracao, formatarKm,
  type EntCadastros, type EntConfig, type EntEntrega, type EntMotorista, type EntTransportadora, type EntVeiculo, type EntViagem,
} from "@/lib/entregas-types"
import { formatarData, inputClasse } from "../crm/crm-utils"
import { Mapa } from "./mapa"
import { CidadeSelect } from "./cidade-select"
import { FotoPerfil } from "@/components/foto-perfil"

const laranja = "bg-[#d97021] hover:bg-[#c3631b]"

function Campo({ rotulo, children, className = "" }: { rotulo: string; children: React.ReactNode; className?: string }) {
  return <div className={`grid gap-1.5 ${className}`}><Label>{rotulo}</Label>{children}</div>
}

function Secao({ titulo, icone, children }: { titulo: string; icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{icone}{titulo}</div>
      {children}
    </div>
  )
}

// ======================================================================
// ENTREGA
// ======================================================================

export type EntregaInicial = Partial<EntEntrega> & { aviso?: string }

export function EntregaDialog({ aberto, inicial, viagens, podeGerenciar, config, onFechar, onSalvo }: {
  aberto: boolean
  inicial: EntregaInicial | null
  viagens: EntViagem[]
  podeGerenciar: boolean
  config: EntConfig
  onFechar: () => void
  onSalvo: (id: string) => void
}) {
  const [e, setE] = useState<EntregaInicial>({})
  const [pino, setPino] = useState<{ lat: number; lng: number } | null>(null)
  const [pinoExato, setPinoExato] = useState(false) // true = marcado no mapa / endereço exato
  const [centralizar, setCentralizar] = useState(0)
  const [localizando, setLocalizando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [distancia, setDistancia] = useState<{ km: number; minutos: number; estimada: boolean } | null>(null)
  const [calculando, setCalculando] = useState(false)
  const [buscaCli, setBuscaCli] = useState<string | null>(null)
  const [clientes, setClientes] = useState<Awaited<ReturnType<typeof listarClientesParaLead>> | null>(null)
  const origemNome = `${config.origem_nome} - ${config.origem_uf}`

  useEffect(() => {
    if (!aberto) return
    const base = inicial || {}
    setE({ ...base })
    setPino(base.lat != null && base.lng != null ? { lat: base.lat, lng: base.lng } : null)
    setPinoExato(false)
    setDistancia(base.distancia_km != null ? { km: Number(base.distancia_km), minutos: 0, estimada: !!base.distancia_estimada } : null)
    setCentralizar(c => c + 1)
    setBuscaCli(null)
    if (base.aviso) toast.message(base.aviso)
  }, [aberto, inicial])

  useEffect(() => {
    if (buscaCli !== null && !clientes) listarClientesParaLead().then(setClientes)
  }, [buscaCli, clientes])

  const set = (campo: keyof EntEntrega, v: unknown) => setE(x => ({ ...x, [campo]: v }))
  const viagensAbertas = viagens.filter(v => v.status === "planejada" || v.status === "em_rota" || v.id === e.viagem_id)
  const clientesFiltrados = useMemo(() => {
    const t = (buscaCli || "").toLowerCase().trim()
    return (clientes || []).filter(c => !t || c.nome.toLowerCase().includes(t) || (c.cidade_uf || "").toLowerCase().includes(t)).slice(0, 8)
  }, [clientes, buscaCli])

  const calcularDistancia = async (lat: number, lng: number) => {
    setCalculando(true)
    const r = await distanciaDaOrigem(lat, lng)
    setCalculando(false)
    setDistancia(r)
  }

  const moverPino = (lat: number, lng: number, exato: boolean, centralizarMapa = false) => {
    setPino({ lat, lng })
    setPinoExato(exato)
    if (centralizarMapa) setCentralizar(c => c + 1)
    calcularDistancia(lat, lng)
  }

  const localizarEndereco = async () => {
    if (!e.cidade || !e.uf) return toast.error("Escolha primeiro o estado e a cidade.")
    if (!e.endereco) return toast.error("Digite o endereço para localizar o ponto exato.")
    setLocalizando(true)
    const g = await geocodificar(e.endereco, e.cidade, e.uf)
    setLocalizando(false)
    if (!g) return toast.error("Não encontrei. Clique no mapa para marcar o local.")
    moverPino(g.lat, g.lng, g.precisao === "endereco", true)
    if (g.precisao === "cidade") toast.message("Não achei o endereço exato: o ponto ficou no centro da cidade. Arraste o marcador se quiser.")
  }

  const salvar = async () => {
    setSalvando(true)
    const r = await salvarEntrega({
      ...e,
      destinatario: e.destinatario || "",
      lat: pino?.lat ?? null,
      lng: pino?.lng ?? null,
      localizar: !pino,
    })
    setSalvando(false)
    if (!r.ok) return toast.error(r.erro)
    toast.success(e.id ? "Entrega salva" : podeGerenciar ? "Entrega criada" : "Entrega solicitada para a logística")
    if (r.dados?.aviso) toast.message(r.dados.aviso)
    onSalvo(r.dados!.id)
  }

  return (
    <Dialog open={aberto} onOpenChange={o => { if (!o) onFechar() }}>
      <DialogContent className="sm:max-w-5xl max-h-[94vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="border-b bg-gradient-to-r from-orange-50 to-transparent px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d97021] text-white"><MapPin className="h-4 w-4" /></span>
            {e.id ? "Editar entrega" : podeGerenciar ? "Nova entrega" : "Solicitar entrega"}
          </DialogTitle>
          {!podeGerenciar && <DialogDescription>A logística recebe a solicitação e coloca numa viagem.</DialogDescription>}
        </DialogHeader>

        <div className="grid gap-5 p-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-4">
            <Secao titulo="Cliente" icone={<Building2 className="h-3.5 w-3.5" />}>
              <Campo rotulo="Destinatário *">
                <div className="flex gap-2">
                  <input className={inputClasse} value={e.destinatario || ""} onChange={x => set("destinatario", x.target.value)} placeholder="Nome do cliente" />
                  <Button type="button" variant="outline" className="gap-1 shrink-0" onClick={() => setBuscaCli(buscaCli === null ? "" : null)}>
                    <Search className="h-4 w-4" /> Cadastrado
                  </Button>
                </div>
              </Campo>
              {buscaCli !== null && (
                <div className="rounded-lg border bg-background p-2 space-y-2">
                  <input autoFocus className={inputClasse} placeholder="Buscar cliente..." value={buscaCli} onChange={x => setBuscaCli(x.target.value)} />
                  <div className="max-h-40 overflow-y-auto divide-y rounded border">
                    {!clientes ? <p className="p-2 text-xs text-muted-foreground">Carregando...</p>
                      : clientesFiltrados.map(c => (
                        <button key={c.id} type="button" className="block w-full px-2 py-1.5 text-left text-sm hover:bg-orange-50" onClick={() => {
                          setE(x => ({ ...x, cliente_id: c.id, destinatario: c.nome, telefone: x.telefone || c.telefone }))
                          setBuscaCli(null)
                        }}>
                          {c.nome}{c.cidade_uf ? <span className="text-xs text-muted-foreground"> · {c.cidade_uf}</span> : null}
                        </button>
                      ))}
                  </div>
                </div>
              )}
              <Campo rotulo="Telefone no local">
                <input className={inputClasse} value={e.telefone || ""} onChange={x => set("telefone", x.target.value)} placeholder="(00) 00000-0000" />
              </Campo>
            </Secao>

            <Secao titulo="Destino" icone={<Navigation className="h-3.5 w-3.5" />}>
              <Campo rotulo="Estado e cidade *">
                <CidadeSelect uf={e.uf} cidade={e.cidade} onChange={(c, uf) => {
                  setE(x => ({ ...x, uf, cidade: c?.nome ?? null, cidade_ibge: c?.ibge ?? null }))
                  if (c && !pinoExato) moverPino(c.lat, c.lng, false, true)
                  if (!c) { setDistancia(null) }
                }} />
              </Campo>
              <Campo rotulo="Endereço (opcional)">
                <div className="flex gap-2">
                  <input className={inputClasse} value={e.endereco || ""} onChange={x => set("endereco", x.target.value)} placeholder="Rua, número / sítio, estrada, km" />
                  <Button type="button" variant="outline" size="icon" title="Localizar o endereço exato no mapa" disabled={localizando} onClick={localizarEndereco}>
                    <Crosshair className="h-4 w-4" />
                  </Button>
                </div>
              </Campo>
              {(distancia || calculando) && (
                <div className="flex items-center gap-3 rounded-lg bg-[#0f172a] px-3 py-2.5 text-white">
                  <Route className="h-5 w-5 text-[#f3a35f]" />
                  <div className="text-sm">
                    {calculando ? "Calculando distância..." : (
                      <>
                        <b className="text-base">{formatarKm(distancia!.km)}</b> de {origemNome}
                        <span className="text-white/70"> · {distancia!.estimada ? "estimativa (linha reta × 1,3)" : `por estrada${distancia!.minutos ? ` · ${formatarDuracao(distancia!.minutos)}` : ""}`}</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </Secao>

            <Secao titulo="Carga e data" icone={<Package className="h-3.5 w-3.5" />}>
              <div className="grid grid-cols-2 gap-2">
                <Campo rotulo="Chegada prevista">
                  <input className={inputClasse} type="date" value={e.chegada_prevista || ""} onChange={x => set("chegada_prevista", x.target.value)} />
                </Campo>
                <Campo rotulo="Peso (kg)">
                  <input className={inputClasse} inputMode="decimal" value={e.peso_kg ?? ""} onChange={x => set("peso_kg", x.target.value)} />
                </Campo>
              </div>
              <Campo rotulo="O que vai">
                <input className={inputClasse} value={e.descricao_carga || ""} onChange={x => set("descricao_carga", x.target.value)} placeholder="Ex.: Estufa 12 × 50 m — pedido 1234" />
              </Campo>
              {podeGerenciar && (
                <Campo rotulo="Viagem">
                  <select className={inputClasse} value={e.viagem_id || ""} onChange={x => set("viagem_id", x.target.value || null)}>
                    <option value="">A programar (sem viagem ainda)</option>
                    {viagensAbertas.map(v => <option key={v.id} value={v.id}>{v.titulo || "Viagem"} · saída {formatarData(v.saida_prevista)}</option>)}
                  </select>
                </Campo>
              )}
              <Campo rotulo="Observações">
                <Textarea rows={2} value={e.observacoes || ""} onChange={x => set("observacoes", x.target.value)} placeholder="Ex.: descarregar na sede; ligar 1 h antes" />
              </Campo>
            </Secao>
          </div>

          <div className="space-y-2">
            <Mapa altura={560} pontoEditavel={pino} centralizar={centralizar} ajustarAoMudar={false}
              origem={{ lat: config.origem_lat, lng: config.origem_lng, nome: config.origem_nome }}
              onMover={(lat, lng) => moverPino(lat, lng, true)} />
            <div className="flex items-start justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {pino
                  ? pinoExato ? "Ponto exato marcado. Arraste para ajustar." : "Ponto no centro da cidade. Clique no mapa ou arraste para marcar o local exato (opcional)."
                  : "Escolha a cidade: o ponto aparece no mapa. Para o local exato, clique no mapa ou use o botão de mira."}
              </span>
              {pino && <button type="button" className="shrink-0 hover:text-red-600 inline-flex items-center gap-1" onClick={() => { setPino(null); setPinoExato(false); setDistancia(null) }}><X className="h-3 w-3" /> tirar ponto</button>}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t bg-muted/30 px-6 py-4">
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando || !e.destinatario?.trim() || !e.cidade} className={laranja}>
            {salvando ? "Salvando..." : e.id ? "Salvar" : podeGerenciar ? "Criar entrega" : "Solicitar entrega"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ======================================================================
// VIAGEM
// ======================================================================

export function ViagemDialog({ aberto, inicial, cadastros, entregas, onFechar, onSalvo }: {
  aberto: boolean
  inicial: Partial<EntViagem> | null
  cadastros: EntCadastros
  entregas: EntEntrega[]
  onFechar: () => void
  onSalvo: (id: string) => void
}) {
  const [v, setV] = useState<Partial<EntViagem>>({})
  const [escolhidas, setEscolhidas] = useState<string[]>([])
  const [filtroUf, setFiltroUf] = useState("")
  const [salvando, setSalvando] = useState(false)
  useEffect(() => {
    if (!aberto) return
    setV(inicial?.saida_prevista ? inicial : { saida_prevista: new Date().toISOString().slice(0, 10), terceirizada: false, ...(inicial || {}) })
    setEscolhidas(inicial?.id
      ? entregas.filter(e => e.viagem_id === inicial.id && e.status !== "cancelada").sort((a, b) => a.ordem - b.ordem).map(e => e.id)
      : [])
    setFiltroUf("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, inicial])
  const set = (c: keyof EntViagem, x: unknown) => setV(a => ({ ...a, [c]: x }))

  const veiculos = cadastros.veiculos.filter(x => (x.ativo || x.id === v.veiculo_id) &&
    (v.terceirizada ? !x.proprio && (!v.transportadora_id || x.transportadora_id === v.transportadora_id) : x.proprio))
  const motoristas = cadastros.motoristas.filter(x => (x.ativo || x.id === v.motorista_id) &&
    (v.terceirizada ? (!v.transportadora_id || x.transportadora_id === v.transportadora_id) : !x.transportadora_id))
  const veic = cadastros.veiculos.find(x => x.id === v.veiculo_id)

  // entregas que podem ir: as desta viagem + as "a programar"
  const disponiveis = entregas.filter(e => e.status !== "cancelada" && (e.status === "a_programar" || (v.id && e.viagem_id === v.id)))
  const ufs = [...new Set(disponiveis.map(e => e.uf).filter(Boolean))].sort() as string[]
  const listadas = disponiveis.filter(e => !filtroUf || e.uf === filtroUf)
  const pesoEscolhido = escolhidas.reduce((s, id) => s + (Number(entregas.find(e => e.id === id)?.peso_kg) || 0), 0)
  const cap = Number(veic?.capacidade_kg) || 0
  const alternar = (id: string) => setEscolhidas(l => l.includes(id) ? l.filter(x => x !== id) : [...l, id])

  const salvar = async () => {
    setSalvando(true)
    const r = await salvarViagem({ ...v, saida_prevista: v.saida_prevista || "", entregas: escolhidas })
    setSalvando(false)
    if (!r.ok) return toast.error(r.erro)
    toast.success(v.id ? "Viagem salva" : "Viagem criada")
    onSalvo(r.dados!.id)
  }

  return (
    <Dialog open={aberto} onOpenChange={o => { if (!o) onFechar() }}>
      <DialogContent className="sm:max-w-4xl max-h-[94vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="border-b bg-gradient-to-r from-orange-50 to-transparent px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d97021] text-white"><Truck className="h-4 w-4" /></span>
            {v.id ? "Editar viagem" : "Nova viagem"}
          </DialogTitle>
          <DialogDescription>Uma saída do caminhão, passando por uma ou mais entregas.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 p-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Campo rotulo="Nome da viagem (opcional)">
              <input className={inputClasse} value={v.titulo || ""} onChange={x => set("titulo", x.target.value)} placeholder="Ex.: Rota Sul de Minas" />
            </Campo>
            <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-muted p-1">
              {[false, true].map(t => (
                <button key={String(t)} type="button" onClick={() => setV(a => ({ ...a, terceirizada: t, veiculo_id: null, motorista_id: null, transportadora_id: null }))}
                  className={`rounded-md py-1.5 text-sm font-medium transition-colors ${!!v.terceirizada === t ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                  {t ? "Terceirizada" : "Frota própria"}
                </button>
              ))}
            </div>
            {v.terceirizada && (
              <Campo rotulo="Transportadora">
                <select className={inputClasse} value={v.transportadora_id || ""} onChange={x => setV(a => ({ ...a, transportadora_id: x.target.value || null, veiculo_id: null, motorista_id: null }))}>
                  <option value="">— escolha —</option>
                  {cadastros.transportadoras.filter(t => t.ativo || t.id === v.transportadora_id).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </Campo>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Campo rotulo="Caminhão">
                <select className={inputClasse} value={v.veiculo_id || ""} onChange={x => set("veiculo_id", x.target.value || null)}>
                  <option value="">{veiculos.length ? "— escolha —" : "nenhum cadastrado"}</option>
                  {veiculos.map(x => <option key={x.id} value={x.id}>{x.placa}{x.descricao ? ` · ${x.descricao}` : ""}</option>)}
                </select>
              </Campo>
              <Campo rotulo="Motorista">
                <select className={inputClasse} value={v.motorista_id || ""} onChange={x => set("motorista_id", x.target.value || null)}>
                  <option value="">{motoristas.length ? "— escolha —" : "nenhum cadastrado"}</option>
                  {motoristas.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
                </select>
              </Campo>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Campo rotulo="Saída *"><input className={inputClasse} type="date" value={v.saida_prevista || ""} onChange={x => set("saida_prevista", x.target.value)} /></Campo>
              <Campo rotulo="Retorno previsto"><input className={inputClasse} type="date" value={v.retorno_previsto || ""} onChange={x => set("retorno_previsto", x.target.value)} /></Campo>
            </div>
            <Campo rotulo={v.terceirizada ? "Valor do frete (R$)" : "Custo da viagem (R$)"}>
              <input className={inputClasse} inputMode="decimal" value={v.custo_frete ?? ""} onChange={x => set("custo_frete", x.target.value)} />
            </Campo>
            <Campo rotulo="Observações"><Textarea rows={2} value={v.observacoes || ""} onChange={x => set("observacoes", x.target.value)} /></Campo>
          </div>

          {/* Entregas da viagem */}
          <div className="flex flex-col rounded-xl border">
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
              <div className="text-sm font-semibold">Entregas desta viagem <span className="text-muted-foreground font-normal">({escolhidas.length})</span></div>
              {ufs.length > 1 && (
                <select className="h-7 rounded-md border bg-background px-2 text-xs" value={filtroUf} onChange={x => setFiltroUf(x.target.value)}>
                  <option value="">Todos os estados</option>
                  {ufs.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              )}
            </div>
            <div className="flex-1 max-h-[360px] overflow-y-auto divide-y">
              {listadas.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">Nenhuma entrega &quot;a programar&quot;. Crie entregas e depois coloque na viagem.</p>}
              {listadas.map(e => {
                const marcado = escolhidas.includes(e.id)
                const pos = escolhidas.indexOf(e.id)
                return (
                  <label key={e.id} className={`flex cursor-pointer items-start gap-3 px-3 py-2.5 text-sm transition-colors ${marcado ? "bg-orange-50/70" : "hover:bg-muted/40"}`}>
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold ${marcado ? "border-[#d97021] bg-[#d97021] text-white" : "bg-background"}`}>
                      {marcado ? pos + 1 : ""}
                    </span>
                    <input type="checkbox" className="sr-only" checked={marcado} onChange={() => alternar(e.id)} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{e.destinatario}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[e.cidade, e.uf].filter(Boolean).join(" - ") || "sem cidade"}
                        {e.distancia_km != null ? ` · ${formatarKm(e.distancia_km)}` : ""}
                        {e.peso_kg ? ` · ${Number(e.peso_kg).toLocaleString("pt-BR")} kg` : ""}
                        {e.chegada_prevista ? ` · até ${formatarData(e.chegada_prevista)}` : ""}
                      </div>
                    </div>
                    {e.status !== "a_programar" && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ring-1 ring-inset ${STATUS_ENTREGA[e.status].classe}`}>{STATUS_ENTREGA[e.status].rotulo}</span>}
                    {marcado && <Check className="h-4 w-4 text-[#d97021]" />}
                  </label>
                )
              })}
            </div>
            <div className="border-t px-3 py-2.5 text-xs">
              <div className="flex justify-between">
                <span>Peso total</span>
                <b className={cap && pesoEscolhido > cap ? "text-red-600" : ""}>{pesoEscolhido.toLocaleString("pt-BR")} kg{cap ? ` de ${cap.toLocaleString("pt-BR")}` : ""}</b>
              </div>
              {cap > 0 && (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${pesoEscolhido > cap ? "bg-red-500" : "bg-[#d97021]"}`} style={{ width: `${Math.min(100, (pesoEscolhido / cap) * 100)}%` }} />
                </div>
              )}
              <p className="mt-1.5 text-muted-foreground">A ordem em que você marca é a ordem das paradas (dá para mudar depois). A distância da rota é calculada ao salvar.</p>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t bg-muted/30 px-6 py-4">
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando || !v.saida_prevista} className={laranja}>{salvando ? "Salvando e calculando rota..." : v.id ? "Salvar" : "Criar viagem"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ======================================================================
// CADASTROS
// ======================================================================

export function VeiculoDialog({ item, transportadoras, onFechar, onSalvo }: {
  item: Partial<EntVeiculo> | null
  transportadoras: EntTransportadora[]
  onFechar: () => void
  onSalvo: () => void
}) {
  const [v, setV] = useState<Partial<EntVeiculo>>({})
  useEffect(() => { if (item) setV({ proprio: true, cor: "#d97021", ativo: true, ...item }) }, [item])
  const set = (c: keyof EntVeiculo, x: unknown) => setV(a => ({ ...a, [c]: x }))
  return (
    <Dialog open={!!item} onOpenChange={o => { if (!o) onFechar() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-[#d97021]" /> {v.id ? "Editar veículo" : "Novo veículo"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-muted p-1">
            {[true, false].map(p => (
              <button key={String(p)} type="button" onClick={() => set("proprio", p)}
                className={`rounded-md py-1.5 text-sm font-medium ${v.proprio === p ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{p ? "Próprio" : "Terceiro"}</button>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_70px] gap-2">
            <Campo rotulo="Placa *"><input className={inputClasse} value={v.placa || ""} onChange={x => set("placa", x.target.value.toUpperCase())} /></Campo>
            <Campo rotulo="Cor no mapa"><input type="color" className="h-9 w-full cursor-pointer rounded border" value={v.cor || "#d97021"} onChange={x => set("cor", x.target.value)} /></Campo>
          </div>
          <Campo rotulo="Tipo / descrição"><input className={inputClasse} value={v.descricao || ""} onChange={x => set("descricao", x.target.value)} placeholder="Ex.: Carreta, Truck, Caminhão 3/4, Carro pequeno" /></Campo>
          <Campo rotulo="Capacidade (kg)"><input className={inputClasse} inputMode="decimal" value={v.capacidade_kg ?? ""} onChange={x => set("capacidade_kg", x.target.value)} /></Campo>
          <div className="rounded-xl border bg-orange-50/50 p-3 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#a8541a]">Frete deste veículo</div>
            <div className="grid grid-cols-3 gap-2">
              <Campo rotulo="R$ por km"><input className={inputClasse} inputMode="decimal" value={v.frete_valor_km ?? ""} onChange={x => set("frete_valor_km", x.target.value)} placeholder="geral" /></Campo>
              <Campo rotulo="R$ por kg"><input className={inputClasse} inputMode="decimal" value={v.frete_valor_kg ?? ""} onChange={x => set("frete_valor_kg", x.target.value)} placeholder="geral" /></Campo>
              <Campo rotulo="Mínimo (R$)"><input className={inputClasse} inputMode="decimal" value={v.frete_minimo ?? ""} onChange={x => set("frete_minimo", x.target.value)} placeholder="geral" /></Campo>
            </div>
            <p className="text-[11px] text-muted-foreground">Campo vazio usa a tabela geral de frete. A calculadora sugere o menor veículo que leva o peso do orçamento.</p>
          </div>
          {!v.proprio && (
            <Campo rotulo="Transportadora">
              <select className={inputClasse} value={v.transportadora_id || ""} onChange={x => set("transportadora_id", x.target.value || null)}>
                <option value="">—</option>
                {transportadoras.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </Campo>
          )}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#d97021]" checked={v.ativo ?? true} onChange={x => set("ativo", x.target.checked)} /> Ativo</label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button className={laranja} disabled={!v.placa?.trim()} onClick={async () => {
            const r = await salvarVeiculo({ ...v, placa: v.placa || "" })
            if (!r.ok) return toast.error(r.erro)
            toast.success("Caminhão salvo"); onSalvo()
          }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function MotoristaDialog({ item, transportadoras, onFechar, onSalvo }: {
  item: Partial<EntMotorista> | null
  transportadoras: EntTransportadora[]
  onFechar: () => void
  onSalvo: () => void
}) {
  const [m, setM] = useState<Partial<EntMotorista>>({})
  useEffect(() => { if (item) setM({ ativo: true, ...item }) }, [item])
  const set = (c: keyof EntMotorista, x: unknown) => setM(a => ({ ...a, [c]: x }))
  return (
    <Dialog open={!!item} onOpenChange={o => { if (!o) onFechar() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{m.id ? "Editar motorista" : "Novo motorista"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <FotoPerfil nome={m.nome || ""} foto={m.foto_url} tipo="motorista" onChange={url => set("foto_url", url)} />
          <Campo rotulo="Nome *"><input className={inputClasse} value={m.nome || ""} onChange={x => set("nome", x.target.value)} /></Campo>
          <Campo rotulo="Telefone / WhatsApp"><input className={inputClasse} value={m.telefone || ""} onChange={x => set("telefone", x.target.value)} /></Campo>
          <div className="grid grid-cols-2 gap-2">
            <Campo rotulo="CNH"><input className={inputClasse} value={m.cnh || ""} onChange={x => set("cnh", x.target.value)} /></Campo>
            <Campo rotulo="Validade da CNH"><input className={inputClasse} type="date" value={m.cnh_validade || ""} onChange={x => set("cnh_validade", x.target.value)} /></Campo>
          </div>
          <Campo rotulo="Trabalha para">
            <select className={inputClasse} value={m.transportadora_id || ""} onChange={x => set("transportadora_id", x.target.value || null)}>
              <option value="">ArcoForte (motorista próprio)</option>
              {transportadoras.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </Campo>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#d97021]" checked={m.ativo ?? true} onChange={x => set("ativo", x.target.checked)} /> Ativo</label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button className={laranja} disabled={!m.nome?.trim()} onClick={async () => {
            const r = await salvarMotorista({ ...m, nome: m.nome || "" })
            if (!r.ok) return toast.error(r.erro)
            toast.success("Motorista salvo"); onSalvo()
          }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TransportadoraDialog({ item, onFechar, onSalvo }: {
  item: Partial<EntTransportadora> | null
  onFechar: () => void
  onSalvo: () => void
}) {
  const [t, setT] = useState<Partial<EntTransportadora>>({})
  useEffect(() => { if (item) setT({ ativo: true, ...item }) }, [item])
  const set = (c: keyof EntTransportadora, x: unknown) => setT(a => ({ ...a, [c]: x }))
  return (
    <Dialog open={!!item} onOpenChange={o => { if (!o) onFechar() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-[#d97021]" /> {t.id ? "Editar transportadora" : "Nova transportadora"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Campo rotulo="Nome *"><input className={inputClasse} value={t.nome || ""} onChange={x => set("nome", x.target.value)} /></Campo>
          <div className="grid grid-cols-2 gap-2">
            <Campo rotulo="CNPJ / CPF"><input className={inputClasse} value={t.documento || ""} onChange={x => set("documento", x.target.value)} /></Campo>
            <Campo rotulo="Telefone"><input className={inputClasse} value={t.telefone || ""} onChange={x => set("telefone", x.target.value)} /></Campo>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Campo rotulo="Contato"><input className={inputClasse} value={t.contato || ""} onChange={x => set("contato", x.target.value)} /></Campo>
            <Campo rotulo="E-mail"><input className={inputClasse} value={t.email || ""} onChange={x => set("email", x.target.value)} /></Campo>
          </div>
          <Campo rotulo="Observações"><Textarea rows={2} value={t.observacoes || ""} onChange={x => set("observacoes", x.target.value)} /></Campo>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#d97021]" checked={t.ativo ?? true} onChange={x => set("ativo", x.target.checked)} /> Ativa</label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button className={laranja} disabled={!t.nome?.trim()} onClick={async () => {
            const r = await salvarTransportadora({ ...t, nome: t.nome || "" })
            if (!r.ok) return toast.error(r.erro)
            toast.success("Transportadora salva"); onSalvo()
          }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
