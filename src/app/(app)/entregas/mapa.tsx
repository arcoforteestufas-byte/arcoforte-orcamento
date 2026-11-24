"use client"

import { useEffect, useRef } from "react"
import type * as Leaflet from "leaflet"
import "leaflet/dist/leaflet.css"
import brasilUfs from "@/lib/geo/brasil-ufs.json"

export type PontoMapa = {
  id: string
  lat: number
  lng: number
  cor: string
  rotulo?: string        // texto curto dentro do marcador (ex.: número da parada)
  popupHtml?: string     // já escapado (use escaparHtml)
  destaque?: boolean
  /** bolinha pequena (ex.: entregas fora da rota), para não poluir o mapa */
  pequeno?: boolean
  /** "parada": círculo branco numerado (estilo GPS); a última pode ser pino */
  forma?: "parada"
}

export type CaminhaoMapa = {
  id: string
  lat: number
  lng: number
  cor: string
  placa: string
  recente: boolean
  popupHtml?: string
}

export type LinhaMapa = {
  pontos: [number, number][]; cor: string; tracejada?: boolean; espessura?: number; popupHtml?: string
  id?: string; opacidade?: number; animada?: boolean
  /** "destaque": rota bonita (brilho, contorno, fluxo animado e setas de direção) */
  estilo?: "destaque" | "google"
}

export type TemaMapa = "claro" | "escuro"

/** Pontos espaçados ao longo da linha, com o ângulo da direção (graus, 0 = norte), para desenhar setas */
function setasAoLongo(pts: [number, number][], quantas: number): { lat: number; lng: number; angulo: number }[] {
  if (pts.length < 2) return []
  const seg: number[] = []
  let total = 0
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], (pts[i][1] - pts[i - 1][1]) * Math.cos((pts[i][0] * Math.PI) / 180))
    seg.push(d)
    total += d
  }
  if (!total) return []
  const passo = total / (quantas + 1)
  const saida: { lat: number; lng: number; angulo: number }[] = []
  let alvo = passo, acum = 0
  for (let i = 0; i < seg.length && saida.length < quantas; i++) {
    while (seg[i] > 0 && acum + seg[i] >= alvo && saida.length < quantas) {
      const t = (alvo - acum) / seg[i]
      const [a, b] = [pts[i], pts[i + 1]]
      const lat = a[0] + (b[0] - a[0]) * t, lng = a[1] + (b[1] - a[1]) * t
      const angulo = (Math.atan2((b[1] - a[1]) * Math.cos((lat * Math.PI) / 180), b[0] - a[0]) * 180) / Math.PI
      saida.push({ lat, lng, angulo })
      alvo += passo
    }
    acum += seg[i]
  }
  return saida
}

export function escaparHtml(s: unknown) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!))
}

// Limites do Brasil (com folga) — o mapa não sai daqui
const LIMITES_BRASIL: [[number, number], [number, number]] = [[-35.5, -75.5], [7.5, -27.5]]
const ZOOM_RUAS = 7 // a partir deste zoom aparecem ruas/estradas

type FeatureUf = { type: "Feature"; properties: { uf: string; nome: string }; geometry: { type: string; coordinates: unknown } }
const UFS = (brasilUfs as unknown as { features: FeatureUf[] }).features

/** Máscara "só Brasil": um retângulo do mundo com o contorno de cada estado recortado */
function anelMascara(): [number, number][][] {
  const mundo: [number, number][] = [[-85, -180], [-85, 180], [85, 180], [85, -180]]
  const furos: [number, number][][] = []
  for (const f of UFS) {
    const g = f.geometry as { type: string; coordinates: number[][][] | number[][][][] }
    const poligonos = g.type === "Polygon" ? [g.coordinates as number[][][]] : (g.coordinates as number[][][][])
    for (const p of poligonos) furos.push(p[0].map(([lng, lat]) => [lat, lng] as [number, number]))
  }
  return [mundo, ...furos]
}

/**
 * Mapa do Brasil (Leaflet). Mostra os estados; ao aproximar, mostra ruas (OpenStreetMap).
 * - pontos: entregas · caminhoes: posição ao vivo · linhas: rotas
 * - coresUf: cor de preenchimento de cada estado (ex.: quantidade de entregas)
 * - onUf: clique no estado
 * - origem: cidade de onde os caminhões saem
 * - pontoEditavel + onMover: marcador arrastável para escolher o local da entrega
 */
