"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Building2, CalendarDays, CheckCircle2, ChevronRight, Clock, MapPin, Package, Pencil, Plus, Radio, RefreshCw,
  Trash2, Truck, UserRound, XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cancelarEntrega, excluirCadastro, programarEntrega } from "@/app/actions/entregas"
import {
  STATUS_ENTREGA, STATUS_VIAGEM, posicaoRecente,
  type EntEntrega, type EntMotorista, type EntPainel, type EntTransportadora, type EntVeiculo, type EntViagem,
} from "@/lib/entregas-types"
import { cn } from "@/lib/utils"
import { formatarData, inputClasse } from "../crm/crm-utils"
import { Mapa, escaparHtml, type CaminhaoMapa, type PontoMapa } from "./mapa"
import {
  EntregaDialog, MotoristaDialog, TransportadoraDialog, VeiculoDialog, ViagemDialog, type EntregaInicial,
} from "./entregas-dialogs"

type Aba = "mapa" | "agenda" | "programar" | "cadastros"

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
  const fimMes = (ano: number, mes: number) => new Date(ano, mes, 0).toISOString().slice(0, 10)
  switch (periodo) {
    case "7": return [h, somarDias(h, 7)]
    case "30": return [h, somarDias(h, 30)]
    case "mes": return [`${a}-${String(m).padStart(2, "0")}-01`, fimMes(a, m)]
    case "proxmes": { const am = m === 12 ? a + 1 : a, mm = m === 12 ? 1 : m + 1; return [`${am}-${String(mm).padStart(2, "0")}-01`, fimMes(am, mm)] }
    case "ano": return [`${a}-01-01`, `${a}-12-31`]
    case "futuras": return [h, null]
    case "custom": return [de || null, ate || null]
    default: return [null, null]
  }
}

