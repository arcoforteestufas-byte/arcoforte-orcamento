"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ChevronLeft, ChevronRight, Earth, Expand, ExternalLink, Locate, MapPin, Minimize, Package, Pause, PanelLeftClose,
  PanelLeftOpen, PanelRightClose, PanelRightOpen, Play, Radio, Route, Truck, Tv, UserRound, X,
} from "lucide-react"
import { Mapa, escaparHtml, type CaminhaoMapa, type LinhaMapa, type PontoMapa } from "@/app/(app)/entregas/mapa"
import {
  NOMES_UF, STATUS_ENTREGA, STATUS_SEPARACAO, STATUS_VIAGEM, formatarDuracao, formatarKm, posicaoRecente, situacaoPrazoEntrega,
  type EntEntrega, type EntPainel, type EntViagem,
} from "@/lib/entregas-types"

const hojeISO = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date())
function somarDias(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00")
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
function diasEntre(a: string, b: string) {
  return Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / 86400000)
}
function dataBR(iso: string | null | undefined, longo = false) {
  if (!iso) return ""
  const d = new Date(iso.slice(0, 10) + "T12:00:00")
  return longo
    ? d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

/** "agora", "há 5 min", "há 2 h" */
function haQuanto(iso: string, agora: number) {
  const min = Math.max(0, Math.round((agora - new Date(iso).getTime()) / 60000))
  if (min < 1) return "agora"
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  return h < 24 ? `há ${h} h` : `há ${Math.floor(h / 24)} dia(s)`
}

const PERIODOS = [
  { v: "7", r: "7 dias", dias: 7 },
  { v: "30", r: "30 dias", dias: 30 },
  { v: "90", r: "90 dias", dias: 90 },
  { v: "180", r: "6 meses", dias: 180 },
  { v: "365", r: "12 meses", dias: 365 },
]

/** cor do estado (tema escuro) pela quantidade de entregas */
function corUf(n: number) {
  if (!n) return undefined
  if (n === 1) return "#7c2d12"
  if (n <= 3) return "#9a3412"
  if (n <= 6) return "#c2410c"
  return "#ea580c"
}

const vidro = "bg-slate-900/80 backdrop-blur-md ring-1 ring-white/10 shadow-2xl"

/** Visões do painel: separar o que está acontecendo, ou ver tudo junto */
type Visao = "tudo" | "em_rota" | "programadas" | "a_programar" | "entregues"
const VISOES: { v: Visao; r: string; cor: string; dica: string }[] = [
  { v: "tudo", r: "Tudo", cor: "#f97316", dica: "Tudo junto no período" },
  { v: "em_rota", r: "Em rota", cor: "#3b82f6", dica: "Caminhões na estrada agora, com as entregas deles" },
  { v: "programadas", r: "Programadas", cor: "#94a3b8", dica: "Já têm viagem marcada, ainda não saíram" },
  { v: "a_programar", r: "A programar", cor: STATUS_ENTREGA.a_programar.cor, dica: "Ainda sem viagem" },
  { v: "entregues", r: "Entregues", cor: STATUS_ENTREGA.entregue.cor, dica: "Entregues no período (para trás)" },
]

export function PainelTelaCheia({ painel }: { painel: EntPainel }) {
  const router = useRouter()
  const [periodo, setPeriodo] = useState("30")
  const [cursor, setCursor] = useState<number | null>(null) // dia da linha do tempo (null = período todo)
  const [tocando, setTocando] = useState(false)
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [uf, setUf] = useState<string | null>(null)
  const [modoTV, setModoTV] = useState(false)
  const [esqAberto, setEsqAberto] = useState(true)
  const [dirAberto, setDirAberto] = useState(true)
  const [telaCheia, setTelaCheia] = useState(false)
  const [soBrasil, setSoBrasil] = useState(true) // padrão: esconde os outros países
  const [agora, setAgora] = useState<Date | null>(null)
  const [foco, setFoco] = useState<{ limites: [number, number][]; chave: number } | null>(null)
  const [visao, setVisao] = useState<Visao>("tudo")
  const [entregaSel, setEntregaSel] = useState<string | null>(null) // pino clicado: ficha da entrega à direita

  const cfg = painel.config
  const origem = { lat: cfg.origem_lat, lng: cfg.origem_lng, nome: cfg.origem_nome }
  const ini = hojeISO()
  const totalDias = PERIODOS.find(p => p.v === periodo)!.dias
  const fim = somarDias(ini, totalDias)
  const dataCursor = cursor == null ? null : somarDias(ini, cursor)

  // relógio e atualização automática
  useEffect(() => {
    setAgora(new Date())
    const r = setInterval(() => setAgora(new Date()), 1000)
    const a = setInterval(() => { if (document.visibilityState === "visible") router.refresh() }, 30000)
    const fs = () => setTelaCheia(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", fs)
    return () => { clearInterval(r); clearInterval(a); document.removeEventListener("fullscreenchange", fs) }
  }, [router])

  const viagemDe = useCallback((id: string | null) => painel.viagens.find(v => v.id === id), [painel.viagens])
  const veic = useCallback((id: string | null | undefined) => painel.veiculos.find(v => v.id === id), [painel.veiculos])
  const dataDe = useCallback((e: EntEntrega) => e.chegada_prevista || viagemDe(e.viagem_id)?.saida_prevista || null, [viagemDe])

  // categoria de cada entrega: em rota (caminhão na estrada), programada (viagem marcada), a programar ou entregue
  const catDe = useCallback((e: EntEntrega): Visao => {
    if (e.status === "entregue") return "entregues"
    const vg = viagemDe(e.viagem_id)
    if (e.status === "em_rota" || vg?.status === "em_rota") return "em_rota"
    if (e.status === "programada" || vg) return "programadas"
    return "a_programar"
  }, [viagemDe])

  // entregas de cada visão (até o dia da linha do tempo, se estiver usando)
  const filtrar = useCallback((vis: Visao) => painel.entregas.filter(e => {
    if (e.status === "cancelada") return false
    const cat = catDe(e)
    const naEstrada = viagemDe(e.viagem_id)?.status === "em_rota"
    // em rota: é agora, não depende do período; mostra também as já entregues dessa viagem (✓)
    if (vis === "em_rota") return cat === "em_rota" || (cat === "entregues" && naEstrada)
    // entregues: olha para trás (últimos N dias)
    if (vis === "entregues") {
      if (cat !== "entregues") return false
      const d = (e.entregue_em || dataDe(e) || "").slice(0, 10)
      return !!d && d >= somarDias(ini, -totalDias) && d <= ini
    }
    if (vis === "tudo" && (cat === "em_rota" || (cat === "entregues" && naEstrada))) return true
    if (vis !== "tudo" && cat !== vis) return false
    const d = dataDe(e)
    if (!d) return cat === "a_programar" // a programar sem data também aparece
    if (e.status === "entregue" && d < ini) return false
    return d >= ini && d <= (dataCursor || fim)
  }), [painel.entregas, catDe, viagemDe, dataDe, ini, fim, dataCursor, totalDias])
  const contagem = useMemo(() => Object.fromEntries(VISOES.map(x => [x.v, filtrar(x.v).length])) as Record<Visao, number>, [filtrar])
  const entregas = useMemo(() => filtrar(visao), [filtrar, visao])
  // visões sem viagem (a programar / entregues): a lista da esquerda mostra as entregas
  const listaDeEntregas = visao === "a_programar" || visao === "entregues"

  const viagens = useMemo(() => painel.viagens
    .filter(v => v.status !== "cancelada" && (v.status === "em_rota" || (v.saida_prevista <= (dataCursor || fim) && (v.retorno_previsto || v.saida_prevista) >= ini)))
    .filter(v => visao === "tudo" ? true : visao === "em_rota" ? v.status === "em_rota" : visao === "programadas" ? v.status === "planejada" : false)
    .sort((a, b) => a.saida_prevista.localeCompare(b.saida_prevista))
    .map(v => {
      const paradas = painel.entregas.filter(e => e.viagem_id === v.id && e.status !== "cancelada").sort((a, b) => a.ordem - b.ordem)
      return { v, paradas, ufs: [...new Set(paradas.map(p => p.uf).filter(Boolean))] as string[] }
    })
    .filter(x => !uf || x.ufs.includes(uf)), [painel.viagens, painel.entregas, ini, fim, dataCursor, uf, visao])

  const porUf = useMemo(() => {
    const m: Record<string, number> = {}
    for (const e of entregas) if (e.uf) m[e.uf] = (m[e.uf] || 0) + 1
    return m
  }, [entregas])
  const ranking = Object.entries(porUf).sort((a, b) => b[1] - a[1])
  const maxUf = ranking[0]?.[1] || 1

  const rotaDe = useCallback((v: EntViagem, paradas: EntEntrega[]): [number, number][] =>
    v.rota?.length ? v.rota : [[origem.lat, origem.lng], ...paradas.filter(p => p.lat != null).map(p => [p.lat!, p.lng!] as [number, number])],
  [origem.lat, origem.lng])

  const focar = useCallback((id: string | null) => {
    setSelecionada(id)
    const x = id ? viagens.find(y => y.v.id === id) : null
    setFoco(f => ({ limites: x ? rotaDe(x.v, x.paradas) : [], chave: (f?.chave || 0) + 1 }))
  }, [viagens, rotaDe])

  // leva o mapa até o caminhão
  const irAoCaminhao = (v: EntViagem) => {
    if (v.ultima_lat == null || v.ultima_lng == null) return
    setFoco(f => ({ limites: [[v.ultima_lat!, v.ultima_lng!]], chave: (f?.chave || 0) + 1 }))
  }

  // linha do tempo tocando: avança um dia a cada 0,7 s
  useEffect(() => {
    if (!tocando) return
    const t = setInterval(() => setCursor(c => {
      const prox = (c ?? -1) + 1
      if (prox > totalDias) { setTocando(false); return null }
      return prox
    }), 700)
    return () => clearInterval(t)
  }, [tocando, totalDias])

  // modo TV: passa por cada viagem a cada 10 s
  useEffect(() => {
    if (!modoTV || !viagens.length) return
    let i = Math.max(0, viagens.findIndex(x => x.v.id === selecionada))
    const t = setInterval(() => {
      i = (i + 1) % (viagens.length + 1)
      focar(i === viagens.length ? null : viagens[i].v.id) // depois da última, mostra o Brasil todo
    }, 10000)
    return () => clearInterval(t)
  }, [modoTV, viagens, selecionada, focar])

  const alternarTelaCheia = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else document.documentElement.requestFullscreen().catch(() => {})
  }

  // atalhos de teclado
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if ((ev.target as HTMLElement)?.tagName === "INPUT") return
      if (ev.key === " ") { ev.preventDefault(); setTocando(t => !t) }
      else if (ev.key === "ArrowRight") setCursor(c => Math.min(totalDias, (c ?? -1) + 1))
      else if (ev.key === "ArrowLeft") setCursor(c => (c == null ? null : c <= 0 ? null : c - 1))
      else if (ev.key === "Escape") { focar(null); setUf(null); setEntregaSel(null) }
      else if (ev.key.toLowerCase() === "f") alternarTelaCheia()
      else if (ev.key.toLowerCase() === "t") setModoTV(m => !m)
      else if (ev.key.toLowerCase() === "b") setSoBrasil(b => !b)
    }
    window.addEventListener("keydown", tecla)
    return () => window.removeEventListener("keydown", tecla)
  }, [totalDias, focar])

  // ---------------- camadas do mapa
  const destaque = hover || selecionada
  const linhas: LinhaMapa[] = viagens.map(({ v, paradas }) => ({
    id: v.id,
    pontos: rotaDe(v, paradas),
    cor: veic(v.veiculo_id)?.cor || "#f97316",
    espessura: destaque === v.id ? 6 : 3,
    opacidade: destaque && destaque !== v.id ? 0.18 : 0.95,
    animada: v.status === "em_rota",
  }))
  const daSelecionada = selecionada ? viagens.find(x => x.v.id === selecionada) : null
  const pontos: PontoMapa[] = entregas
    .filter(e => e.lat != null && (!uf || e.uf === uf))
    .map(e => {
      const vg = viagemDe(e.viagem_id)
      const naSel = daSelecionada?.paradas.some(p => p.id === e.id)
      const st = STATUS_ENTREGA[e.status]
      return {
        id: e.id, lat: e.lat!, lng: e.lng!,
        cor: e.status === "entregue" ? st.cor : e.status === "a_programar" ? st.cor : veic(vg?.veiculo_id)?.cor || "#f97316",
        rotulo: naSel ? String(daSelecionada!.paradas.findIndex(p => p.id === e.id) + 1) : e.status === "entregue" ? "✓" : "",
        destaque: !!naSel,
        pequeno: !naSel && visao === "tudo" && e.status === "a_programar",
        popupHtml: `<div style="font:13px system-ui;min-width:180px"><b>${escaparHtml(e.destinatario)}</b><br/>${escaparHtml([e.cidade, e.uf].filter(Boolean).join(" - "))}${e.distancia_km != null ? ` · ${escaparHtml(formatarKm(e.distancia_km))}` : ""}<br/><span style="color:${st.cor};font-weight:600">${st.rotulo}</span> · ${escaparHtml(dataBR(dataDe(e)))}</div>`,
      }
    })
  const caminhoes: CaminhaoMapa[] = (visao === "tudo" || visao === "em_rota" ? painel.viagens : [])
    .filter(v => v.ultima_lat != null && v.ultima_lng != null && (v.status === "em_rota" || posicaoRecente(v.ultima_posicao_em)))
    .map(v => ({
      id: v.id, lat: v.ultima_lat!, lng: v.ultima_lng!, cor: veic(v.veiculo_id)?.cor || "#3b82f6", placa: veic(v.veiculo_id)?.placa || "Caminhão", recente: posicaoRecente(v.ultima_posicao_em),
      popupHtml: `<div style="font:13px system-ui"><b>🚚 ${escaparHtml(veic(v.veiculo_id)?.placa || "Caminhão")}</b>${v.posicao_cidade ? "<br/>📍 " + escaparHtml(v.posicao_cidade) : ""}<br/>${v.ultima_posicao_em ? "Posição às " + escaparHtml(new Date(v.ultima_posicao_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })) : ""}${posicaoRecente(v.ultima_posicao_em) ? "" : " (sem sinal)"}<br/><span style="color:#64748b">clique para ver a viagem</span></div>`,
    }))

  const kmTotal = viagens.reduce((s, x) => s + (Number(x.v.distancia_total_km) || 0), 0)
  const emRota = painel.viagens.filter(v => v.status === "em_rota").length

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 text-slate-100">
      {/* MAPA */}
      <Mapa tema="escuro" altura="100vh" className="absolute inset-0" ajustarInicial={true} ajustarAoMudar={false} soBrasil={soBrasil}
        linhas={linhas} pontos={pontos} caminhoes={caminhoes} origem={origem} foco={foco}
        coresUf={Object.fromEntries(Object.entries(porUf).map(([u, n]) => [u, corUf(n)!]))}
        dicaUf={Object.fromEntries(Object.entries(porUf).map(([u, n]) => [u, `${n} entrega(s)`]))}
        ufSelecionada={uf} onUf={u => setUf(a => a === u ? null : u)}
        onLinha={id => focar(selecionada === id ? null : id)} onLinhaHover={setHover}
        onPonto={id => { setEntregaSel(id); setDirAberto(true) }}
        onCaminhao={id => { setEntregaSel(null); setDirAberto(true); focar(id) }} />

      {/* TOPO */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex items-start justify-between gap-3 p-4">
        <div className={`pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-3 ${vidro}`}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg"><Truck className="h-5 w-5" /></span>
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">ArcoForte · Entregas</div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold tabular-nums">{agora ? agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</span>
              <span className="text-xs text-slate-400 capitalize">{agora?.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</span>
            </div>
          </div>
          {emRota > 0 && <span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-semibold text-blue-300"><Radio className="h-3.5 w-3.5 animate-pulse" /> {emRota} em rota</span>}
        </div>

        <div className="pointer-events-auto flex flex-col items-center gap-2">
        <div className={`flex flex-wrap justify-center gap-1 rounded-2xl p-1.5 ${vidro}`}>
          {VISOES.map(x => (
            <button key={x.v} onClick={() => { setVisao(x.v); focar(null) }} title={x.dica}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${visao === x.v ? "bg-white text-slate-900 shadow" : "text-slate-300 hover:bg-white/10"}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${x.v === "em_rota" && contagem.em_rota ? "animate-pulse" : ""}`} style={{ background: x.cor }} />
              {x.r}
              <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${visao === x.v ? "bg-slate-900/10" : "bg-white/10"}`}>{contagem[x.v]}</span>
            </button>
          ))}
        </div>
        <div className={`flex gap-1 rounded-2xl p-1.5 ${vidro}`}>
          {PERIODOS.map(p => (
            <button key={p.v} onClick={() => { setPeriodo(p.v); setCursor(null); setTocando(false) }}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${periodo === p.v ? "bg-orange-500 text-white shadow" : "text-slate-300 hover:bg-white/10"}`}>
              {visao === "entregues" ? `últimos ${p.r}` : p.r}
            </button>
          ))}
        </div>
        </div>

        <div className={`pointer-events-auto flex gap-1 rounded-2xl p-1.5 ${vidro}`}>
          <BotaoIcone ativo={modoTV} titulo="Modo TV: passa por cada viagem (T)" onClick={() => setModoTV(m => !m)}><Tv className="h-4 w-4" /></BotaoIcone>
          <BotaoIcone ativo={!soBrasil} titulo={soBrasil ? "Mostrar os outros países (B)" : "Mostrar só o Brasil (B)"} onClick={() => setSoBrasil(b => !b)}><Earth className="h-4 w-4" /></BotaoIcone>
          <BotaoIcone titulo="Ver o Brasil todo (Esc)" onClick={() => { focar(null); setUf(null) }}><Locate className="h-4 w-4" /></BotaoIcone>
          <BotaoIcone titulo="Tela cheia (F)" onClick={alternarTelaCheia}>{telaCheia ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}</BotaoIcone>
          <Link href="/entregas" title="Fechar painel" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10"><X className="h-4 w-4" /></Link>
        </div>
      </div>

      {/* ESQUERDA: viagens */}
      <div className="absolute bottom-28 left-4 top-24 z-[1000] flex">
        {esqAberto ? (
          <div className={`flex w-[330px] flex-col overflow-hidden rounded-2xl ${vidro}`}>
            <div className="grid grid-cols-3 gap-px border-b border-white/10 bg-white/5">
              <Indicador valor={viagens.length} rotulo="viagens" />
              <Indicador valor={entregas.length} rotulo="entregas" />
              <Indicador valor={kmTotal ? `${Math.round(kmTotal / 1000 * 10) / 10}k` : "—"} rotulo="km (ida e volta)" />
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm font-semibold">
                {listaDeEntregas ? `${VISOES.find(x => x.v === visao)!.r}${uf ? ` em ${NOMES_UF[uf]}` : ""}` : `${visao === "em_rota" ? "Caminhões em rota" : visao === "programadas" ? "Viagens programadas" : "Viagens"}${uf ? ` por ${NOMES_UF[uf]}` : ""}`}
              </span>
              <button onClick={() => setEsqAberto(false)} className="text-slate-400 hover:text-white" title="Esconder"><PanelLeftClose className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
              {listaDeEntregas && (
                <>
                  {entregas.filter(e => !uf || e.uf === uf).length === 0 && <p className="px-2 py-6 text-center text-sm text-slate-400">Nenhuma entrega aqui.</p>}
                  {entregas.filter(e => !uf || e.uf === uf)
                    .sort((a, b) => visao === "entregues"
                      ? String(b.entregue_em || "").localeCompare(String(a.entregue_em || ""))
                      : String(dataDe(a) || "9999").localeCompare(String(dataDe(b) || "9999")))
                    .map(e => {
                      const d = visao === "entregues" ? e.entregue_em : dataDe(e)
                      return (
                        <button key={e.id} onClick={() => { setEntregaSel(e.id); setDirAberto(true); if (e.lat != null) setFoco(f => ({ limites: [[e.lat!, e.lng!]], chave: (f?.chave || 0) + 1 })) }}
                          className="flex w-full items-start gap-2.5 rounded-xl bg-white/5 p-2.5 text-left transition-colors hover:bg-white/10">
                          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS_ENTREGA[e.status].cor }} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">{e.destinatario}</div>
                            <div className="truncate text-xs text-slate-400">{[e.cidade, e.uf].filter(Boolean).join(" - ") || "sem cidade"}{e.peso_kg ? ` · ${Number(e.peso_kg).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg` : ""}</div>
                          </div>
                          {d && <span className="shrink-0 text-[11px] text-slate-400">{visao === "entregues" ? "✓ " : ""}{dataBR(d)}</span>}
                        </button>
                      )
                    })}
                </>
              )}
              {!listaDeEntregas && viagens.length === 0 && <p className="px-2 py-6 text-center text-sm text-slate-400">{visao === "em_rota" ? "Nenhum caminhão na estrada agora." : "Nenhuma viagem neste período."}</p>}
              {viagens.map(({ v, paradas, ufs }) => {
                const ve = veic(v.veiculo_id)
                const ativa = selecionada === v.id
                const cidades = [...new Set(paradas.map(p => p.cidade).filter(Boolean))] as string[]
                return (
                  <button key={v.id} onClick={() => focar(ativa ? null : v.id)} onMouseEnter={() => setHover(v.id)} onMouseLeave={() => setHover(null)}
                    className={`group block w-full overflow-hidden rounded-xl text-left transition-all ${ativa ? "bg-white/15 ring-2 ring-orange-400" : "bg-white/5 hover:bg-white/10"}`}>
                    <div className="flex gap-3 p-3">
                      <div className="flex w-11 shrink-0 flex-col items-center justify-center rounded-lg text-white" style={{ background: ve?.cor || "#f97316" }}>
                        <span className="text-lg font-bold leading-none">{v.saida_prevista.slice(8, 10)}</span>
                        <span className="text-[9px] uppercase">{new Date(v.saida_prevista + "T12:00:00").toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">{v.titulo || cidades.slice(0, 2).join(" · ") || "Viagem"}</span>
                          {v.status === "em_rota" && <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-blue-400" />}
                        </div>
                        <div className="truncate text-xs text-slate-400">{cfg.origem_nome} → {cidades.join(" → ") || "sem entregas"}</div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          {ufs.map(u => <span key={u} className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold">{u}</span>)}
                          {v.distancia_ida_km != null && <span className="text-[11px] text-slate-400">{formatarKm(v.distancia_ida_km)}</span>}
                          <span className="text-[11px] text-slate-500">· {paradas.length} parada(s)</span>
                        </div>
                        {v.status === "em_rota" && (() => {
                          const feitas = paradas.filter(p => p.status === "entregue").length
                          const prox = paradas.find(p => p.status !== "entregue")
                          return (
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-[11px]">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                                  <div className="h-full rounded-full" style={{ width: `${paradas.length ? (feitas / paradas.length) * 100 : 0}%`, background: STATUS_ENTREGA.entregue.cor }} />
                                </div>
                                <span className="shrink-0 font-semibold">{feitas}/{paradas.length} entregues</span>
                              </div>
                              <div className="truncate text-[11px] text-blue-300">{prox ? <>➜ indo para <b className="text-white">{prox.cidade || prox.destinatario}</b></> : "✓ todas entregues · voltando"}</div>
                              <div className="flex items-center gap-2 text-[11px]">
                                {v.ultima_lat != null ? (
                                  <>
                                    <span className={`min-w-0 flex-1 truncate ${posicaoRecente(v.ultima_posicao_em) ? "text-slate-200" : "text-amber-300"}`}>
                                      📍 {v.posicao_cidade || "posição recebida"}{v.ultima_posicao_em && agora ? ` · ${haQuanto(v.ultima_posicao_em, agora.getTime())}` : ""}{posicaoRecente(v.ultima_posicao_em) ? "" : " (sem sinal)"}
                                    </span>
                                    <span role="button" tabIndex={0} title="Mostrar o caminhão no mapa"
                                      onClick={ev => { ev.stopPropagation(); irAoCaminhao(v) }}
                                      onKeyDown={ev => { if (ev.key === "Enter") { ev.stopPropagation(); irAoCaminhao(v) } }}
                                      className="inline-flex shrink-0 items-center gap-1 rounded-md bg-blue-500/25 px-1.5 py-0.5 font-semibold text-blue-200 hover:bg-blue-500/40">
                                      <Locate className="h-3 w-3" /> localizar
                                    </span>
                                  </>
                                ) : <span className="text-slate-500">📍 sem GPS: o motorista ainda não abriu o link da viagem</span>}
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <button onClick={() => setEsqAberto(true)} className={`h-10 self-start rounded-xl px-2.5 ${vidro}`} title="Mostrar viagens"><PanelLeftOpen className="h-4 w-4" /></button>
        )}
      </div>

      {/* DIREITA: detalhe da viagem ou ranking de estados */}
      <div className="absolute bottom-28 right-4 top-24 z-[1000] flex justify-end">
        {dirAberto ? (
          <div className={`flex w-[320px] flex-col overflow-hidden rounded-2xl ${vidro}`}>
            {entregaSel && painel.entregas.some(e => e.id === entregaSel) ? (
              <DetalheEntrega e={painel.entregas.find(e => e.id === entregaSel)!} painel={painel} hoje={ini}
                onFechar={() => setEntregaSel(null)} onEsconder={() => setDirAberto(false)}
                onViagem={id => { setEntregaSel(null); focar(id) }} />
            ) : daSelecionada ? (
              <DetalheViagem x={daSelecionada} painel={painel} onFechar={() => focar(null)} onEsconder={() => setDirAberto(false)} onLocalizar={() => irAoCaminhao(daSelecionada.v)} />
            ) : (
              <>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-semibold">Entregas por estado</span>
                  <button onClick={() => setDirAberto(false)} className="text-slate-400 hover:text-white" title="Esconder"><PanelRightClose className="h-4 w-4" /></button>
                </div>
                <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
                  {ranking.length === 0 && <p className="px-2 py-6 text-center text-sm text-slate-400">Nenhuma entrega neste período.</p>}
                  {ranking.map(([u, n]) => (
                    <button key={u} onClick={() => setUf(a => a === u ? null : u)}
                      className={`block w-full rounded-lg px-3 py-2 text-left transition-colors ${uf === u ? "bg-orange-500/25 ring-1 ring-orange-400" : "hover:bg-white/5"}`}>
                      <div className="flex items-center justify-between text-sm">
                        <span><b className="mr-1.5 text-orange-300">{u}</b>{NOMES_UF[u]}</span>
                        <span className="tabular-nums font-semibold">{n}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-orange-600 to-amber-400 transition-all" style={{ width: `${(n / maxUf) * 100}%` }} />
                      </div>
                    </button>
                  ))}
                </div>
                <div className="border-t border-white/10 px-4 py-3 text-[11px] text-slate-400 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: STATUS_ENTREGA.a_programar.cor }} /> a programar{visao === "tudo" ? " (pontinho)" : ""}</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: STATUS_ENTREGA.entregue.cor }} /> entregue ✓</span>
                    <span>com viagem: cor do caminhão</span>
                  </div>
                  <div>Rota tracejada andando = caminhão em rota · 🚚 posição ao vivo</div>
                  <div className="text-slate-500">Use os botões do topo para ver cada situação separada.</div>
                </div>
              </>
            )}
          </div>
        ) : (
          <button onClick={() => setDirAberto(true)} className={`h-10 self-start rounded-xl px-2.5 ${vidro}`} title="Mostrar painel"><PanelRightOpen className="h-4 w-4" /></button>
        )}
      </div>

      {/* BAIXO: linha do tempo (não vale para "em rota", que é agora, nem "entregues", que olha para trás) */}
      <div className={`absolute inset-x-4 bottom-4 z-[1000] justify-center ${visao === "em_rota" || visao === "entregues" ? "hidden" : "flex"}`}>
        <div className={`flex w-full max-w-4xl items-center gap-4 rounded-2xl px-4 py-3 ${vidro}`}>
          <button onClick={() => { if (!tocando && cursor != null && cursor >= totalDias) setCursor(null); setTocando(t => !t) }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg transition-transform hover:scale-105"
            title="Animar dia a dia (espaço)">
            {tocando ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>
          <div className="w-36 shrink-0">
            <div className="text-[10px] uppercase tracking-widest text-slate-400">{cursor == null ? "Período" : "Até o dia"}</div>
            <div className="text-lg font-bold capitalize leading-tight">{cursor == null ? `${dataBR(ini)} – ${dataBR(fim)}` : dataBR(dataCursor, true)}</div>
          </div>
          <button onClick={() => setCursor(c => (c == null ? null : c <= 0 ? null : c - 1))} className="text-slate-400 hover:text-white" title="Dia anterior (←)"><ChevronLeft className="h-5 w-5" /></button>
          <div className="relative flex-1">
            {/* marcas dos dias com entrega */}
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-4 -translate-y-1/2">
              {[...new Set(painel.entregas.map(dataDe).filter((d): d is string => !!d && d >= ini && d <= fim))].map(d => (
                <span key={d} className="absolute top-0 h-4 w-0.5 rounded bg-orange-400/60" style={{ left: `${(diasEntre(ini, d) / totalDias) * 100}%` }} />
              ))}
            </div>
            <input type="range" min={0} max={totalDias} value={cursor ?? totalDias}
              onChange={e => { setTocando(false); const n = Number(e.target.value); setCursor(n >= totalDias ? null : n) }}
              className="relative w-full accent-orange-500" />
          </div>
          <button onClick={() => setCursor(c => Math.min(totalDias, (c ?? -1) + 1))} className="text-slate-400 hover:text-white" title="Próximo dia (→)"><ChevronRight className="h-5 w-5" /></button>
          <div className="hidden w-24 shrink-0 text-right md:block">
            <div className="text-2xl font-bold tabular-nums leading-none">{entregas.length}</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400">entregas</div>
          </div>
        </div>
      </div>

      {modoTV && (
        <div className="absolute left-1/2 top-24 z-[1000] -translate-x-1/2 rounded-full bg-orange-500/90 px-4 py-1.5 text-xs font-semibold shadow-lg">
          <Tv className="mr-1.5 inline h-3.5 w-3.5" /> Modo TV — trocando de viagem a cada 10 s
        </div>
      )}
    </div>
  )
}

function BotaoIcone({ children, titulo, onClick, ativo = false }: { children: React.ReactNode; titulo: string; onClick: () => void; ativo?: boolean }) {
  return (
    <button onClick={onClick} title={titulo}
      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${ativo ? "bg-orange-500 text-white" : "text-slate-300 hover:bg-white/10"}`}>
      {children}
    </button>
  )
}

function Indicador({ valor, rotulo }: { valor: number | string; rotulo: string }) {
  return (
    <div className="bg-slate-900/60 px-3 py-3 text-center">
      <div className="text-xl font-bold tabular-nums">{valor}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400">{rotulo}</div>
    </div>
  )
}

function DetalheEntrega({ e, painel, hoje, onFechar, onEsconder, onViagem }: {
  e: EntEntrega
  painel: EntPainel
  hoje: string
  onFechar: () => void
  onEsconder: () => void
  onViagem: (id: string) => void
}) {
  const vg = painel.viagens.find(v => v.id === e.viagem_id)
  const ve = painel.veiculos.find(v => v.id === vg?.veiculo_id)
  const mo = painel.motoristas.find(m => m.id === vg?.motorista_id)
  const st = STATUS_ENTREGA[e.status]
  const paradas = vg ? painel.entregas.filter(x => x.viagem_id === vg.id && x.status !== "cancelada").sort((a, b) => a.ordem - b.ordem) : []
  const posicao = paradas.findIndex(x => x.id === e.id)
  const prazo = situacaoPrazoEntrega(e.prazo_entrega, hoje, e.status)
  const sep = painel.separacoes?.[e.id]
  const itens = e.itens || []
  const cor = e.status === "entregue" || e.status === "a_programar" ? st.cor : ve?.cor || st.cor
  const horaDe = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })

  return (
    <>
      <div className="relative px-4 pb-3 pt-4" style={{ background: `linear-gradient(135deg, ${cor}55, transparent)` }}>
        <div className="absolute right-3 top-3 flex gap-1">
          <button onClick={onEsconder} className="text-slate-300 hover:text-white" title="Esconder"><PanelRightClose className="h-4 w-4" /></button>
          <button onClick={onFechar} className="text-slate-300 hover:text-white" title="Fechar (Esc)"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: st.cor }}>{st.rotulo}</span>
          {sep && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${STATUS_SEPARACAO[sep.status].classe}`}>{STATUS_SEPARACAO[sep.status].rotulo}</span>}
        </div>
        <div className="mt-2 pr-12 text-lg font-bold leading-tight">{e.destinatario}</div>
        <div className="mt-1 text-xs text-slate-300"><MapPin className="mr-0.5 inline h-3 w-3" />{[e.cidade, e.uf].filter(Boolean).join(" - ") || "sem cidade"}{e.distancia_km != null ? ` · ${formatarKm(e.distancia_km)} da saída` : ""}</div>
        {e.endereco && <div className="mt-0.5 text-xs text-slate-400">{e.endereco}</div>}
        {e.telefone && <a href={`tel:${e.telefone}`} className="mt-0.5 block text-xs text-orange-300 hover:underline">{e.telefone}</a>}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {e.status === "entregue" ? (
            <div className="col-span-2 rounded-lg bg-emerald-500/15 p-2 text-emerald-200">✓ Entregue{e.entregue_em ? ` em ${horaDe(e.entregue_em)}` : ""}</div>
          ) : e.chegada_prevista ? (
            <div className="rounded-lg bg-black/25 p-2"><div className="text-[10px] uppercase text-slate-400">Chegada prevista</div>{dataBR(e.chegada_prevista, true)}</div>
          ) : null}
          {prazo && (
            <div className="rounded-lg bg-black/25 p-2" style={{ color: e.status === "entregue" ? undefined : prazo.dias < 0 ? "#fca5a5" : prazo.dias <= 7 ? "#fcd34d" : undefined }}>
              <div className="text-[10px] uppercase text-slate-400">Prazo do contrato</div>{prazo.texto.replace(/^Prazo /, "")}
            </div>
          )}
          {e.peso_kg ? <div className="rounded-lg bg-black/25 p-2"><div className="text-[10px] uppercase text-slate-400">Peso</div>{Number(e.peso_kg).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg</div> : null}
          {e.pedido_erp && <div className="rounded-lg bg-black/25 p-2"><div className="text-[10px] uppercase text-slate-400">Pedido</div>{e.pedido_erp}</div>}
        </div>

        {vg ? (
          <button onClick={() => onViagem(vg.id)} className="block w-full rounded-xl bg-white/5 p-3 text-left transition-colors hover:bg-white/10">
            <div className="flex items-center gap-2 text-xs text-slate-400"><Truck className="h-3.5 w-3.5" style={{ color: ve?.cor }} /> Viagem · {STATUS_VIAGEM[vg.status].rotulo}</div>
            <div className="mt-1 font-semibold">{vg.titulo || "Viagem"}</div>
            <div className="text-xs text-slate-300">{ve?.placa || "—"}{mo ? ` · ${mo.nome}` : ""} · sai {dataBR(vg.saida_prevista, true)}</div>
            {posicao >= 0 && <div className="mt-1 text-xs text-slate-400">Parada {posicao + 1} de {paradas.length} · ver a rota no mapa →</div>}
          </button>
        ) : e.status === "a_programar" ? (
          <div className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200">Ainda sem viagem: programe em Entregas → A programar.</div>
        ) : null}

        {e.descricao_carga && <div><div className="text-[10px] uppercase text-slate-400">Carga</div><div className="text-slate-200">{e.descricao_carga}</div></div>}

        {itens.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] uppercase text-slate-400">Produtos ({itens.length})</div>
            <ul className="space-y-1 text-xs">
              {itens.slice(0, 8).map((it, i) => (
                <li key={i} className="flex gap-2"><span className="w-12 shrink-0 text-right font-semibold tabular-nums">{Number(it.quantidade).toLocaleString("pt-BR")}{it.unidade ? ` ${it.unidade}` : ""}</span><span className="text-slate-300">{it.descricao}</span></li>
              ))}
              {itens.length > 8 && <li className="text-slate-500">+ {itens.length - 8} produto(s)</li>}
            </ul>
          </div>
        )}

        {e.observacoes && <div><div className="text-[10px] uppercase text-slate-400">Observações</div><div className="whitespace-pre-line text-xs text-slate-300">{e.observacoes}</div></div>}
        {e.obs_motorista && <div><div className="text-[10px] uppercase text-slate-400">Recado do motorista</div><div className="whitespace-pre-line text-xs text-slate-300">{e.obs_motorista}</div></div>}
      </div>

      <div className="flex gap-2 border-t border-white/10 p-3">
        {vg && (
          <Link href={`/entregas/viagem/${vg.id}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-orange-500 py-2 text-sm font-semibold text-white hover:bg-orange-600">
            Abrir viagem <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
        {e.lead_id && (
          <Link href={`/crm/lead/${e.lead_id}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2 text-sm font-semibold text-white hover:bg-white/20">
            Ver venda <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </>
  )
}

function DetalheViagem({ x, painel, onFechar, onEsconder, onLocalizar }: {
  x: { v: EntViagem; paradas: EntEntrega[]; ufs: string[] }
  painel: EntPainel
  onFechar: () => void
  onEsconder: () => void
  onLocalizar?: () => void
}) {
  const { v, paradas } = x
  const ve = painel.veiculos.find(y => y.id === v.veiculo_id)
  const mo = painel.motoristas.find(y => y.id === v.motorista_id)
  const peso = paradas.reduce((s, p) => s + (Number(p.peso_kg) || 0), 0)
  const cap = Number(ve?.capacidade_kg) || 0
  const comLocal = paradas.filter(p => p.lat != null)
  const st = STATUS_VIAGEM[v.status]

  return (
    <>
      <div className="relative px-4 pb-3 pt-4" style={{ background: `linear-gradient(135deg, ${ve?.cor || "#f97316"}55, transparent)` }}>
        <div className="absolute right-3 top-3 flex gap-1">
          <button onClick={onEsconder} className="text-slate-300 hover:text-white" title="Esconder"><PanelRightClose className="h-4 w-4" /></button>
          <button onClick={onFechar} className="text-slate-300 hover:text-white" title="Fechar (Esc)"><X className="h-4 w-4" /></button>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${st.classe}`}>{st.rotulo}</span>
        <div className="mt-2 pr-12 text-lg font-bold leading-tight">{v.titulo || "Viagem"}</div>
        <div className="mt-1 text-xs text-slate-300">
          Sai {dataBR(v.saida_prevista, true)}{v.retorno_previsto ? ` · volta ${dataBR(v.retorno_previsto, true)}` : ""}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-black/25 p-2"><Truck className="mb-0.5 h-3.5 w-3.5 text-slate-400" />{ve?.placa || "—"}</div>
          <div className="rounded-lg bg-black/25 p-2"><UserRound className="mb-0.5 h-3.5 w-3.5 text-slate-400" />{mo?.nome || "—"}</div>
          <div className="rounded-lg bg-black/25 p-2"><Route className="mb-0.5 h-3.5 w-3.5 text-slate-400" />{formatarKm(v.distancia_total_km) || "—"}{v.duracao_total_min ? ` · ${formatarDuracao(v.duracao_total_min)}` : ""}</div>
          <div className="rounded-lg bg-black/25 p-2"><Package className="mb-0.5 h-3.5 w-3.5 text-slate-400" />{peso.toLocaleString("pt-BR")} kg{cap ? ` / ${cap.toLocaleString("pt-BR")}` : ""}</div>
        </div>
        {v.status === "em_rota" && (
          <div className="mt-2 rounded-lg bg-blue-500/15 p-2 text-xs">
            <div className="text-[10px] uppercase tracking-wider text-blue-300">Onde está agora</div>
            {v.ultima_lat != null ? (
              <>
                <div className="font-semibold text-white">📍 {v.posicao_cidade || "posição recebida"}</div>
                <div className={posicaoRecente(v.ultima_posicao_em) ? "text-slate-300" : "text-amber-300"}>
                  {v.ultima_posicao_em ? `posição às ${new Date(v.ultima_posicao_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}{posicaoRecente(v.ultima_posicao_em) ? " · ao vivo" : " · sem sinal há mais de 15 min"}
                </div>
                {onLocalizar && <button onClick={onLocalizar} className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-blue-500/30 px-2 py-1 font-semibold text-blue-100 hover:bg-blue-500/50"><Locate className="h-3 w-3" /> Mostrar no mapa</button>}
              </>
            ) : <div className="text-slate-400">Sem GPS: o motorista ainda não abriu o link da viagem no celular.</div>}
          </div>
        )}
        {cap > 0 && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full ${peso > cap ? "bg-red-500" : "bg-orange-400"}`} style={{ width: `${Math.min(100, (peso / cap) * 100)}%` }} />
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <ol className="relative space-y-3 border-l border-white/15 pl-5">
          <li className="relative text-sm">
            <span className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-900">★</span>
            <b>{painel.config.origem_nome}</b> <span className="text-xs text-slate-400">saída</span>
          </li>
          {paradas.map((p, i) => {
            const idx = comLocal.indexOf(p)
            const trecho = idx >= 0 && v.trechos ? v.trechos[idx] : null
            const st2 = STATUS_ENTREGA[p.status]
            return (
              <li key={p.id} className="relative text-sm">
                <span className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: p.status === "entregue" ? st2.cor : ve?.cor || "#f97316" }}>
                  {p.status === "entregue" ? "✓" : i + 1}
                </span>
                <div className="font-medium leading-tight">{p.destinatario}</div>
                <div className="text-xs text-slate-400">
                  <MapPin className="mr-0.5 inline h-3 w-3" />{[p.cidade, p.uf].filter(Boolean).join(" - ")}
                  {trecho != null && <> · +{formatarKm(trecho)}</>}
                  {p.chegada_prevista && <> · {dataBR(p.chegada_prevista)}</>}
                </div>
              </li>
            )
          })}
        </ol>
      </div>
      <div className="border-t border-white/10 p-3">
        <Link href={`/entregas/viagem/${v.id}`} className="flex items-center justify-center gap-1.5 rounded-xl bg-orange-500 py-2 text-sm font-semibold text-white hover:bg-orange-600">
          Abrir viagem <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </>
  )
}