export function Mapa({
  pontos = [], caminhoes = [], linhas = [], altura = 480, pontoEditavel, onMover, ajustarAoMudar = true, centralizar = 0,
  coresUf, dicaUf, onUf, ufSelecionada, origem, className = "",
  tema = "claro", onLinha, onLinhaHover, onPonto, estiloMapa = "estados", foco, ajustarInicial = true, soBrasil = true,
}: {
  /** true (padrão) = esconde os outros países e o oceano, mostra só o Brasil */
  soBrasil?: boolean
  tema?: TemaMapa
  /** clique / mouse sobre uma rota (usa LinhaMapa.id) */
  onLinha?: (id: string) => void
  onLinhaHover?: (id: string | null) => void
  /** clique num marcador de entrega (usa PontoMapa.id); com ele, o marcador não abre o balão */
  onPonto?: (id: string) => void
  /** "ruas": mapa de ruas sempre visível (estilo GPS), sem pintar os estados */
  estiloMapa?: "estados" | "ruas"
  /** enquadra estes pontos sempre que `chave` mudar */
  foco?: { limites: [number, number][]; chave: number } | null
  /** false = não enquadra os pontos automaticamente (quem controla é o `foco`) */
  ajustarInicial?: boolean
  pontos?: PontoMapa[]
  caminhoes?: CaminhaoMapa[]
  linhas?: LinhaMapa[]
  altura?: number | string
  pontoEditavel?: { lat: number; lng: number } | null
  onMover?: (lat: number, lng: number) => void
  ajustarAoMudar?: boolean
  /** mude este número para centralizar no ponto editável (ex.: depois de escolher a cidade) */
  centralizar?: number
  coresUf?: Record<string, string>
  dicaUf?: Record<string, string>
  onUf?: (uf: string) => void
  ufSelecionada?: string | null
  origem?: { lat: number; lng: number; nome: string } | null
  className?: string
}) {
  const divRef = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<Leaflet.Map | null>(null)
  const LRef = useRef<typeof Leaflet | null>(null)
  const camadaRef = useRef<Leaflet.LayerGroup | null>(null)
  const ufsRef = useRef<Leaflet.GeoJSON | null>(null)
  const siglasRef = useRef<Leaflet.LayerGroup | null>(null)
  const ruasRef = useRef<Leaflet.TileLayer | null>(null)
  const editRef = useRef<Leaflet.Marker | null>(null)
  const mascaraRef = useRef<Leaflet.Polygon | null>(null)
  const props = useRef({ onMover, onUf, coresUf, dicaUf, ufSelecionada, tema, onLinha, onLinhaHover, onPonto, soBrasil, estiloMapa })
  props.current = { onMover, onUf, coresUf, dicaUf, ufSelecionada, tema, onLinha, onLinhaHover, onPonto, soBrasil, estiloMapa }
  const ajustouRef = useRef(!ajustarInicial)
  const chaveAjusteRef = useRef("")
  const centralizarRef = useRef(0)
  const focoRef = useRef(0)
  const escuro = tema === "escuro"

  function estiloUf(uf: string): Leaflet.PathOptions {
    const p = props.current
    const esc = p.tema === "escuro"
    const sel = p.ufSelecionada === uf
    const cor = p.coresUf?.[uf]
    const zoom = mapaRef.current?.getZoom() ?? 4
    const comRuas = zoom >= ZOOM_RUAS
    return {
      color: sel ? "#f59e0b" : esc ? "#94a3b8" : "#ffffff",
      weight: sel ? 2.5 : 1.2,
      fillColor: cor || (esc ? "#1e293b" : "#e2e8f0"),
      // tema escuro: o mapa de terreno aparece em qualquer zoom, os estados ficam só no contorno
      fillOpacity: esc ? (cor ? (comRuas ? 0.18 : 0.45) : 0) : comRuas ? (cor ? 0.18 : 0) : (cor ? 0.9 : 1),
      opacity: comRuas ? 0.9 : 1,
    }
  }

  function atualizarZoom() {
    const mapa = mapaRef.current
    if (!mapa) return
    if (props.current.estiloMapa === "ruas") {
      if (ruasRef.current && !mapa.hasLayer(ruasRef.current)) ruasRef.current.addTo(mapa)
      if (siglasRef.current && mapa.hasLayer(siglasRef.current)) siglasRef.current.remove()
      return
    }
    const z = mapa.getZoom()
    // no tema escuro o mapa de terreno fica sempre ligado (também com o Brasil inteiro)
    const sempreRuas = props.current.tema === "escuro"
    if (sempreRuas && ruasRef.current && !mapa.hasLayer(ruasRef.current)) ruasRef.current.addTo(mapa)
    if (z >= ZOOM_RUAS) {
      if (ruasRef.current && !mapa.hasLayer(ruasRef.current)) ruasRef.current.addTo(mapa)
      if (siglasRef.current && mapa.hasLayer(siglasRef.current)) siglasRef.current.remove()
    } else {
      if (!sempreRuas && ruasRef.current && mapa.hasLayer(ruasRef.current)) ruasRef.current.remove()
      if (siglasRef.current && !mapa.hasLayer(siglasRef.current)) siglasRef.current.addTo(mapa)
    }
    ufsRef.current?.setStyle(f => estiloUf((f as FeatureUf).properties.uf))
  }

  function desenhar() {
    const L = LRef.current
    const mapa = mapaRef.current
    const camada = camadaRef.current
    if (!L || !mapa || !camada) return
    camada.clearLayers()
    ufsRef.current?.setStyle(f => estiloUf((f as FeatureUf).properties.uf))
    const limites: [number, number][] = []

    for (const ln of linhas) {
      if (ln.pontos.length < 2) continue
      const op = ln.opacidade ?? 0.9
      const esp = ln.espessura || 4
      if (ln.estilo === "google") {
        // azul com contorno mais escuro, como no Google Maps
        L.polyline(ln.pontos, { color: "#1967d2", weight: esp + 4, opacity: 1, lineCap: "round", lineJoin: "round", interactive: false }).addTo(camada)
        L.polyline(ln.pontos, { color: "#4285f4", weight: esp, opacity: 1, lineCap: "round", lineJoin: "round", dashArray: ln.tracejada ? "2 10" : undefined, interactive: false }).addTo(camada)
        for (const p of ln.pontos) limites.push(p)
        continue
      }
      if (ln.estilo === "destaque") {
        // brilho largo e suave + contorno escuro: a rota "salta" do mapa
        L.polyline(ln.pontos, { color: ln.cor, weight: esp + 12, opacity: 0.15, lineCap: "round", lineJoin: "round", interactive: false }).addTo(camada)
        L.polyline(ln.pontos, { color: "#7c2d12", weight: esp + 4, opacity: 0.55, lineCap: "round", lineJoin: "round", interactive: false }).addTo(camada)
        L.polyline(ln.pontos, { color: ln.cor, weight: esp, opacity: 1, lineCap: "round", lineJoin: "round", dashArray: ln.tracejada ? "8 8" : undefined, interactive: false }).addTo(camada)
        // fluxo: tracinhos claros andando no sentido da rota
        L.polyline(ln.pontos, { color: "#fff", weight: Math.max(1.5, esp / 2.5), opacity: 0.85, dashArray: "1 14", lineCap: "round", className: "rota-fluxo", interactive: false }).addTo(camada)
        // setas de direção ao longo da rota
        for (const s of setasAoLongo(ln.pontos, 9)) {
          L.marker([s.lat, s.lng], {
            interactive: false, keyboard: false,
            icon: L.divIcon({
              className: "",
              html: `<div style="width:16px;height:16px;display:flex;align-items:center;justify-content:center;transform:rotate(${s.angulo}deg)"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1 L11 10 L6 7.5 L1 10 Z" fill="#fff" stroke="#7c2d12" stroke-width="1.2" stroke-linejoin="round"/></svg></div>`,
              iconSize: [16, 16], iconAnchor: [8, 8],
            }),
          }).addTo(camada)
        }
        for (const p of ln.pontos) limites.push(p)
        continue
      }
      // contorno por baixo deixa a rota legível sobre qualquer fundo
      L.polyline(ln.pontos, { color: escuro ? "#0f172a" : "#fff", weight: esp + 3, opacity: op, interactive: false }).addTo(camada)
      const pl = L.polyline(ln.pontos, {
        color: ln.cor, weight: esp, opacity: op, dashArray: ln.tracejada || ln.animada ? "10 10" : undefined,
        className: ln.animada ? "rota-animada" : undefined,
      }).addTo(camada)
      // área de clique mais larga (invisível)
      if (ln.id && (props.current.onLinha || props.current.onLinhaHover)) {
        const id = ln.id
        L.polyline(ln.pontos, { color: "#000", weight: 18, opacity: 0 })
          .on("click", () => props.current.onLinha?.(id))
          .on("mouseover", () => props.current.onLinhaHover?.(id))
          .on("mouseout", () => props.current.onLinhaHover?.(null))
          .addTo(camada)
      } else if (ln.popupHtml) pl.bindPopup(ln.popupHtml)
      for (const p of ln.pontos) limites.push(p)
    }

    if (origem) {
      L.marker([origem.lat, origem.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="width:20px;height:20px;border-radius:50%;background:#0f172a;border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:#f59e0b;font:700 11px/1 system-ui">★</div>`,
          iconSize: [20, 20], iconAnchor: [10, 10],
        }),
        zIndexOffset: 300,
      }).bindTooltip(`Saída: ${escaparHtml(origem.nome)}`, { direction: "top", offset: [0, -10] }).addTo(camada)
      limites.push([origem.lat, origem.lng])
    }

    for (const p of pontos) {
      const t = p.forma === "parada" ? 24 : p.pequeno ? 14 : p.destaque ? 32 : 26
      const icone = p.forma === "parada" ? L.divIcon({
        className: "",
        html: `<div style="width:24px;height:24px;border-radius:50%;background:#fff;border:3px solid ${p.cor};box-shadow:0 1px 4px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#202124;font:700 11px/1 system-ui;cursor:pointer">${escaparHtml(p.rotulo ?? "")}</div>`,
        iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12],
      }) : p.pequeno ? L.divIcon({
        className: "",
        html: `<div style="background:${p.cor};width:${t}px;height:${t}px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(15,23,42,.35);cursor:pointer"></div>`,
        iconSize: [t, t], iconAnchor: [t / 2, t / 2], popupAnchor: [0, -t / 2],
      }) : L.divIcon({
        className: "",
        html: `<div style="background:${p.cor};width:${t}px;height:${t}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,.35);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:#fff;font:700 11px/1 system-ui">${escaparHtml(p.rotulo ?? "")}</span></div>`,
        iconSize: [t, t],
        iconAnchor: [t / 2, t],
        popupAnchor: [0, -t + 2],
      })
      const m = L.marker([p.lat, p.lng], { icon: icone, zIndexOffset: p.pequeno ? -100 : p.destaque ? 400 : 0 }).addTo(camada)
      if (props.current.onPonto) {
        const id = p.id
        m.on("click", () => props.current.onPonto?.(id))
        if (p.popupHtml) m.bindTooltip(p.popupHtml, { direction: "top", offset: p.forma === "parada" || p.pequeno ? [0, -t / 2] : [0, -t + 4] })
      } else if (p.popupHtml) m.bindPopup(p.popupHtml)
      limites.push([p.lat, p.lng])
    }

    for (const c of caminhoes) {
      const icone = L.divIcon({
        className: "",
        html: `<div style="display:flex;flex-direction:column;align-items:center">
          <div style="background:${c.cor};color:#fff;border:2px solid #fff;border-radius:10px;padding:3px 6px;font:700 11px/1 system-ui;box-shadow:0 2px 6px rgba(0,0,0,.35);white-space:nowrap;${c.recente ? "" : "opacity:.55;filter:grayscale(.6)"}">🚚 ${escaparHtml(c.placa)}</div>
          ${c.recente ? `<div style="width:10px;height:10px;margin-top:2px;border-radius:50%;background:${c.cor};box-shadow:0 0 0 4px ${c.cor}55"></div>` : ""}
        </div>`,
        iconSize: [80, 34],
        iconAnchor: [40, 34],
        popupAnchor: [0, -30],
      })
      const m = L.marker([c.lat, c.lng], { icon: icone, zIndexOffset: 1000 }).addTo(camada)
      if (c.popupHtml) m.bindPopup(c.popupHtml)
      limites.push([c.lat, c.lng])
    }

    // marcador arrastável (escolher o local da entrega)
    if (pontoEditavel) {
      if (!editRef.current) {
        editRef.current = L.marker([pontoEditavel.lat, pontoEditavel.lng], { draggable: true, zIndexOffset: 2000 })
          .on("dragend", ev => {
            const ll = (ev.target as Leaflet.Marker).getLatLng()
            props.current.onMover?.(ll.lat, ll.lng)
          })
        editRef.current.setIcon(L.divIcon({
          className: "",
          html: `<div style="background:#d97021;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.4)"></div>`,
          iconSize: [32, 32], iconAnchor: [16, 32],
        }))
        editRef.current.addTo(mapa)
      } else {
        editRef.current.setLatLng([pontoEditavel.lat, pontoEditavel.lng])
      }
      limites.push([pontoEditavel.lat, pontoEditavel.lng])
    } else if (editRef.current) {
      editRef.current.remove()
      editRef.current = null
    }

    if (pontoEditavel && centralizar !== centralizarRef.current) {
      centralizarRef.current = centralizar
      mapa.setView([pontoEditavel.lat, pontoEditavel.lng], 11)
      ajustouRef.current = true
      return
    }

    // foco controlado de fora (ex.: clicou numa viagem)
    if (foco && foco.chave !== focoRef.current) {
      focoRef.current = foco.chave
      if (foco.limites.length >= 2) mapa.flyToBounds(L.latLngBounds(foco.limites), { padding: [80, 80], maxZoom: 9, duration: 1.1 })
      else if (foco.limites.length === 1) mapa.flyTo(foco.limites[0], 9, { duration: 1.1 })
      else mapa.flyToBounds(LIMITES_BRASIL, { padding: [10, 10], duration: 1.1 })
      ajustouRef.current = true
      return
    }

    // enquadra os pontos (na primeira vez e quando o conjunto muda); sem pontos: Brasil inteiro
    const chave = limites.map(l => l.map(n => n.toFixed(2)).join(",")).sort().join("|")
    if (!ajustouRef.current || (ajustarAoMudar && chave !== chaveAjusteRef.current)) {
      if (limites.length >= 2) mapa.fitBounds(L.latLngBounds(limites), { padding: [40, 40], maxZoom: 10 })
      else if (limites.length === 1) mapa.setView(limites[0], 9)
      else mapa.fitBounds(LIMITES_BRASIL, { padding: [10, 10] })
      ajustouRef.current = true
      chaveAjusteRef.current = chave
    }
  }

  // cria o mapa uma vez
  useEffect(() => {
    let cancelado = false
    let observador: ResizeObserver | null = null
    ;(async () => {
      const L = (await import("leaflet")).default
      if (cancelado || !divRef.current || mapaRef.current) return
      LRef.current = L
      const mapa = L.map(divRef.current, {
        zoomControl: props.current.tema !== "escuro", attributionControl: true, minZoom: 3, maxZoom: 18,
        maxBounds: LIMITES_BRASIL, maxBoundsViscosity: 0.9, zoomSnap: 0.5, worldCopyJump: false,
      })
      mapa.fitBounds(LIMITES_BRASIL, { padding: [10, 10] })
      mapa.attributionControl.setPrefix(false)

      // ruas/estradas (só com zoom)
      // OpenStreetMap padrão (não exige chave de acesso)
      ruasRef.current = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      })
      // tema escuro: escurece as ruas com filtro (o mapa do OpenStreetMap só existe claro)
      if (props.current.tema === "escuro") {
        const painelRuas = mapa.getPane("tilePane")
        if (painelRuas) painelRuas.style.filter = "invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9) saturate(0.6)"
      } else if (props.current.estiloMapa === "ruas") {
        // cores mais suaves (parecido com mapas de GPS), para a rota azul se destacar
        const painelRuas = mapa.getPane("tilePane")
        if (painelRuas) painelRuas.style.filter = "saturate(0.55) brightness(1.04) contrast(0.95)"
      }

      // máscara "só Brasil": fica acima do mapa de ruas e abaixo dos estados/rotas
      mapa.createPane("mascara").style.zIndex = "350"
      mascaraRef.current = L.polygon(anelMascara(), {
        pane: "mascara", interactive: false, stroke: false, fillOpacity: 1,
        fillColor: props.current.tema === "escuro" ? "#0b1222" : "#eef2f7",
      })
      if (props.current.soBrasil && props.current.estiloMapa !== "ruas") mascaraRef.current.addTo(mapa)

      // estados do Brasil
      ufsRef.current = L.geoJSON(brasilUfs as unknown as GeoJSON.FeatureCollection, {
        style: f => estiloUf((f as unknown as FeatureUf).properties.uf),
        onEachFeature: (f, layer) => {
          const uf = (f as unknown as FeatureUf).properties
          layer.on({
            click: () => props.current.onUf?.(uf.uf),
            mouseover: e => {
              const l = e.target as Leaflet.Path
              l.setStyle({ weight: 2.5, color: "#d97021" })
              l.bindTooltip(`<b>${escaparHtml(uf.nome)}</b>${props.current.dicaUf?.[uf.uf] ? `<br/>${escaparHtml(props.current.dicaUf[uf.uf])}` : ""}`, { sticky: true, direction: "top" }).openTooltip()
            },
            mouseout: e => { ufsRef.current?.resetStyle(e.target as Leaflet.Path); (e.target as Leaflet.Path).setStyle(estiloUf(uf.uf)) },
          })
        },
      })
      if (props.current.estiloMapa !== "ruas") ufsRef.current.addTo(mapa)

      // siglas dos estados (no zoom do país)
      siglasRef.current = L.layerGroup()
      ufsRef.current.eachLayer(l => {
        const f = (l as Leaflet.Polygon).feature as unknown as FeatureUf
        const centro = (l as Leaflet.Polygon).getBounds().getCenter()
        const ajuste: Record<string, [number, number]> = { DF: [0.35, 0.2], GO: [-0.8, -0.4], RJ: [-0.1, 0.4], ES: [0, 0.2], SE: [0, 0.1], AL: [0, 0.2], PB: [0, 0.4], RN: [0.1, 0.3], PE: [-0.2, 1.5], SC: [0, 0.3], MA: [-0.8, 0], PA: [-1, 0] }
        const [dy, dx] = ajuste[f.properties.uf] || [0, 0]
        L.marker([centro.lat + dy, centro.lng + dx], {
          interactive: false,
          icon: L.divIcon({
            className: "",
            html: props.current.tema === "escuro"
              ? `<span style="font:700 10px/1 system-ui;color:#94a3b8;letter-spacing:.06em;text-shadow:0 0 4px #0f172a,0 0 4px #0f172a">${f.properties.uf}</span>`
              : `<span style="font:700 10px/1 system-ui;color:#475569;letter-spacing:.04em;text-shadow:0 0 3px #fff,0 0 3px #fff">${f.properties.uf}</span>`,
            iconSize: [24, 12], iconAnchor: [12, 6],
          }),
        }).addTo(siglasRef.current!)
      })
      if (props.current.estiloMapa !== "ruas") siglasRef.current.addTo(mapa)

      camadaRef.current = L.layerGroup().addTo(mapa)
      mapa.on("click", (ev: Leaflet.LeafletMouseEvent) => { props.current.onMover?.(ev.latlng.lat, ev.latlng.lng) })
      mapa.on("zoomend", atualizarZoom)
      mapaRef.current = mapa
      // dentro de janelas/abas o tamanho muda depois de criar: reajusta
      observador = new ResizeObserver(() => mapa.invalidateSize())
      observador.observe(divRef.current)
      atualizarZoom()
      desenhar()
    })()
    return () => {
      cancelado = true
      observador?.disconnect()
      mapaRef.current?.remove()
      mapaRef.current = null
      camadaRef.current = null
      ufsRef.current = null
      siglasRef.current = null
      ruasRef.current = null
      editRef.current = null
      mascaraRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // redesenha quando os dados mudam
  useEffect(() => { desenhar() })

  // liga/desliga a máscara "só Brasil"
  useEffect(() => {
    const mapa = mapaRef.current, m = mascaraRef.current
    if (!mapa || !m) return
    const usar = soBrasil && estiloMapa !== "ruas"
    if (usar && !mapa.hasLayer(m)) m.addTo(mapa)
    if (!usar && mapa.hasLayer(m)) m.remove()
  })

  return (
    <div className={`relative z-0 w-full overflow-hidden ${escuro ? "" : "rounded-2xl border shadow-sm"} ${className}`}
      style={{
        height: altura,
        background: escuro
          ? "radial-gradient(ellipse at 45% 40%, #1e293b 0%, #0f172a 60%, #020617 100%)"
          : "radial-gradient(ellipse at 40% 35%, #f8fafc 0%, #eef2f7 55%, #e2e8f0 100%)",
      }}>
      {/* animação das rotas em andamento */}
      <style>{`.rota-animada{animation:rota-correr 1.2s linear infinite}@keyframes rota-correr{to{stroke-dashoffset:-20}}.rota-fluxo{animation:rota-fluir 1.1s linear infinite}@keyframes rota-fluir{to{stroke-dashoffset:-15}}`}</style>
      <div ref={divRef} className="absolute inset-0" style={{ background: "transparent" }} />
    </div>
  )
}
