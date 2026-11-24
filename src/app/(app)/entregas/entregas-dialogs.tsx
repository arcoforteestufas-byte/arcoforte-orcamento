"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { lerPedidoSensio, type PedidoSensio } from "@/lib/pedido-sensio"
import { createClient } from "@/utils/supabase/client"
import { Building2, Check, Crosshair, FileSpreadsheet, FileText, Link2, MapPin, Navigation, Package, Route, Search, Truck, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { listarClientesParaLead } from "@/app/actions/crm"
import {
  dadosEntregaDoLead, distanciaDaOrigem, geocodificar, leadsComPedidos, pesoDoPedido, pesosPorCodigo, salvarEntrega, salvarMotorista, salvarTransportadora, salvarVeiculo, salvarViagem,
} from "@/app/actions/entregas"
import {
  STATUS_ENTREGA, formatarDuracao, formatarKm,
  type EntCadastros, type EntConfig, type EntEntrega, type EntItemCarga, type PedidoDoLeadOpcao, type EntMotorista, type EntTransportadora, type EntVeiculo, type EntViagem,
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

            <PedidoDoLead key={aberto ? "aberto" : "fechado"} entrega={e} aberto={aberto} onLigar={(campos, aviso) => {
              setE(x => ({ ...x, ...campos }))
              if (aviso) toast.message(aviso)
            }} />

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

          {/* produtos do pedido: largura toda do formulário */}
          <div className="lg:col-span-2">
            <Secao titulo="Produtos do pedido (Sensio)" icone={<FileSpreadsheet className="h-3.5 w-3.5" />}>
              <ProdutosDaEntrega entrega={e} onChange={campos => setE(x => ({ ...x, ...campos }))} />
            </Secao>
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

/** Quantidade editável (aceita vírgula); grava ao sair do campo ou com Enter */
function QtdInput({ valor, onSalvar }: { valor: number; onSalvar: (q: number) => void }) {
  const [t, setT] = useState(String(valor).replace(".", ","))
  const gravar = () => {
    const q = Number(t.replace(/\./g, "").replace(",", "."))
    if (Number.isFinite(q) && q > 0 && q !== valor) onSalvar(q)
    else setT(String(valor).replace(".", ","))
  }
  return (
    <input className="h-6 w-16 rounded border px-1 text-right" inputMode="decimal" value={t} title="Mude se esta entrega levar só parte do pedido"
      onChange={x => setT(x.target.value)} onBlur={gravar} onKeyDown={x => { if (x.key === "Enter") { x.preventDefault(); gravar() } }} />
  )
}

const pesoDosItens = (itens: EntItemCarga[] | undefined) =>
  Math.round((itens || []).reduce((s, i) => s + (i.peso_unit_kg || 0) * (Number(i.quantidade) || 0), 0) * 100) / 100

/**
 * Produtos da entrega: importa o pedido exportado do Sensio (.xls/.xlsx).
 * Dá para importar mais de um pedido, mudar a quantidade (entrega parcial) e tirar itens.
 * O peso de cada produto vem do cadastro de produtos (pelo código).
 */
function ProdutosDaEntrega({ entrega: e, onChange }: {
  entrega: EntregaInicial
  onChange: (campos: Partial<EntEntrega>) => void
}) {
  const [lendo, setLendo] = useState(false)
  const [listaInteira, setListaInteira] = useState(false)
  const itens = e.itens || []
  const pesoAtual = pesoDosItens(itens)
  const semPeso = itens.filter(i => !i.peso_unit_kg).length
  const pedidos = Array.from(new Set(itens.map(i => i.pedido).filter(Boolean))) as string[]
  const kg = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
  // um resumo por pedido importado: número, cliente, quem importou e quando
  const importacoes = Array.from(itens.reduce((m, i) => {
    const k = i.pedido || ""
    const atual = m.get(k)
    m.set(k, { pedido: i.pedido, cliente: atual?.cliente || i.cliente || null, por: atual?.por || i.importado_por || null, em: atual?.em || i.importado_em || null, n: (atual?.n || 0) + 1 })
    return m
  }, new Map<string, { pedido: string | null; cliente: string | null; por: string | null; em: string | null; n: number }>()).values())
  const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })

  /** troca a lista; o peso da entrega acompanha se estava vazio ou era o calculado */
  const aplicar = (novos: EntItemCarga[], extra: Partial<EntEntrega> = {}) => {
    const campos: Partial<EntEntrega> = { ...extra, itens: novos }
    const pesoCampo = e.peso_kg === null || e.peso_kg === undefined || String(e.peso_kg) === "" ? null : Number(String(e.peso_kg).replace(",", "."))
    if (pesoCampo === null || Math.abs(pesoCampo - pesoAtual) < 0.01) {
      const p = pesoDosItens(novos)
      campos.peso_kg = p > 0 ? p : null
    }
    const nums = Array.from(new Set(novos.map(i => i.pedido).filter(Boolean)))
    campos.pedido_erp = nums.length ? nums.join(", ") : null
    // "O que vai" acompanha os pedidos se estava vazio ou era o texto automático
    if (!e.descricao_carga || /^Pedido Sensio/.test(e.descricao_carga)) {
      campos.descricao_carga = nums.length ? `Pedido Sensio ${nums.join(" + ")} · ${novos.length} produto(s)` : (novos.length ? `${novos.length} produto(s)` : null)
    }
    onChange(campos)
  }

  const importar = async (arquivo: File) => {
    setLendo(true)
    try {
      let lidos: PedidoSensio[]
      if (/\.pdf$/i.test(arquivo.name) || arquivo.type === "application/pdf") {
        // PDF: lido no servidor
        const fd = new FormData()
        fd.append("file", arquivo)
        const resp = await fetch("/api/entregas/pedido-pdf", { method: "POST", body: fd })
        const json = await resp.json().catch(() => ({ erro: "Não consegui ler o PDF." }))
        if (!resp.ok || !json.pedidos) throw new Error(json.erro || "Não consegui ler o PDF.")
        lidos = json.pedidos
      } else {
        const XLSX = await import("xlsx")
        const wb = XLSX.read(await arquivo.arrayBuffer())
        const linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" }) as unknown[][]
        lidos = lerPedidoSensio(linhas)
      }
      // peso: o do PDF do Sensio; se não vier, o do cadastro de produtos
      const [pesos, { data: { user } }] = await Promise.all([
        pesosPorCodigo(lidos.flatMap(p => p.itens.map(i => i.codigo || ""))),
        createClient().auth.getUser(),
      ])
      const quem = (user?.user_metadata?.nome as string | undefined) || user?.email?.split("@")[0] || null
      const quando = new Date().toISOString()
      const numeros = lidos.map(p => p.numero).filter(Boolean)
      const novos: EntItemCarga[] = lidos.flatMap(p => p.itens.map(i => ({
        pedido: p.numero || null, codigo: i.codigo, descricao: i.descricao, unidade: i.unidade, quantidade: i.quantidade,
        peso_unit_kg: i.peso_unit_kg || (i.codigo && pesos[i.codigo]) || null, obs: i.obs,
        cliente: p.cliente, importado_por: quem, importado_em: quando,
      })))
      // pedido importado de novo substitui o anterior
      const lista = [...itens.filter(i => !i.pedido || !numeros.includes(i.pedido)), ...novos]
      const p0 = lidos[0]
      const extra: Partial<EntEntrega> = {}
      if (!e.destinatario?.trim() && p0.cliente) extra.destinatario = p0.cliente
      if (!e.endereco && p0.endereco) extra.endereco = p0.endereco
      if (!e.uf && !e.cidade && p0.uf) extra.uf = p0.uf
      aplicar(lista, extra)
      const sem = novos.filter(i => !i.peso_unit_kg).length
      toast.success(`${novos.length} produto(s) do pedido ${numeros.join(", ") || "importado"}`
        + (sem ? ` · ${sem} sem peso (nem no pedido, nem no cadastro)` : ""))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não consegui ler o arquivo.")
    } finally {
      setLendo(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>Produtos da entrega {itens.length ? `(${itens.length})` : ""}</Label>
        <label className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-muted ${lendo ? "pointer-events-none opacity-50" : ""}`}>
          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> {lendo ? "Lendo..." : itens.length ? "Importar outro pedido" : "Importar pedido do Sensio (Excel ou PDF)"}
          <input type="file" className="hidden" accept=".xls,.xlsx,.csv,.pdf,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={x => { const f = x.target.files?.[0]; x.target.value = ""; if (f) importar(f) }} />
        </label>
      </div>
      {!itens.length ? (
        <p className="text-[11px] text-muted-foreground">No Sensio, exporte o pedido em Excel (.xls) ou PDF e importe aqui para saber quais produtos vão nesta entrega.</p>
      ) : (
        <div className="rounded-lg border bg-background">
          <div className="divide-y border-b bg-muted/30">
            {importacoes.map(p => (
              <div key={p.pedido || "-"} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-2 py-1.5 text-xs">
                <span className="font-semibold">{p.pedido ? `Pedido ${p.pedido}` : "Produtos sem nº de pedido"}</span>
                {p.cliente && <span className="font-medium text-foreground/80">· {p.cliente}</span>}
                <span className="text-muted-foreground">· {p.n} produto(s)</span>
                {(p.por || p.em) && (
                  <span className="w-full text-[11px] text-muted-foreground">
                    Importado{p.por ? ` por ${p.por}` : ""}{p.em ? ` em ${dataHora(p.em)}` : ""}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className={listaInteira ? "" : "max-h-[32rem] overflow-y-auto"}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/90 text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                <tr>
                  <th className="w-16 px-3 py-2 text-left">Cód.</th>
                  <th className="px-3 py-2 text-left">Produto</th>
                  <th className="w-32 px-3 py-2 text-right">Qtd</th>
                  <th className="hidden w-24 px-3 py-2 text-right sm:table-cell">Peso un.</th>
                  <th className="w-24 px-3 py-2 text-right">Peso</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {itens.map((i, idx) => (
                  <tr key={idx} className="align-top odd:bg-background even:bg-muted/20 hover:bg-[#d97021]/5">
                    <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{i.codigo || "—"}</td>
                    <td className="px-3 py-1.5">
                      <div className="font-medium leading-snug">{i.descricao}{pedidos.length > 1 && i.pedido ? <span className="font-normal text-muted-foreground"> · ped. {i.pedido}</span> : null}</div>
                      {i.obs && <div className="text-xs text-amber-800">{i.obs}</div>}
                    </td>
                    <td className="px-3 py-1.5 text-right whitespace-nowrap">
                      <QtdInput key={`${idx}-${i.codigo}-${i.quantidade}`} valor={i.quantidade}
                        onSalvar={q => aplicar(itens.map((y, j) => j === idx ? { ...y, quantidade: q } : y))} /> <span className="inline-block w-6 text-left text-xs text-muted-foreground">{i.unidade || ""}</span>
                    </td>
                    <td className="hidden px-3 py-1.5 text-right whitespace-nowrap text-muted-foreground sm:table-cell">{i.peso_unit_kg ? `${kg(i.peso_unit_kg)} kg` : ""}</td>
                    <td className="px-3 py-1.5 text-right whitespace-nowrap font-medium">{i.peso_unit_kg ? `${kg(i.peso_unit_kg * i.quantidade)} kg` : <span className="text-amber-600" title="Sem peso no pedido e no cadastro de produtos">sem peso</span>}</td>
                    <td className="px-2 py-1.5 text-right">
                      <button type="button" className="text-muted-foreground hover:text-red-600" title="Tirar desta entrega" onClick={() => aplicar(itens.filter((_, j) => j !== idx))}><X className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-2 py-1.5 text-xs">
            <span>
<b>{kg(pesoAtual)} kg</b> calculado
              {semPeso ? <span className="text-amber-700"> · {semPeso} produto(s) sem peso</span> : null}
            </span>
            <span className="flex items-center gap-3">
              {itens.length > 12 && (
                <button type="button" className="font-medium text-primary hover:underline" onClick={() => setListaInteira(v => !v)}>
                  {listaInteira ? "recolher lista" : `ver lista inteira (${itens.length})`}
                </button>
              )}
              <button type="button" className="text-muted-foreground hover:text-red-600" onClick={() => { if (confirm("Tirar todos os produtos desta entrega?")) aplicar([]) }}>limpar</button>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Pedido do lead: liga a entrega (inclusive a avulsa) a um lead e a um pedido (orçamento).
 * Ao ligar, preenche só os campos que estão vazios (cliente, destino, peso, data, carga).
 */
function PedidoDoLead({ entrega: e, aberto, onLigar }: {
  entrega: EntregaInicial
  aberto: boolean
  onLigar: (campos: Partial<EntEntrega>, aviso?: string) => void
}) {
  const [leads, setLeads] = useState<PedidoDoLeadOpcao[] | null>(null)
  const [busca, setBusca] = useState<string | null>(null)
  const [ligando, setLigando] = useState(false)

  // carrega a lista quando precisa (entrega já ligada ou ao abrir a busca)
  useEffect(() => {
    if (aberto && !leads && (e.lead_id || busca !== null)) leadsComPedidos().then(setLeads)
  }, [aberto, leads, e.lead_id, busca])

  const lead = leads?.find(l => l.id === e.lead_id) || null
  const filtrados = useMemo(() => {
    const t = (busca || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
    return (leads || []).filter(l => !t || [l.titulo, l.cliente, l.cidade, l.uf, ...l.pedidos.map(p => p.numero)].filter(Boolean)
      .join(" ").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes(t)).slice(0, 12)
  }, [leads, busca])
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
  const rotuloPedido = (p: PedidoDoLeadOpcao["pedidos"][number]) => `Pedido ${p.numero} — ${brl.format(p.valor)}`

  const ligar = async (l: PedidoDoLeadOpcao) => {
    setLigando(true)
    const r = await dadosEntregaDoLead(l.id)
    setLigando(false)
    if (!r.ok) return toast.error(r.erro)
    const d = r.dados!
    const vazio = (k: keyof EntEntrega) => e[k] === null || e[k] === undefined || e[k] === ""
    const campos: Partial<EntEntrega> = { lead_id: l.id, orcamento_id: d.orcamento_id ?? null }
    if (vazio("cliente_id")) campos.cliente_id = d.cliente_id ?? null
    for (const k of ["destinatario", "telefone", "endereco", "peso_kg", "chegada_prevista", "descricao_carga"] as const) {
      if (vazio(k) && d[k] != null) (campos as Record<string, unknown>)[k] = d[k]
    }
    if (vazio("cidade") && d.cidade) { campos.cidade = d.cidade; campos.uf = d.uf ?? null; campos.cidade_ibge = d.cidade_ibge ?? null }
    const outras = l.entregasAtivas.filter(id => id !== e.id).length
    setBusca(null)
    onLigar(campos, outras
      ? `Atenção: este lead já tem ${outras} entrega(s) cadastrada(s). Confira para não duplicar.`
      : "Entrega ligada ao lead. Os campos vazios foram preenchidos com os dados do pedido.")
  }

  const trocarPedido = async (orcamentoId: string) => {
    const campos: Partial<EntEntrega> = { orcamento_id: orcamentoId || null }
    const p = lead?.pedidos.find(x => x.id === orcamentoId)
    if (p) {
      // carga e peso acompanham o pedido escolhido
      campos.descricao_carga = rotuloPedido(p)
      const peso = await pesoDoPedido(p.id)
      if (peso) campos.peso_kg = peso
    }
    onLigar(campos)
  }

  return (
    <Secao titulo="Pedido do lead" icone={<FileText className="h-3.5 w-3.5" />}>
      {e.lead_id ? (
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2 rounded-lg border bg-background p-2.5 text-sm">
            <div className="min-w-0">
              <div className="font-medium truncate">{lead?.titulo || (leads ? "Lead ligado" : "Carregando...")}</div>
              <div className="text-xs text-muted-foreground">
                {[lead?.cliente, [lead?.cidade, lead?.uf].filter(Boolean).join(" - "), lead?.ganho ? "venda fechada" : lead ? "em negociação" : ""].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs">
              <a href={`/crm/lead/${e.lead_id}`} target="_blank" rel="noopener" className="text-[#d97021] hover:underline">abrir lead</a>
              <button type="button" className="text-muted-foreground hover:text-red-600" title="Desligar do lead"
                onClick={() => onLigar({ lead_id: null, orcamento_id: null })}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {lead && (
            <Campo rotulo="Pedido">
              {lead.pedidos.length ? (
                <select className={inputClasse} value={e.orcamento_id || ""} onChange={x => trocarPedido(x.target.value)}>
                  <option value="">Sem pedido definido</option>
                  {lead.pedidos.map(p => <option key={p.id} value={p.id}>{rotuloPedido(p)}{p.status === "Aprovado" ? " · fechado" : ` · ${p.status}`}</option>)}
                </select>
              ) : <p className="text-xs text-muted-foreground">Este lead ainda não tem orçamento.</p>}
            </Campo>
          )}
        </div>
      ) : busca === null ? (
        <Button type="button" variant="outline" className="w-full gap-1" onClick={() => setBusca("")}>
          <Link2 className="h-4 w-4" /> Ligar ao pedido de um lead
        </Button>
      ) : (
        <div className="rounded-lg border bg-background p-2 space-y-2">
          <div className="flex gap-2">
            <input autoFocus className={inputClasse} placeholder="Buscar lead, cliente, cidade ou nº do pedido..." value={busca} onChange={x => setBusca(x.target.value)} />
            <Button type="button" variant="ghost" size="icon" onClick={() => setBusca(null)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="max-h-56 overflow-y-auto divide-y rounded border">
            {!leads ? <p className="p-2 text-xs text-muted-foreground">Carregando...</p>
              : !filtrados.length ? <p className="p-2 text-xs text-muted-foreground">Nenhum lead encontrado.</p>
              : filtrados.map(l => (
                <button key={l.id} type="button" disabled={ligando} className="block w-full px-2 py-1.5 text-left text-sm hover:bg-orange-50 disabled:opacity-50" onClick={() => ligar(l)}>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium truncate">{l.titulo}</span>
                    {l.ganho && <span className="rounded-full bg-emerald-50 px-1.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">ganho</span>}
                    {l.entregasAtivas.length > 0 && <span className="rounded-full bg-amber-50 px-1.5 text-[10px] text-amber-800 ring-1 ring-inset ring-amber-200">já tem entrega</span>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[l.cliente, [l.cidade, l.uf].filter(Boolean).join(" - "), l.pedidos.length ? `${l.pedidos.length} pedido(s): ${l.pedidos.map(p => p.numero).join(", ")}` : "sem pedido"].filter(Boolean).join(" · ")}
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </Secao>
  )
}

// ======================================================================
// VIAGEM
// ======================================================================

export function ViagemDialog({ aberto, inicial, cadastros, entregas, escolhidasIniciais, onFechar, onSalvo }: {
  aberto: boolean
  /** viagem nova já com estas entregas, nesta ordem */
  escolhidasIniciais?: string[]
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
      : (escolhidasIniciais || []))
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

export function VeiculoDialog({ item, transportadoras, tabelas = [], onFechar, onSalvo }: {
  item: Partial<EntVeiculo> | null
  transportadoras: EntTransportadora[]
  tabelas?: { id: string; nome: string }[]
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
            {tabelas.length > 0 && (
              <Campo rotulo="Tabela de frete">
                <select className={inputClasse} value={v.tabela_frete_id || ""} onChange={x => set("tabela_frete_id", x.target.value || null)}>
                  <option value="">Tabela geral</option>
                  {tabelas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </Campo>
            )}
            <div className="grid grid-cols-3 gap-2">
              <Campo rotulo="R$ por km"><input className={inputClasse} inputMode="decimal" value={v.frete_valor_km ?? ""} onChange={x => set("frete_valor_km", x.target.value)} placeholder="geral" /></Campo>
              <Campo rotulo="R$ por kg"><input className={inputClasse} inputMode="decimal" value={v.frete_valor_kg ?? ""} onChange={x => set("frete_valor_kg", x.target.value)} placeholder="geral" /></Campo>
              <Campo rotulo="Mínimo (R$)"><input className={inputClasse} inputMode="decimal" value={v.frete_minimo ?? ""} onChange={x => set("frete_minimo", x.target.value)} placeholder="geral" /></Campo>
            </div>
            <p className="text-[11px] text-muted-foreground">Campo vazio usa a tabela escolhida acima. Valor preenchido aqui vale só para este veículo. A calculadora sugere o menor veículo que leva o peso do orçamento.</p>
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
