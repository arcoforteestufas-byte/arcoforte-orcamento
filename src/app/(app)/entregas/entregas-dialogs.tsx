"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Building2, Crosshair, MapPin, Search, Truck, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { listarClientesParaLead } from "@/app/actions/crm"
import {
  geocodificar, salvarEntrega, salvarMotorista, salvarTransportadora, salvarVeiculo, salvarViagem,
} from "@/app/actions/entregas"
import { UFS } from "@/lib/crm-types"
import type { EntCadastros, EntEntrega, EntMotorista, EntTransportadora, EntVeiculo, EntViagem } from "@/lib/entregas-types"
import { formatarData, inputClasse } from "../crm/crm-utils"
import { Mapa } from "./mapa"

const laranja = "bg-[#d97021] hover:bg-[#c3631b]"

function Campo({ rotulo, children, className = "" }: { rotulo: string; children: React.ReactNode; className?: string }) {
  return <div className={`grid gap-1.5 ${className}`}><Label>{rotulo}</Label>{children}</div>
}

// ======================================================================
// ENTREGA
// ======================================================================

export type EntregaInicial = Partial<EntEntrega> & { aviso?: string }

export function EntregaDialog({ aberto, inicial, viagens, podeGerenciar, onFechar, onSalvo }: {
  aberto: boolean
  inicial: EntregaInicial | null
  viagens: EntViagem[]
  podeGerenciar: boolean
  onFechar: () => void
  onSalvo: (id: string) => void
}) {
  const [e, setE] = useState<EntregaInicial>({})
  const [pino, setPino] = useState<{ lat: number; lng: number } | null>(null)
  const [centralizar, setCentralizar] = useState(0)
  const [localizando, setLocalizando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [buscaCli, setBuscaCli] = useState<string | null>(null)
  const [clientes, setClientes] = useState<Awaited<ReturnType<typeof listarClientesParaLead>> | null>(null)

  useEffect(() => {
    if (!aberto) return
    const base = inicial || {}
    setE({ ...base })
    setPino(base.lat != null && base.lng != null ? { lat: base.lat, lng: base.lng } : null)
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

  const localizar = async () => {
    if (!e.endereco && !e.cidade) return toast.error("Preencha o endereço ou a cidade.")
    setLocalizando(true)
    const g = await geocodificar(e.endereco || null, e.cidade || null, e.uf || null)
    setLocalizando(false)
    if (!g) return toast.error("Não encontrei no mapa. Clique no mapa para marcar o local.")
    setPino({ lat: g.lat, lng: g.lng })
    setCentralizar(c => c + 1)
    if (g.precisao === "cidade") toast.message("Achei só a cidade. Arraste o marcador para o local exato.")
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
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-[#d97021]" /> {e.id ? "Editar entrega" : podeGerenciar ? "Nova entrega" : "Solicitar entrega"}</DialogTitle>
          {!podeGerenciar && <DialogDescription>A logística recebe a solicitação e programa a viagem.</DialogDescription>}
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <Campo rotulo="Destinatário (cliente) *">
              <div className="flex gap-2">
                <input className={inputClasse} value={e.destinatario || ""} onChange={x => set("destinatario", x.target.value)} />
                <Button type="button" variant="outline" size="icon" title="Escolher cliente cadastrado" onClick={() => setBuscaCli(buscaCli === null ? "" : null)}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </Campo>
            {buscaCli !== null && (
              <div className="rounded-lg border p-2 space-y-2">
                <input autoFocus className={inputClasse} placeholder="Buscar cliente..." value={buscaCli} onChange={x => setBuscaCli(x.target.value)} />
                <div className="max-h-40 overflow-y-auto divide-y rounded border">
                  {!clientes ? <p className="p-2 text-xs text-muted-foreground">Carregando...</p>
                    : clientesFiltrados.map(c => (
                      <button key={c.id} type="button" className="block w-full px-2 py-1.5 text-left text-sm hover:bg-orange-50" onClick={() => {
                        const [cid, uf] = (c.cidade_uf || "").split(/\s*[/-]\s*/)
                        setE(x => ({ ...x, cliente_id: c.id, destinatario: c.nome, telefone: x.telefone || c.telefone, cidade: x.cidade || cid || null, uf: x.uf || (uf && uf.length === 2 ? uf.toUpperCase() : null) }))
                        setBuscaCli(null)
                      }}>
                        {c.nome}{c.cidade_uf ? <span className="text-xs text-muted-foreground"> · {c.cidade_uf}</span> : null}
                      </button>
                    ))}
                </div>
              </div>
            )}
            <Campo rotulo="Telefone no local">
              <input className={inputClasse} value={e.telefone || ""} onChange={x => set("telefone", x.target.value)} />
            </Campo>
            <Campo rotulo="Endereço de entrega">
              <input className={inputClasse} value={e.endereco || ""} onChange={x => set("endereco", x.target.value)} placeholder="Rua, número, bairro / sítio, estrada, km" />
            </Campo>
            <div className="grid grid-cols-[1fr_90px] gap-2">
              <Campo rotulo="Cidade"><input className={inputClasse} value={e.cidade || ""} onChange={x => set("cidade", x.target.value)} /></Campo>
              <Campo rotulo="UF">
                <select className={inputClasse} value={e.uf || ""} onChange={x => set("uf", x.target.value)}>
                  <option value="">—</option>
                  {UFS.map(u => <option key={u}>{u}</option>)}
                </select>
              </Campo>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Campo rotulo="Chegada prevista">
                <input className={inputClasse} type="date" value={e.chegada_prevista || ""} onChange={x => set("chegada_prevista", x.target.value)} />
              </Campo>
              <Campo rotulo="Peso da carga (kg)">
                <input className={inputClasse} inputMode="decimal" value={e.peso_kg ?? ""} onChange={x => set("peso_kg", x.target.value)} />
              </Campo>
            </div>
            <Campo rotulo="O que vai (carga)">
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
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Local no mapa</Label>
              <Button type="button" size="sm" variant="outline" className="gap-1" disabled={localizando} onClick={localizar}>
                <Crosshair className="h-3.5 w-3.5" /> {localizando ? "Localizando..." : "Localizar endereço"}
              </Button>
            </div>
            <Mapa altura={380} pontoEditavel={pino} centralizar={centralizar} ajustarAoMudar={false}
              onMover={(lat, lng) => setPino({ lat, lng })} />
            <p className="text-xs text-muted-foreground">
              {pino ? "Arraste o marcador ou clique no mapa para ajustar o local." : "Clique em \"Localizar endereço\" ou clique no mapa para marcar. Se não marcar, o sistema tenta achar pelo endereço ao salvar."}
            </p>
            {pino && <button type="button" className="text-xs text-muted-foreground hover:text-red-600 inline-flex items-center gap-1" onClick={() => setPino(null)}><X className="h-3 w-3" /> tirar marcação</button>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando || !e.destinatario?.trim()} className={laranja}>
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

export function ViagemDialog({ aberto, inicial, cadastros, onFechar, onSalvo }: {
  aberto: boolean
  inicial: Partial<EntViagem> | null
  cadastros: EntCadastros
  onFechar: () => void
  onSalvo: (id: string) => void
}) {
  const [v, setV] = useState<Partial<EntViagem>>({})
  const [salvando, setSalvando] = useState(false)
  useEffect(() => {
    if (aberto) setV(inicial || { saida_prevista: new Date().toISOString().slice(0, 10), terceirizada: false })
  }, [aberto, inicial])
  const set = (c: keyof EntViagem, x: unknown) => setV(a => ({ ...a, [c]: x }))

  const veiculos = cadastros.veiculos.filter(x => (x.ativo || x.id === v.veiculo_id) &&
    (v.terceirizada ? !x.proprio && (!v.transportadora_id || x.transportadora_id === v.transportadora_id) : x.proprio))
  const motoristas = cadastros.motoristas.filter(x => (x.ativo || x.id === v.motorista_id) &&
    (v.terceirizada ? (!v.transportadora_id || x.transportadora_id === v.transportadora_id) : !x.transportadora_id))
  const veic = cadastros.veiculos.find(x => x.id === v.veiculo_id)

  const salvar = async () => {
    setSalvando(true)
    const r = await salvarViagem({ ...v, saida_prevista: v.saida_prevista || "" })
    setSalvando(false)
    if (!r.ok) return toast.error(r.erro)
    toast.success(v.id ? "Viagem salva" : "Viagem criada")
    onSalvo(r.dados!.id)
  }

  return (
    <Dialog open={aberto} onOpenChange={o => { if (!o) onFechar() }}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-[#d97021]" /> {v.id ? "Editar viagem" : "Nova viagem"}</DialogTitle>
          <DialogDescription>Uma viagem é uma saída do caminhão, que pode passar em vários clientes.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Campo rotulo="Nome da viagem (opcional)">
            <input className={inputClasse} value={v.titulo || ""} onChange={x => set("titulo", x.target.value)} placeholder="Ex.: Rota Sul de Minas" />
          </Campo>
          <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-muted p-1">
            {[false, true].map(t => (
              <button key={String(t)} type="button" onClick={() => setV(a => ({ ...a, terceirizada: t, veiculo_id: null, motorista_id: null, transportadora_id: null }))}
                className={`rounded-md py-1.5 text-sm font-medium transition-colors ${!!v.terceirizada === t ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                {t ? "Terceirizada (transportadora)" : "Frota própria"}
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
          {veic?.capacidade_kg ? <p className="-mt-1 text-xs text-muted-foreground">Capacidade do caminhão: {Number(veic.capacidade_kg).toLocaleString("pt-BR")} kg</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <Campo rotulo="Saída *"><input className={inputClasse} type="date" value={v.saida_prevista || ""} onChange={x => set("saida_prevista", x.target.value)} /></Campo>
            <Campo rotulo="Retorno previsto"><input className={inputClasse} type="date" value={v.retorno_previsto || ""} onChange={x => set("retorno_previsto", x.target.value)} /></Campo>
          </div>
          <Campo rotulo={v.terceirizada ? "Valor do frete (R$)" : "Custo da viagem (R$)"}>
            <input className={inputClasse} inputMode="decimal" value={v.custo_frete ?? ""} onChange={x => set("custo_frete", x.target.value)} />
          </Campo>
          <Campo rotulo="Observações"><Textarea rows={2} value={v.observacoes || ""} onChange={x => set("observacoes", x.target.value)} /></Campo>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando || !v.saida_prevista} className={laranja}>{salvando ? "Salvando..." : v.id ? "Salvar" : "Criar viagem"}</Button>
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
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-[#d97021]" /> {v.id ? "Editar caminhão" : "Novo caminhão"}</DialogTitle></DialogHeader>
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
          <Campo rotulo="Descrição"><input className={inputClasse} value={v.descricao || ""} onChange={x => set("descricao", x.target.value)} placeholder="Ex.: Truck baú, Carreta 12 m" /></Campo>
          <Campo rotulo="Capacidade (kg)"><input className={inputClasse} inputMode="decimal" value={v.capacidade_kg ?? ""} onChange={x => set("capacidade_kg", x.target.value)} /></Campo>
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