export function EntregasClient({ painel, novaDoLead, abaInicial }: {
  painel: EntPainel
  novaDoLead: EntregaInicial | null
  abaInicial: string | null
}) {
  const router = useRouter()
  const [aba, setAba] = useState<Aba>((["mapa", "agenda", "programar", "cadastros"] as const).find(a => a === abaInicial) || "mapa")
  const [entregaEdit, setEntregaEdit] = useState<EntregaInicial | null>(novaDoLead)
  const [viagemEdit, setViagemEdit] = useState<Partial<EntViagem> | null>(null)

  // abriu vindo do lead: limpa o ?lead= da barra para não reabrir ao atualizar
  useEffect(() => {
    if (novaDoLead) window.history.replaceState(null, "", "/entregas")
  }, [novaDoLead])

  // mapa "ao vivo": atualiza a cada 30 s enquanto a aba está visível
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
  const prox7 = painel.entregas.filter(e => {
    const d = dataDaEntrega(e)
    return d && d >= h && d <= somarDias(h, 7) && e.status !== "cancelada" && e.status !== "entregue"
  })
  const mesAtual = h.slice(0, 7)
  const entreguesMes = painel.entregas.filter(e => e.status === "entregue" && e.entregue_em?.slice(0, 7) === mesAtual)

  const kpis = [
    { r: "Caminhões em rota", v: emRota.length, i: Radio, c: "text-blue-700 bg-blue-100" },
    { r: "Entregas nos próximos 7 dias", v: prox7.length, i: CalendarDays, c: "text-orange-700 bg-orange-100" },
    { r: "A programar", v: aProgramar.length, i: Clock, c: "text-amber-700 bg-amber-100", acao: () => setAba("programar") },
    { r: "Entregues no mês", v: entreguesMes.length, i: CheckCircle2, c: "text-emerald-700 bg-emerald-100" },
  ]

  return (
    <div className="flex flex-col gap-4 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Entregas</h2>
          <p className="text-sm text-muted-foreground">Viagens, caminhões e onde vai ter entrega.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="icon" title="Atualizar" onClick={() => router.refresh()}><RefreshCw className="h-4 w-4" /></Button>
          {painel.podeGerenciar && (
            <Button variant="outline" className="gap-1" onClick={() => setViagemEdit({})}><Truck className="h-4 w-4" /> Nova viagem</Button>
          )}
          <Button className="gap-1 bg-[#d97021] hover:bg-[#c3631b]" onClick={() => setEntregaEdit({})}>
            <Plus className="h-4 w-4" /> {painel.podeGerenciar ? "Nova entrega" : "Solicitar entrega"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(k => (
          <button key={k.r} onClick={k.acao} disabled={!k.acao}
            className="flex items-center gap-3 rounded-xl border bg-background p-3 text-left shadow-sm enabled:hover:border-[#d97021]/50">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${k.c}`}><k.i className="h-4 w-4" /></span>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">{k.r}</div>
              <div className="text-lg font-bold leading-tight">{k.v}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border bg-background p-1 shadow-sm w-fit max-w-full">
        {([
          ["mapa", "Mapa", MapPin],
          ["agenda", "Agenda de viagens", CalendarDays],
          ["programar", `A programar${aProgramar.length ? ` (${aProgramar.length})` : ""}`, Clock],
          ...(painel.podeGerenciar ? [["cadastros", "Caminhões e motoristas", Truck]] : []),
        ] as [Aba, string, typeof MapPin][]).map(([v, r, I]) => (
          <button key={v} onClick={() => setAba(v)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${aba === v ? "bg-[#d97021] text-white shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
            <I className="h-4 w-4" /> {r}
          </button>
        ))}
      </div>

      {aba === "mapa" && <AbaMapa painel={painel} dataDaEntrega={dataDaEntrega} onEditar={setEntregaEdit} />}
      {aba === "agenda" && <AbaAgenda painel={painel} />}
      {aba === "programar" && <AbaProgramar painel={painel} entregas={aProgramar} onEditar={setEntregaEdit} />}
      {aba === "cadastros" && painel.podeGerenciar && <AbaCadastros painel={painel} />}

      <EntregaDialog aberto={!!entregaEdit} inicial={entregaEdit} viagens={painel.viagens} podeGerenciar={painel.podeGerenciar}
        onFechar={() => setEntregaEdit(null)} onSalvo={() => { setEntregaEdit(null); router.refresh() }} />
      <ViagemDialog aberto={!!viagemEdit} inicial={viagemEdit} cadastros={painel}
        onFechar={() => setViagemEdit(null)} onSalvo={(id) => { setViagemEdit(null); router.push(`/entregas/viagem/${id}`) }} />
    </div>
  )
}

// ======================================================================
// MAPA
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
  const [mostrarEntregues, setMostrarEntregues] = useState(false)
  const [mostrarAProgramar, setMostrarAProgramar] = useState(true)

  const veic = (id: string | null | undefined) => painel.veiculos.find(v => v.id === id)
  const mot = (id: string | null | undefined) => painel.motoristas.find(m => m.id === id)
  const viagemDe = (id: string | null) => painel.viagens.find(v => v.id === id)

  const filtradas = useMemo(() => {
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

  const pontos: PontoMapa[] = filtradas.filter(e => e.lat != null && e.lng != null).map(e => {
    const vg = viagemDe(e.viagem_id)
    const v = veic(vg?.veiculo_id)
    const st = STATUS_ENTREGA[e.status]
    const d = dataDaEntrega(e)
    return {
      id: e.id, lat: e.lat!, lng: e.lng!,
      cor: e.status === "entregue" ? st.cor : e.status === "a_programar" ? st.cor : v?.cor || st.cor,
      rotulo: e.status === "entregue" ? "✓" : "",
      popupHtml: `<div style="font:13px system-ui;min-width:180px">
        <b>${escaparHtml(e.destinatario)}</b><br/>
        ${escaparHtml([e.cidade, e.uf].filter(Boolean).join(" - "))}<br/>
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
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="accent-[#d97021]" checked={mostrarAProgramar} onChange={e => setMostrarAProgramar(e.target.checked)} /> A programar</label>
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="accent-[#d97021]" checked={mostrarEntregues} onChange={e => setMostrarEntregues(e.target.checked)} /> Entregues</label>
        </div>
        <Mapa pontos={pontos} caminhoes={caminhoes} altura="min(68vh, 640px)" />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_ENTREGA.a_programar.cor }} /> A programar</span>
          <span>Programadas / em rota: cor do caminhão</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_ENTREGA.entregue.cor }} /> Entregue</span>
          <span>🚚 posição ao vivo (atualiza a cada 30 s)</span>
          {semPonto > 0 && <span className="text-amber-700">{semPonto} entrega(s) sem local no mapa</span>}
        </div>
      </div>

      <div className="rounded-xl border bg-background shadow-sm">
        <div className="border-b px-4 py-3 text-sm font-semibold">{filtradas.length} entrega(s) no período</div>
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
                    {[e.cidade, e.uf].filter(Boolean).join(" - ") || "sem cidade"}{d ? ` · ${formatarData(d)}` : ""}
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
        <div className="rounded-xl border-2 border-dashed p-10 text-center text-sm text-muted-foreground">
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

  return (
    <Link href={`/entregas/viagem/${v.id}`} className="group block rounded-xl border bg-background p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{ borderTop: `3px solid ${ve?.cor || "#94a3b8"}` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold truncate">{v.titulo || (cidades.length ? cidades.slice(0, 3).join(", ") : "Viagem")}</div>
          <div className="text-xs text-muted-foreground">
            Sai {formatarData(v.saida_prevista)}{v.retorno_previsto ? ` · volta ${formatarData(v.retorno_previsto)}` : ""}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${st.classe}`}>
          {v.status === "em_rota" && posicaoRecente(v.ultima_posicao_em) ? "● " : ""}{st.rotulo}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Truck className="h-3.5 w-3.5" />{ve ? ve.placa : "sem caminhão"}</span>
        <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{mo?.nome || "sem motorista"}</span>
        {v.terceirizada && <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{tr?.nome || "terceirizada"}</span>}
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
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
    return <div className="rounded-xl border-2 border-dashed p-10 text-center text-sm text-muted-foreground"><CheckCircle2 className="mx-auto mb-2 h-8 w-8 opacity-40" /> Nenhuma entrega esperando programação.</div>
  }
  return (
    <div className="rounded-xl border bg-background shadow-sm divide-y">
      {entregas.map(e => (
        <div key={e.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="min-w-0 flex-1">
            <div className="font-medium">{e.destinatario}</div>
            <div className="text-xs text-muted-foreground">
              {[e.endereco, [e.cidade, e.uf].filter(Boolean).join(" - ")].filter(Boolean).join(" · ") || "sem endereço"}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              {e.chegada_prevista && <span>Desejada: {formatarData(e.chegada_prevista)}</span>}
              {e.peso_kg ? <span>{Number(e.peso_kg).toLocaleString("pt-BR")} kg</span> : null}
              {e.descricao_carga && <span>{e.descricao_carga}</span>}
              <span>Solicitada por {nome(e.solicitado_por)} em {formatarData(e.criado_em)}</span>
              {e.lead_id && <Link href={`/crm/lead/${e.lead_id}`} className="text-[#d97021] hover:underline">ver lead</Link>}
            </div>
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
    <div className="grid gap-4 lg:grid-cols-3">
      <Lista titulo="Caminhões" icone={<Truck className="h-4 w-4 text-[#d97021]" />} onNovo={() => setVeic({})}>
        {!painel.veiculos.length && vazio("Nenhum caminhão cadastrado.")}
        {painel.veiculos.map(v => (
          <Linha key={v.id} ativo={v.ativo} cor={v.cor} principal={`${v.placa}${v.descricao ? ` · ${v.descricao}` : ""}`}
            detalhe={[v.proprio ? "Próprio" : `Terceiro${nomeTr(v.transportadora_id) ? ` · ${nomeTr(v.transportadora_id)}` : ""}`, v.capacidade_kg ? `${Number(v.capacidade_kg).toLocaleString("pt-BR")} kg` : ""].filter(Boolean).join(" · ")}
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

      <VeiculoDialog item={veic} transportadoras={painel.transportadoras} onFechar={() => setVeic(null)} onSalvo={() => { setVeic(null); atualizar() }} />
      <MotoristaDialog item={mot} transportadoras={painel.transportadoras} onFechar={() => setMot(null)} onSalvo={() => { setMot(null); atualizar() }} />
      <TransportadoraDialog item={trans} onFechar={() => setTrans(null)} onSalvo={() => { setTrans(null); atualizar() }} />
    </div>
  )
}

// componentes da aba Cadastros (fora do componente para não recriar a cada render)
function Lista({ titulo, icone, onNovo, children }: { titulo: string; icone: React.ReactNode; onNovo: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-background shadow-sm">
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
