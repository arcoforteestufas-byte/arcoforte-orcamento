"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Building2, CalendarDays, CheckCircle2, ChevronRight, Clock, Copy, Handshake, MapPin, MapPinned, Maximize2, Package, Pencil, Plus,
  Radio, RefreshCw, Route, Star, Trash2, Truck, UserRound, XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cancelarEntrega, excluirCadastro, programarEntrega, salvarOrigem, salvarTabelaFrete } from "@/app/actions/entregas"
import {
  NOMES_UF, STATUS_ENTREGA, STATUS_VIAGEM, formatarKm, posicaoRecente,
  type EntEntrega, type EntMotorista, type EntPainel, type EntTransportadora, type EntVeiculo, type EntViagem,
} from "@/lib/entregas-types"
import { cn } from "@/lib/utils"
import { formatarData, inputClasse } from "../crm/crm-utils"
import { Mapa, escaparHtml, type CaminhaoMapa, type LinhaMapa, type PontoMapa } from "./mapa"
import { CidadeSelect } from "./cidade-select"
import {
  EntregaDialog, MotoristaDialog, TransportadoraDialog, VeiculoDialog, ViagemDialog, type EntregaInicial,
} from "./entregas-dialogs"

type Aba = "rotas" | "mapa" | "agenda" | "programar" | "cadastros"

const hoje = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date())
function somarDias(iso: string, dias: number) {
  const d = new Date(iso + "T12:00:00")
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

const PERIODOS = [
  { v: "7", r: "Próximos 7 dias" },
  { v: "30", r: "Próximos 30 dias" },
  { v: "mes", r: "Este mês" },
  { v: "proxmes", r: "Próximo mês" },
  { v: "ano", r: "Este ano" },
  { v: "futuras", r: "Todas as futuras" },
  { v: "tudo", r: "Tudo (inclui passadas)" },
  { v: "custom", r: "Escolher datas..." },
] as const

function intervalo(periodo: string, de: string, ate: string): [string | null, string | null] {
  const h = hoje()
  const [a, m] = h.split("-").map(Number)
  const fimMes = (ano: number, mes: number) => `${ano}-${String(mes).padStart(2, "0")}-${String(new Date(ano, mes, 0).getDate()).padStart(2, "0")}`
  switch (periodo) {
    case "7": return [h, somarDias(h, 7)]
    case "15": return [h, somarDias(h, 15)]
    case "30": return [h, somarDias(h, 30)]
    case "60": return [h, somarDias(h, 60)]
    case "90": return [h, somarDias(h, 90)]
    case "mes": return [`${a}-${String(m).padStart(2, "0")}-01`, fimMes(a, m)]
    case "proxmes": { const am = m === 12 ? a + 1 : a, mm = m === 12 ? 1 : m + 1; return [`${am}-${String(mm).padStart(2, "0")}-01`, fimMes(am, mm)] }
    case "ano": return [`${a}-01-01`, `${a}-12-31`]
    case "futuras": return [h, null]
    case "custom": return [de || null, ate || null]
    default: return [null, null]
  }
}

/** Cor do estado pela quantidade de entregas */
function corPorQuantidade(n: number) {
  if (!n) return undefined
  if (n === 1) return "#fde2c8"
  if (n <= 3) return "#f9bf8a"
  if (n <= 6) return "#f29a52"
  return "#d97021"
}

function diaMes(iso: string) {
  const [, m, d] = iso.split("-")
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
  return { dia: d, mes: meses[Number(m) - 1] }
}

export function EntregasClient({ painel, novaDoLead, abaInicial }: {
  painel: EntPainel
  novaDoLead: EntregaInicial | null
  abaInicial: string | null
}) {
  const router = useRouter()
  const abas: Aba[] = ["rotas", "mapa", "agenda", "programar", "cadastros"]
  const [aba, setAba] = useState<Aba>(abas.find(a => a === abaInicial) || (painel.podeGerenciar ? "mapa" : "rotas"))
  const [entregaEdit, setEntregaEdit] = useState<EntregaInicial | null>(novaDoLead)
  const [viagemEdit, setViagemEdit] = useState<Partial<EntViagem> | null>(null)

  // abriu vindo do lead: limpa o ?lead= da barra para não reabrir ao atualizar
  useEffect(() => {
    if (novaDoLead) window.history.replaceState(null, "", "/entregas")
  }, [novaDoLead])

  // "ao vivo": atualiza a cada 30 s enquanto a aba do navegador está visível
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh() }, 30000)
    return () => clearInterval(t)
  }, [router])

  if (painel.erro) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
        <h2 className="text-lg font-semibold mb-1">Entregas indisponível</h2>
        <p>{painel.erro}</p>
      </div>
    )
  }

  const h = hoje()
  const viagemDe = (id: string | null) => painel.viagens.find(v => v.id === id)
  const dataDaEntrega = (e: EntEntrega) => e.chegada_prevista || viagemDe(e.viagem_id)?.saida_prevista || null
  const emRota = painel.viagens.filter(v => v.status === "em_rota")
  const aProgramar = painel.entregas.filter(e => e.status === "a_programar")
  const prox30 = painel.entregas.filter(e => {
    const d = dataDaEntrega(e)
    return d && d >= h && d <= somarDias(h, 30) && e.status !== "cancelada" && e.status !== "entregue"
  })
  const ufsProx = new Set(prox30.map(e => e.uf).filter(Boolean))
  const mesAtual = h.slice(0, 7)
  const entreguesMes = painel.entregas.filter(e => e.status === "entregue" && e.entregue_em?.slice(0, 7) === mesAtual)

  const kpis = [
    { r: "Caminhões em rota", v: emRota.length, i: Radio, c: "from-blue-500 to-blue-600" },
    { r: "Entregas em 30 dias", v: prox30.length, extra: ufsProx.size ? `${ufsProx.size} estado(s)` : "", i: CalendarDays, c: "from-orange-400 to-[#d97021]" },
    { r: "A programar", v: aProgramar.length, i: Clock, c: "from-amber-400 to-amber-500", acao: () => setAba("programar") },
    { r: "Entregues no mês", v: entreguesMes.length, i: CheckCircle2, c: "from-emerald-500 to-emerald-600" },
  ]

  const listaAbas: [Aba, string, typeof MapPin][] = [
    ["rotas", "Rotas e fretes", Route],
    ["mapa", "Mapa de entregas", MapPinned],
    ["agenda", "Agenda de viagens", CalendarDays],
    ["programar", `A programar${aProgramar.length ? ` (${aProgramar.length})` : ""}`, Clock],
    ...(painel.podeGerenciar ? [["cadastros", "Caminhões e motoristas", Truck] as [Aba, string, typeof MapPin]] : []),
  ]

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Cabeçalho */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0f172a] p-5 text-white shadow-sm">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-[#d97021]/30 blur-3xl" />
        <div className="pointer-events-none absolute right-24 -bottom-20 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-white/60"><Truck className="h-4 w-4" /> Logística</div>
            <h2 className="text-2xl font-bold tracking-tight">Entregas</h2>
            <p className="text-sm text-white/60">Saindo de <b className="text-white/90">{painel.config.origem_nome} - {painel.config.origem_uf}</b> para todo o Brasil.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="icon" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" title="Atualizar" onClick={() => router.refresh()}><RefreshCw className="h-4 w-4" /></Button>
            <Link href="/painel-entregas" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 text-sm font-medium text-white hover:bg-white/20" title="Painel em tela cheia (bom para TV)">
              <Maximize2 className="h-4 w-4" /> Tela cheia
            </Link>
            {painel.podeGerenciar && (
              <Button variant="outline" className="gap-1 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => setViagemEdit({})}><Truck className="h-4 w-4" /> Nova viagem</Button>
            )}
            <Button className="gap-1 bg-[#d97021] hover:bg-[#c3631b]" onClick={() => setEntregaEdit({})}>
              <Plus className="h-4 w-4" /> {painel.podeGerenciar ? "Nova entrega" : "Solicitar entrega"}
            </Button>
          </div>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map(k => (
            <button key={k.r} onClick={k.acao} disabled={!k.acao}
              className="flex items-center gap-3 rounded-xl bg-white/[0.06] p-3 text-left ring-1 ring-white/10 transition-colors enabled:hover:bg-white/10">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${k.c} shadow`}><k.i className="h-5 w-5" /></span>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wide text-white/60 truncate">{k.r}</div>
                <div className="text-xl font-bold leading-tight">{k.v}</div>
                {k.extra && <div className="text-[11px] text-white/50">{k.extra}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border bg-background p-1 shadow-sm w-fit max-w-full">
        {listaAbas.map(([v, r, I]) => (
          <button key={v} onClick={() => setAba(v)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${aba === v ? "bg-[#d97021] text-white shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
            <I className="h-4 w-4" /> {r}
          </button>
        ))}
      </div>

      {aba === "rotas" && <AbaRotas painel={painel} dataDaEntrega={dataDaEntrega} onSolicitar={setEntregaEdit} />}
      {aba === "mapa" && <AbaMapa painel={painel} dataDaEntrega={dataDaEntrega} onEditar={setEntregaEdit} />}
      {aba === "agenda" && <AbaAgenda painel={painel} />}
      {aba === "programar" && <AbaProgramar painel={painel} entregas={aProgramar} onEditar={setEntregaEdit} />}
      {aba === "cadastros" && painel.podeGerenciar && <AbaCadastros painel={painel} />}

      <EntregaDialog aberto={!!entregaEdit} inicial={entregaEdit} viagens={painel.viagens} podeGerenciar={painel.podeGerenciar} config={painel.config}
        onFechar={() => setEntregaEdit(null)} onSalvo={() => { setEntregaEdit(null); router.refresh() }} />
      <ViagemDialog aberto={!!viagemEdit} inicial={viagemEdit} cadastros={painel} entregas={painel.entregas}
        onFechar={() => setViagemEdit(null)} onSalvo={(id) => { setViagemEdit(null); router.push(`/entregas/viagem/${id}`) }} />
    </div>
  )
}

// ======================================================================
// ROTAS E FRETES (para os vendedores aproveitarem o frete)
// ======================================================================

function AbaRotas({ painel, dataDaEntrega, onSolicitar }: {
  painel: EntPainel
  dataDaEntrega: (e: EntEntrega) => string | null
  onSolicitar: (e: EntregaInicial) => void
}) {
  const [periodo, setPeriodo] = useState("30")
  const [uf, setUf] = useState<string | null>(null)
  const [ini, fim] = intervalo(periodo, "", "")
  const origem = { lat: painel.config.origem_lat, lng: painel.config.origem_lng, nome: painel.config.origem_nome }

  const entregasPeriodo = painel.entregas.filter(e => {
    if (e.status === "cancelada" || e.status === "entregue") return false
    const d = dataDaEntrega(e)
    return !!d && (!ini || d >= ini) && (!fim || d <= fim)
  })
  const porUf: Record<string, number> = {}
  for (const e of entregasPeriodo) if (e.uf) porUf[e.uf] = (porUf[e.uf] || 0) + 1
  const coresUf = Object.fromEntries(Object.entries(porUf).map(([u, n]) => [u, corPorQuantidade(n)!]))
  const dicaUf = Object.fromEntries(Object.entries(porUf).map(([u, n]) => [u, `${n} entrega(s) no período`]))

  const viagens = painel.viagens
    .filter(v => (v.status === "planejada" || v.status === "em_rota") && (!fim || v.saida_prevista <= fim) && (v.retorno_previsto || v.saida_prevista) >= (ini || "0000"))
    .sort((a, b) => a.saida_prevista.localeCompare(b.saida_prevista))
    .map(v => {
      const paradas = painel.entregas.filter(e => e.viagem_id === v.id && e.status !== "cancelada").sort((a, b) => a.ordem - b.ordem)
      return { v, paradas, ufs: [...new Set(paradas.map(p => p.uf).filter(Boolean))] as string[] }
    })
    .filter(x => !uf || x.ufs.includes(uf))

  const linhas: LinhaMapa[] = viagens.map(({ v, paradas }) => {
    const cor = painel.veiculos.find(x => x.id === v.veiculo_id)?.cor || "#d97021"
    const pts: [number, number][] = v.rota?.length ? v.rota : [[origem.lat, origem.lng], ...paradas.filter(p => p.lat != null).map(p => [p.lat!, p.lng!] as [number, number])]
    return { pontos: pts, cor, espessura: 3, popupHtml: `<b>${escaparHtml(v.titulo || "Viagem")}</b><br/>Saída ${escaparHtml(formatarData(v.saida_prevista))}` }
  })
  const pontos: PontoMapa[] = entregasPeriodo.filter(e => e.lat != null && (!uf || e.uf === uf)).map(e => ({
    id: e.id, lat: e.lat!, lng: e.lng!,
    cor: e.status === "a_programar" ? STATUS_ENTREGA.a_programar.cor : painel.veiculos.find(x => x.id === viagemDe(e.viagem_id)?.veiculo_id)?.cor || "#d97021",
    popupHtml: `<div style="font:13px system-ui"><b>${escaparHtml([e.cidade, e.uf].filter(Boolean).join(" - "))}</b><br/>${escaparHtml(formatarData(dataDaEntrega(e)))}${e.distancia_km != null ? ` · ${escaparHtml(formatarKm(e.distancia_km))}` : ""}</div>`,
  }))
  function viagemDe(id: string | null) { return painel.viagens.find(v => v.id === id) }

  const ufsOrdenadas = Object.entries(porUf).sort((a, b) => b[1] - a[1])

  const textoRota = (v: EntViagem, paradas: EntEntrega[]) => {
    const cidades = [...new Set(paradas.map(p => [p.cidade, p.uf].filter(Boolean).join("/")).filter(Boolean))]
    return `🚚 Saindo dia ${formatarData(v.saida_prevista)} de ${painel.config.origem_nome}-${painel.config.origem_uf} passando por: ${cidades.join(", ")}. Aproveite o frete!`
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border bg-gradient-to-r from-orange-50 via-background to-background p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d97021] text-white"><Handshake className="h-5 w-5" /></span>
          <div>
            <div className="font-semibold">Aproveite o frete</div>
            <p className="text-sm text-muted-foreground">Veja para onde os caminhões vão e ofereça para clientes perto dessas rotas. Clique num estado para filtrar.</p>
          </div>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
          {[["15", "15 dias"], ["30", "30 dias"], ["60", "60 dias"], ["90", "90 dias"]].map(([v, r]) => (
            <button key={v} onClick={() => setPeriodo(v)} className={`rounded-md px-3 py-1 font-medium ${periodo === v ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{r}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <div className="space-y-3">
          <Mapa coresUf={coresUf} dicaUf={dicaUf} ufSelecionada={uf} onUf={u => setUf(atual => atual === u ? null : u)}
            linhas={linhas} pontos={pontos} origem={origem} altura="min(70vh, 640px)" />
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>Entregas no período:</span>
            {[["1", "#fde2c8"], ["2-3", "#f9bf8a"], ["4-6", "#f29a52"], ["7+", "#d97021"]].map(([r, c]) => (
              <span key={r} className="inline-flex items-center gap-1"><span className="h-3 w-5 rounded-sm" style={{ background: c }} />{r}</span>
            ))}
            <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 text-[#d97021]" /> origem</span>
          </div>
          {ufsOrdenadas.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {ufsOrdenadas.map(([u, n]) => (
                <button key={u} onClick={() => setUf(atual => atual === u ? null : u)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${uf === u ? "bg-[#d97021] text-white ring-[#d97021]" : "bg-background ring-border hover:bg-orange-50"}`}>
                  {NOMES_UF[u] || u} <span className={`rounded-full px-1.5 ${uf === u ? "bg-white/25" : "bg-muted"}`}>{n}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{uf ? `Viagens passando por ${NOMES_UF[uf]}` : "Próximas viagens"} <span className="text-muted-foreground font-normal">({viagens.length})</span></h3>
            {uf && <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setUf(null)}>ver todas</button>}
          </div>
          {viagens.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed p-10 text-center text-sm text-muted-foreground">
              <Truck className="mx-auto mb-2 h-8 w-8 opacity-40" /> Nenhuma viagem programada {uf ? `para ${NOMES_UF[uf]} ` : ""}neste período.
            </div>
          )}
          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            {viagens.map(({ v, paradas, ufs }) => {
              const ve = painel.veiculos.find(x => x.id === v.veiculo_id)
              const peso = paradas.reduce((s, p) => s + (Number(p.peso_kg) || 0), 0)
              const cap = Number(ve?.capacidade_kg) || 0
              const sobra = cap ? cap - peso : null
              const { dia, mes } = diaMes(v.saida_prevista)
              const cidades = [...new Set(paradas.map(p => p.cidade).filter(Boolean))] as string[]
              return (
                <div key={v.id} className="overflow-hidden rounded-2xl border bg-background shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex gap-4 p-4">
                    <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl text-white" style={{ background: ve?.cor || "#d97021" }}>
                      <span className="text-2xl font-bold leading-none">{dia}</span>
                      <span className="text-[11px] uppercase">{mes}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold truncate">{v.titulo || "Viagem"}</div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${STATUS_VIAGEM[v.status].classe}`}>{STATUS_VIAGEM[v.status].rotulo}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{painel.config.origem_nome}</span>
                        {cidades.slice(0, 5).map(c => <span key={c} className="inline-flex items-center gap-1"><ChevronRight className="h-3 w-3" />{c}</span>)}
                        {cidades.length > 5 && <span>+{cidades.length - 5}</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {ufs.map(u => <span key={u} className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold">{u}</span>)}
                        {v.distancia_ida_km != null && <span className="text-xs text-muted-foreground">· {formatarKm(v.distancia_ida_km)} de ida</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-4 py-2.5">
                    <div className="text-xs">
                      {sobra == null ? <span className="text-muted-foreground">{paradas.length} entrega(s){ve ? ` · ${ve.placa}` : ""}</span>
                        : sobra > 0 ? <span className="font-medium text-emerald-700">Cabe mais ~{Math.round(sobra).toLocaleString("pt-BR")} kg</span>
                        : <span className="font-medium text-red-600">Caminhão cheio</span>}
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" title="Copiar texto para oferecer ao cliente"
                        onClick={() => { navigator.clipboard.writeText(textoRota(v, paradas)); toast.success("Texto copiado — cole no WhatsApp do cliente") }}>
                        <Copy className="h-3.5 w-3.5" /> Copiar
                      </Button>
                      <Button size="sm" className="h-7 gap-1 bg-[#d97021] px-2 text-xs hover:bg-[#c3631b]"
                        onClick={() => onSolicitar({ chegada_prevista: v.retorno_previsto || v.saida_prevista, observacoes: `Aproveitar a viagem de ${formatarData(v.saida_prevista)}${v.titulo ? ` (${v.titulo})` : ""}` })}>
                        <Plus className="h-3.5 w-3.5" /> Tenho cliente nessa rota
                      </Button>
                      <Link href={`/entregas/viagem/${v.id}`} className="inline-flex h-7 items-center rounded-md px-2 text-xs font-medium text-[#d97021] hover:bg-orange-50">abrir</Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ======================================================================
// MAPA DE ENTREGAS
// ======================================================================

function AbaMapa({ painel, dataDaEntrega, onEditar }: {
  painel: EntPainel
  dataDaEntrega: (e: EntEntrega) => string | null
  onEditar: (e: EntregaInicial) => void
}) {
  const [periodo, setPeriodo] = useState("30")
  const [de, setDe] = useState("")
  const [ate, setAte] = useState("")
  const [veiculo, setVeiculo] = useState("")
  const [uf, setUf] = useState<string | null>(null)
  const [mostrarEntregues, setMostrarEntregues] = useState(false)
  const [mostrarAProgramar, setMostrarAProgramar] = useState(true)

  const veic = (id: string | null | undefined) => painel.veiculos.find(v => v.id === id)
  const mot = (id: string | null | undefined) => painel.motoristas.find(m => m.id === id)
  const viagemDe = (id: string | null) => painel.viagens.find(v => v.id === id)
  const origem = { lat: painel.config.origem_lat, lng: painel.config.origem_lng, nome: painel.config.origem_nome }

  const noPeriodo = useMemo(() => {
    const [ini, fim] = intervalo(periodo, de, ate)
    return painel.entregas.filter(e => {
      if (e.status === "cancelada") return false
      if (e.status === "entregue" && !mostrarEntregues) return false
      if (e.status === "a_programar" && !mostrarAProgramar) return false
      const vg = viagemDe(e.viagem_id)
      if (veiculo && vg?.veiculo_id !== veiculo) return false
      const d = dataDaEntrega(e)
      if (!d) return e.status === "a_programar" && !veiculo
      if (ini && d < ini) return false
      if (fim && d > fim) return false
      return true
    }).sort((a, b) => (dataDaEntrega(a) || "9999").localeCompare(dataDaEntrega(b) || "9999"))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [painel, periodo, de, ate, veiculo, mostrarEntregues, mostrarAProgramar])
  const filtradas = noPeriodo.filter(e => !uf || e.uf === uf)

  const porUf: Record<string, number> = {}
  for (const e of noPeriodo) if (e.uf) porUf[e.uf] = (porUf[e.uf] || 0) + 1

  const pontos: PontoMapa[] = filtradas.filter(e => e.lat != null && e.lng != null).map(e => {
    const vg = viagemDe(e.viagem_id)
    const v = veic(vg?.veiculo_id)
    const st = STATUS_ENTREGA[e.status]
    const d = dataDaEntrega(e)
    return {
      id: e.id, lat: e.lat!, lng: e.lng!,
      cor: e.status === "entregue" || e.status === "a_programar" ? st.cor : v?.cor || st.cor,
      rotulo: e.status === "entregue" ? "✓" : "",
      popupHtml: `<div style="font:13px system-ui;min-width:190px">
        <b>${escaparHtml(e.destinatario)}</b><br/>
        ${escaparHtml([e.cidade, e.uf].filter(Boolean).join(" - "))}${e.distancia_km != null ? ` · ${escaparHtml(formatarKm(e.distancia_km))}` : ""}<br/>
        <span style="color:${st.cor};font-weight:600">${st.rotulo}</span>${d ? ` · ${escaparHtml(formatarData(d))}` : ""}<br/>
        ${v ? `🚚 ${escaparHtml(v.placa)}${mot(vg?.motorista_id) ? " · " + escaparHtml(mot(vg?.motorista_id)!.nome) : ""}<br/>` : ""}
        ${e.descricao_carga ? `<span style="color:#64748b">${escaparHtml(e.descricao_carga)}</span><br/>` : ""}
        ${vg ? `<a href="/entregas/viagem/${vg.id}" style="color:#d97021;font-weight:600">Abrir viagem →</a>` : ""}
      </div>`,
    }
  })

  const caminhoes: CaminhaoMapa[] = painel.viagens
    .filter(v => v.ultima_lat != null && v.ultima_lng != null && (v.status === "em_rota" || posicaoRecente(v.ultima_posicao_em)))
    .filter(v => !veiculo || v.veiculo_id === veiculo)
    .map(v => {
      const ve = veic(v.veiculo_id)
      const quando = v.ultima_posicao_em ? new Date(v.ultima_posicao_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""
      return {
        id: v.id, lat: v.ultima_lat!, lng: v.ultima_lng!, cor: ve?.cor || "#2563eb", placa: ve?.placa || "Caminhão",
        recente: posicaoRecente(v.ultima_posicao_em),
        popupHtml: `<div style="font:13px system-ui"><b>🚚 ${escaparHtml(ve?.placa || "Caminhão")}</b><br/>${escaparHtml(mot(v.motorista_id)?.nome || "")}<br/>
          Última posição: ${escaparHtml(quando)}${posicaoRecente(v.ultima_posicao_em) ? "" : " (desatualizada)"}<br/>
          <a href="/entregas/viagem/${v.id}" style="color:#d97021;font-weight:600">Abrir viagem →</a></div>`,
      }
    })

  const semPonto = filtradas.filter(e => e.lat == null || e.lng == null).length

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <select className={cn(inputClasse, "w-auto bg-background")} value={periodo} onChange={e => setPeriodo(e.target.value)}>
            {PERIODOS.map(p => <option key={p.v} value={p.v}>{p.r}</option>)}
          </select>
          {periodo === "custom" && (
            <>
              <input type="date" className={cn(inputClasse, "w-auto bg-background")} value={de} onChange={e => setDe(e.target.value)} />
              <span className="text-sm text-muted-foreground">até</span>
              <input type="date" className={cn(inputClasse, "w-auto bg-background")} value={ate} onChange={e => setAte(e.target.value)} />
            </>
          )}
          <select className={cn(inputClasse, "w-auto bg-background")} value={veiculo} onChange={e => setVeiculo(e.target.value)}>
            <option value="">Todos os caminhões</option>
            {painel.veiculos.map(v => <option key={v.id} value={v.id}>{v.placa}{v.descricao ? ` · ${v.descricao}` : ""}</option>)}
          </select>
          <select className={cn(inputClasse, "w-auto bg-background")} value={uf || ""} onChange={e => setUf(e.target.value || null)}>
            <option value="">Todos os estados</option>
            {Object.keys(NOMES_UF).sort().map(u => <option key={u} value={u}>{u} — {NOMES_UF[u]}{porUf[u] ? ` (${porUf[u]})` : ""}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="accent-[#d97021]" checked={mostrarAProgramar} onChange={e => setMostrarAProgramar(e.target.checked)} /> A programar</label>
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="accent-[#d97021]" checked={mostrarEntregues} onChange={e => setMostrarEntregues(e.target.checked)} /> Entregues</label>
        </div>
        <Mapa pontos={pontos} caminhoes={caminhoes} origem={origem} altura="min(68vh, 640px)"
          coresUf={Object.fromEntries(Object.entries(porUf).map(([u, n]) => [u, corPorQuantidade(n)!]))}
          dicaUf={Object.fromEntries(Object.entries(porUf).map(([u, n]) => [u, `${n} entrega(s)`]))}
          ufSelecionada={uf} onUf={u => setUf(atual => atual === u ? null : u)} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_ENTREGA.a_programar.cor }} /> A programar</span>
          <span>Programadas / em rota: cor do caminhão</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_ENTREGA.entregue.cor }} /> Entregue</span>
          <span>🚚 posição ao vivo (atualiza a cada 30 s)</span>
          {semPonto > 0 && <span className="text-amber-700">{semPonto} entrega(s) sem local no mapa</span>}
        </div>
      </div>

      <div className="rounded-2xl border bg-background shadow-sm">
        <div className="border-b px-4 py-3 text-sm font-semibold">{filtradas.length} entrega(s){uf ? ` em ${NOMES_UF[uf]}` : " no período"}</div>
        <div className="max-h-[68vh] overflow-y-auto divide-y">
          {filtradas.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhuma entrega neste período.</p>}
          {filtradas.map(e => {
            const vg = viagemDe(e.viagem_id)
            const v = veic(vg?.veiculo_id)
            const st = STATUS_ENTREGA[e.status]
            const d = dataDaEntrega(e)
            return (
              <div key={e.id} className="flex gap-3 px-4 py-3 text-sm">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: e.status === "a_programar" || e.status === "entregue" ? st.cor : v?.cor || st.cor }} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{e.destinatario}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[e.cidade, e.uf].filter(Boolean).join(" - ") || "sem cidade"}{d ? ` · ${formatarData(d)}` : ""}{e.distancia_km != null ? ` · ${formatarKm(e.distancia_km)}` : ""}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className={`rounded-full px-1.5 py-0.5 font-medium ring-1 ring-inset ${st.classe}`}>{st.rotulo}</span>
                    {v && <span className="text-muted-foreground">🚚 {v.placa}</span>}
                    {e.lat == null && <span className="text-amber-700">sem local</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {vg && <Link href={`/entregas/viagem/${vg.id}`} className="text-xs font-medium text-[#d97021] hover:underline">viagem</Link>}
                  {(painel.podeGerenciar || (e.status === "a_programar" && e.solicitado_por === painel.userId)) && (
                    <button className="text-muted-foreground hover:text-foreground" title="Editar" onClick={() => onEditar(e)}><Pencil className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ======================================================================
// AGENDA
// ======================================================================

function AbaAgenda({ painel }: { painel: EntPainel }) {
  const [mostrar, setMostrar] = useState<"proximas" | "passadas">("proximas")
  const h = hoje()
  const lista = painel.viagens
    .filter(v => mostrar === "proximas"
      ? v.status === "em_rota" || v.status === "planejada" || (v.retorno_previsto || v.saida_prevista) >= h
      : (v.status === "concluida" || v.status === "cancelada") && (v.retorno_previsto || v.saida_prevista) < h)
    .sort((a, b) => mostrar === "proximas" ? a.saida_prevista.localeCompare(b.saida_prevista) : b.saida_prevista.localeCompare(a.saida_prevista))

  const meses = new Map<string, EntViagem[]>()
  for (const v of lista) {
    const k = v.saida_prevista.slice(0, 7)
    meses.set(k, [...(meses.get(k) || []), v])
  }
  const nomeMes = (k: string) => new Date(k + "-15T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit text-sm">
        {(["proximas", "passadas"] as const).map(m => (
          <button key={m} onClick={() => setMostrar(m)} className={`rounded-md px-3 py-1 font-medium ${mostrar === m ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
            {m === "proximas" ? "Próximas e em andamento" : "Encerradas"}
          </button>
        ))}
      </div>
      {lista.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed p-10 text-center text-sm text-muted-foreground">
          <Truck className="mx-auto mb-2 h-8 w-8 opacity-40" /> Nenhuma viagem {mostrar === "proximas" ? "programada" : "encerrada"}.
        </div>
      )}
      {[...meses.entries()].map(([k, vs]) => (
        <div key={k}>
          <h3 className="mb-2 text-sm font-semibold capitalize text-muted-foreground">{nomeMes(k)}</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {vs.map(v => <CartaoViagem key={v.id} v={v} painel={painel} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

function CartaoViagem({ v, painel }: { v: EntViagem; painel: EntPainel }) {
  const ve = painel.veiculos.find(x => x.id === v.veiculo_id)
  const mo = painel.motoristas.find(x => x.id === v.motorista_id)
  const tr = painel.transportadoras.find(x => x.id === v.transportadora_id)
  const paradas = painel.entregas.filter(e => e.viagem_id === v.id && e.status !== "cancelada")
  const entregues = paradas.filter(e => e.status === "entregue").length
  const peso = paradas.reduce((s, e) => s + (Number(e.peso_kg) || 0), 0)
  const cap = Number(ve?.capacidade_kg) || 0
  const st = STATUS_VIAGEM[v.status]
  const cidades = [...new Set(paradas.map(e => e.cidade).filter(Boolean))]
  const { dia, mes } = diaMes(v.saida_prevista)

  return (
    <Link href={`/entregas/viagem/${v.id}`} className="group block overflow-hidden rounded-2xl border bg-background shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex gap-3 p-4">
        <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-xl text-white" style={{ background: ve?.cor || "#94a3b8" }}>
          <span className="text-xl font-bold leading-none">{dia}</span>
          <span className="text-[10px] uppercase">{mes}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold truncate">{v.titulo || (cidades.length ? cidades.slice(0, 3).join(", ") : "Viagem")}</div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${st.classe}`}>
              {v.status === "em_rota" && posicaoRecente(v.ultima_posicao_em) ? "● " : ""}{st.rotulo}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {v.retorno_previsto ? `volta ${formatarData(v.retorno_previsto)}` : "sem data de volta"}
            {v.distancia_total_km != null ? ` · ${formatarKm(v.distancia_total_km)} (ida e volta)` : ""}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Truck className="h-3.5 w-3.5" />{ve ? ve.placa : "sem caminhão"}</span>
            <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{mo?.nome || "sem motorista"}</span>
            {v.terceirizada && <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{tr?.nome || "terceirizada"}</span>}
          </div>
        </div>
      </div>
      <div className="border-t bg-muted/20 px-4 py-2.5">
        <div className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1"><Package className="h-4 w-4 text-muted-foreground" /> {paradas.length} entrega(s){entregues ? ` · ${entregues} feita(s)` : ""}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
        {cap > 0 && (
          <div className="mt-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full ${peso > cap ? "bg-red-500" : "bg-[#d97021]"}`} style={{ width: `${Math.min(100, (peso / cap) * 100)}%` }} />
            </div>
            <div className={`mt-0.5 text-[11px] ${peso > cap ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
              {peso.toLocaleString("pt-BR")} de {cap.toLocaleString("pt-BR")} kg{peso > cap ? " — acima da capacidade!" : ""}
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}

// ======================================================================
// A PROGRAMAR
// ======================================================================

function AbaProgramar({ painel, entregas, onEditar }: {
  painel: EntPainel
  entregas: EntEntrega[]
  onEditar: (e: EntregaInicial) => void
}) {
  const router = useRouter()
  const viagens = painel.viagens.filter(v => v.status === "planejada" || v.status === "em_rota").sort((a, b) => a.saida_prevista.localeCompare(b.saida_prevista))
  const nome = (id: string | null) => painel.usuarios.find(u => u.id === id)?.nome || "—"

  if (!entregas.length) {
    return <div className="rounded-2xl border-2 border-dashed p-10 text-center text-sm text-muted-foreground"><CheckCircle2 className="mx-auto mb-2 h-8 w-8 opacity-40" /> Nenhuma entrega esperando programação.</div>
  }
  return (
    <div className="rounded-2xl border bg-background shadow-sm divide-y">
      {entregas.map(e => (
        <div key={e.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{e.destinatario}</span>
              {e.uf && <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold">{e.cidade} - {e.uf}</span>}
              {e.distancia_km != null && <span className="text-xs text-muted-foreground">{formatarKm(e.distancia_km)}</span>}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              {e.chegada_prevista && <span>Desejada: {formatarData(e.chegada_prevista)}</span>}
              {e.peso_kg ? <span>{Number(e.peso_kg).toLocaleString("pt-BR")} kg</span> : null}
              {e.descricao_carga && <span>{e.descricao_carga}</span>}
              <span>Solicitada por {nome(e.solicitado_por)} em {formatarData(e.criado_em)}</span>
              {e.lead_id && <Link href={`/crm/lead/${e.lead_id}`} className="text-[#d97021] hover:underline">ver lead</Link>}
            </div>
            {e.observacoes && <div className="mt-1 text-xs text-muted-foreground italic">{e.observacoes}</div>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {painel.podeGerenciar && (
              <select className={cn(inputClasse, "w-64")} defaultValue="" onChange={async ev => {
                const vid = ev.target.value
                if (!vid) return
                const r = await programarEntrega(e.id, vid)
                if (!r.ok) { ev.target.value = ""; return toast.error(r.erro) }
                toast.success("Entrega colocada na viagem")
                router.refresh()
              }}>
                <option value="">Colocar na viagem...</option>
                {viagens.map(v => {
                  const ve = painel.veiculos.find(x => x.id === v.veiculo_id)
                  return <option key={v.id} value={v.id}>{formatarData(v.saida_prevista)} · {v.titulo || "Viagem"}{ve ? ` · ${ve.placa}` : ""}</option>
                })}
              </select>
            )}
            {(painel.podeGerenciar || e.solicitado_por === painel.userId) && (
              <Button size="icon" variant="ghost" title="Editar" onClick={() => onEditar(e)}><Pencil className="h-4 w-4" /></Button>
            )}
            {painel.podeGerenciar && (
              <Button size="icon" variant="ghost" className="text-red-600" title="Cancelar entrega" onClick={async () => {
                if (!confirm(`Cancelar a entrega de "${e.destinatario}"?`)) return
                const r = await cancelarEntrega(e.id)
                if (!r.ok) return toast.error(r.erro)
                router.refresh()
              }}><XCircle className="h-4 w-4" /></Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ======================================================================
// CADASTROS
// ======================================================================

function AbaCadastros({ painel }: { painel: EntPainel }) {
  const router = useRouter()
  const [veic, setVeic] = useState<Partial<EntVeiculo> | null>(null)
  const [mot, setMot] = useState<Partial<EntMotorista> | null>(null)
  const [trans, setTrans] = useState<Partial<EntTransportadora> | null>(null)
  const [origemUf, setOrigemUf] = useState<string | null>(painel.config.origem_uf)
  const [origemCidade, setOrigemCidade] = useState<{ nome: string; ibge: number } | null>(
    painel.config.origem_ibge ? { nome: painel.config.origem_nome, ibge: painel.config.origem_ibge } : null)
  const atualizar = () => router.refresh()
  const nomeTr = (id: string | null) => painel.transportadoras.find(t => t.id === id)?.nome

  const excluir = async (tabela: "ent_transportadoras" | "ent_veiculos" | "ent_motoristas", id: string, nome: string) => {
    if (!confirm(`Excluir "${nome}"? As viagens antigas ficam sem esse cadastro. Para só esconder, desmarque "Ativo".`)) return
    const r = await excluirCadastro(tabela, id)
    if (!r.ok) return toast.error(r.erro)
    atualizar()
  }
  const vazio = (t: string) => <p className="px-4 py-3 text-sm text-muted-foreground">{t}</p>

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 rounded-2xl border bg-background p-4 shadow-sm md:flex-row md:items-end">
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-semibold"><Star className="h-4 w-4 text-[#d97021]" /> Cidade de origem dos caminhões</div>
          <p className="text-xs text-muted-foreground">As distâncias e rotas são calculadas a partir dela.</p>
          <CidadeSelect uf={origemUf} cidade={origemCidade?.nome} onChange={(c, u) => { setOrigemUf(u); setOrigemCidade(c ? { nome: c.nome, ibge: c.ibge } : null) }} className="max-w-md" />
        </div>
        <Button className="bg-[#d97021] hover:bg-[#c3631b]" disabled={!origemCidade || origemCidade.ibge === painel.config.origem_ibge} onClick={async () => {
          const r = await salvarOrigem(origemCidade!.ibge)
          if (!r.ok) return toast.error(r.erro)
          toast.success("Origem salva. As distâncias novas usam esta cidade.")
          atualizar()
        }}>Salvar origem</Button>
      </section>

      <TabelaFrete painel={painel} onSalvo={atualizar} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Lista titulo="Veículos" icone={<Truck className="h-4 w-4 text-[#d97021]" />} onNovo={() => setVeic({})}>
          {!painel.veiculos.length && vazio("Nenhum caminhão cadastrado.")}
          {painel.veiculos.map(v => (
            <Linha key={v.id} ativo={v.ativo} cor={v.cor} principal={`${v.placa}${v.descricao ? ` · ${v.descricao}` : ""}`}
              detalhe={[v.proprio ? "Próprio" : `Terceiro${nomeTr(v.transportadora_id) ? ` · ${nomeTr(v.transportadora_id)}` : ""}`, v.capacidade_kg ? `${Number(v.capacidade_kg).toLocaleString("pt-BR")} kg` : "", v.frete_valor_km != null ? `frete ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v.frete_valor_km))}/km` : "frete: tabela geral"].filter(Boolean).join(" · ")}
              onEditar={() => setVeic(v)} onExcluir={() => excluir("ent_veiculos", v.id, v.placa)} />
          ))}
        </Lista>
        <Lista titulo="Motoristas" icone={<UserRound className="h-4 w-4 text-[#d97021]" />} onNovo={() => setMot({})}>
          {!painel.motoristas.length && vazio("Nenhum motorista cadastrado.")}
          {painel.motoristas.map(m => {
            const vencida = m.cnh_validade && m.cnh_validade < hoje()
            return (
              <Linha key={m.id} ativo={m.ativo} principal={m.nome}
                detalhe={[nomeTr(m.transportadora_id) || "Próprio", m.telefone, m.cnh_validade ? `CNH até ${formatarData(m.cnh_validade)}${vencida ? " (VENCIDA)" : ""}` : ""].filter(Boolean).join(" · ")}
                onEditar={() => setMot(m)} onExcluir={() => excluir("ent_motoristas", m.id, m.nome)} />
            )
          })}
        </Lista>
        <Lista titulo="Transportadoras" icone={<Building2 className="h-4 w-4 text-[#d97021]" />} onNovo={() => setTrans({})}>
          {!painel.transportadoras.length && vazio("Nenhuma transportadora cadastrada.")}
          {painel.transportadoras.map(t => (
            <Linha key={t.id} ativo={t.ativo} principal={t.nome} detalhe={[t.contato, t.telefone].filter(Boolean).join(" · ") || "—"}
              onEditar={() => setTrans(t)} onExcluir={() => excluir("ent_transportadoras", t.id, t.nome)} />
          ))}
        </Lista>
      </div>

      <VeiculoDialog item={veic} transportadoras={painel.transportadoras} onFechar={() => setVeic(null)} onSalvo={() => { setVeic(null); atualizar() }} />
      <MotoristaDialog item={mot} transportadoras={painel.transportadoras} onFechar={() => setMot(null)} onSalvo={() => { setMot(null); atualizar() }} />
      <TransportadoraDialog item={trans} onFechar={() => setTrans(null)} onSalvo={() => { setTrans(null); atualizar() }} />
    </div>
  )
}

// componentes da aba Cadastros (fora do componente para não recriar a cada render)
function Lista({ titulo, icone, onNovo, children }: { titulo: string; icone: React.ReactNode; onNovo: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-background shadow-sm">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">{icone}{titulo}</h3>
        <Button size="sm" variant="outline" className="gap-1" onClick={onNovo}><Plus className="h-3.5 w-3.5" /> Novo</Button>
      </header>
      <div className="divide-y">{children}</div>
    </section>
  )
}

function Linha({ ativo, principal, detalhe, onEditar, onExcluir, cor }: { ativo: boolean; principal: string; detalhe: string; onEditar: () => void; onExcluir: () => void; cor?: string }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 text-sm ${ativo ? "" : "opacity-50"}`}>
      {cor && <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: cor }} />}
      <div className="min-w-0 flex-1"><div className="font-medium truncate">{principal}{ativo ? "" : " (inativo)"}</div><div className="text-xs text-muted-foreground truncate">{detalhe}</div></div>
      <button className="text-muted-foreground hover:text-foreground" onClick={onEditar}><Pencil className="h-3.5 w-3.5" /></button>
      <button className="text-muted-foreground hover:text-red-600" onClick={onExcluir}><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  )
}

/** Tabela de frete usada no cálculo do CRM e do orçamento */
function TabelaFrete({ painel, onSalvo }: { painel: EntPainel; onSalvo: () => void }) {
  const c = painel.config
  const br = (n: number) => String(n).replace(".", ",")
  const [t, setT] = useState({
    km: br(c.frete_valor_km), volta: c.frete_cobrar_volta, kg: br(c.frete_valor_kg), minimo: br(c.frete_minimo),
    desconto: br(c.frete_desconto_viagem), obs: c.frete_observacao || "",
  })
  const [salvando, setSalvando] = useState(false)
  const n = (s: string) => Number(String(s).replace(/\./g, "").replace(",", ".")) || 0
  // exemplo: 300 km de ida, 2.000 kg
  const exKm = 300 * (t.volta ? 2 : 1)
  const exemplo = Math.max(n(t.minimo), exKm * n(t.km) + 2000 * n(t.kg))
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
  const campo = "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"

  return (
    <section className="rounded-2xl border bg-background p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Route className="h-4 w-4 text-[#d97021]" /> Tabela geral de frete</div>
      <p className="mb-4 text-xs text-muted-foreground">
        Usada pelos vendedores no CRM e no orçamento: <b>km × R$/km + peso × R$/kg</b>, com desconto ao aproveitar viagem já programada, nunca abaixo do mínimo.
        Cada veículo pode ter seu próprio valor (em Veículos → editar); quando o veículo não tem valor, vale esta tabela.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="grid gap-1 text-xs font-medium">R$ por km<input className={campo} inputMode="decimal" value={t.km} onChange={e => setT({ ...t, km: e.target.value })} /></label>
        <label className="grid gap-1 text-xs font-medium">R$ por kg (opcional)<input className={campo} inputMode="decimal" value={t.kg} onChange={e => setT({ ...t, kg: e.target.value })} /></label>
        <label className="grid gap-1 text-xs font-medium">Frete mínimo (R$)<input className={campo} inputMode="decimal" value={t.minimo} onChange={e => setT({ ...t, minimo: e.target.value })} /></label>
        <label className="grid gap-1 text-xs font-medium">Desconto ao aproveitar viagem (%)<input className={campo} inputMode="decimal" value={t.desconto} onChange={e => setT({ ...t, desconto: e.target.value })} /></label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" className="accent-[#d97021]" checked={t.volta} onChange={e => setT({ ...t, volta: e.target.checked })} /> Cobrar ida e volta</label>
      </div>
      <label className="mt-3 grid gap-1 text-xs font-medium">Texto extra no orçamento (opcional)
        <input className={campo} value={t.obs} onChange={e => setT({ ...t, obs: e.target.value })} placeholder="Ex.: descarga por conta do cliente" />
      </label>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">Exemplo: cidade a 300 km, 2.000 kg → <b className="text-foreground">{brl.format(exemplo)}</b>{n(t.desconto) ? ` (aproveitando viagem: ${brl.format(Math.max(n(t.minimo), exemplo * (1 - n(t.desconto) / 100)))})` : ""}</span>
        <Button className="bg-[#d97021] hover:bg-[#c3631b]" disabled={salvando} onClick={async () => {
          setSalvando(true)
          const r = await salvarTabelaFrete({
            frete_valor_km: n(t.km), frete_cobrar_volta: t.volta, frete_valor_kg: n(t.kg), frete_minimo: n(t.minimo),
            frete_desconto_viagem: n(t.desconto), frete_observacao: t.obs,
          })
          setSalvando(false)
          if (!r.ok) return toast.error(r.erro)
          toast.success("Tabela de frete salva")
          onSalvo()
        }}>{salvando ? "Salvando..." : "Salvar tabela de frete"}</Button>
      </div>
    </section>
  )
}
