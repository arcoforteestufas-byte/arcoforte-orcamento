"use client"

import { useEffect, useRef } from "react"
import type * as Leaflet from "leaflet"
import "leaflet/dist/leaflet.css"

export type PontoMapa = {
  id: string
  lat: number
  lng: number
  cor: string
  rotulo?: string        // texto curto dentro do marcador (ex.: número da parada)
  popupHtml?: string     // já escapado (use escaparHtml)
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

export type LinhaMapa = { pontos: [number, number][]; cor: string; tracejada?: boolean }

export function escaparHtml(s: unknown) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!))
}

const CENTRO_BRASIL: [number, number] = [-15.8, -47.9]

/**
 * Mapa (Leaflet + OpenStreetMap). Carrega só no navegador.
 * - pontos: entregas
 * - caminhoes: posição ao vivo
 * - linhas: rota da viagem / trilha do caminhão
 * - pontoEditavel + onMover: marcador arrastável para escolher o local da entrega
 */
export function Mapa({
  pontos = [], caminhoes = [], linhas = [], altura = 480, pontoEditavel, onMover, ajustarAoMudar = true, centralizar = 0, className = "",
}: {
  /** mude este número para centralizar no ponto editável (ex.: depois de localizar o endereço) */
  centralizar?: number
  pontos?: PontoMapa[]
  caminhoes?: CaminhaoMapa[]
  linhas?: LinhaMapa[]
  altura?: number | string
  pontoEditavel?: { lat: number; lng: number } | null
  onMover?: (lat: number, lng: number) => void
  ajustarAoMudar?: boolean
  className?: string
}) {
  const divRef = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<Leaflet.Map | null>(null)
  const LRef = useRef<typeof Leaflet | null>(null)
  const camadaRef = useRef<Leaflet.LayerGroup | null>(null)
  const editRef = useRef<Leaflet.Marker | null>(null)
  const onMoverRef = useRef(onMover)
  onMoverRef.current = onMover
  const ajustouRef = useRef(false)
  const chaveAjusteRef = useRef("")
  const centralizarRef = useRef(0)

  // cria o mapa uma vez
  useEffect(() => {
    let cancelado = false
    let observador: ResizeObserver | null = null
    ;(async () => {
      const L = (await import("leaflet")).default
      if (cancelado || !divRef.current || mapaRef.current) return
      LRef.current = L
      const mapa = L.map(divRef.current, { zoomControl: true, attributionControl: true }).setView(CENTRO_BRASIL, 4)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapa)
      camadaRef.current = L.layerGroup().addTo(mapa)
      mapa.on("click", (ev: Leaflet.LeafletMouseEvent) => {
        if (onMoverRef.current) onMoverRef.current(ev.latlng.lat, ev.latlng.lng)
      })
      mapaRef.current = mapa
      // dentro de janelas/abas o tamanho muda depois de criar: reajusta
      observador = new ResizeObserver(() => mapa.invalidateSize())
      observador.observe(divRef.current)
      desenhar()
    })()
    return () => {
      cancelado = true
      observador?.disconnect()
      mapaRef.current?.remove()
      mapaRef.current = null
      camadaRef.current = null
      editRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function desenhar() {
    const L = LRef.current
    const mapa = mapaRef.current
    const camada = camadaRef.current
    if (!L || !mapa || !camada) return
    camada.clearLayers()
    const limites: [number, number][] = []

    for (const ln of linhas) {
      if (ln.pontos.length < 2) continue
      L.polyline(ln.pontos, { color: ln.cor, weight: 4, opacity: 0.75, dashArray: ln.tracejada ? "6 8" : undefined }).addTo(camada)
    }

    for (const p of pontos) {
      const icone = L.divIcon({
        className: "",
        html: `<div style="background:${p.cor};width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:#fff;font:700 11px/1 system-ui">${escaparHtml(p.rotulo ?? "")}</span></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 26],
        popupAnchor: [0, -24],
      })
      const m = L.marker([p.lat, p.lng], { icon: icone }).addTo(camada)
      if (p.popupHtml) m.bindPopup(p.popupHtml)
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
            onMoverRef.current?.(ll.lat, ll.lng)
          })
        editRef.current.setIcon(L.divIcon({
          className: "",
          html: `<div style="background:#d97021;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
          iconSize: [30, 30], iconAnchor: [15, 30],
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
      mapa.setView([pontoEditavel.lat, pontoEditavel.lng], 15)
      ajustouRef.current = true
      return
    }

    // enquadra os pontos (na primeira vez e quando o conjunto muda)
    const chave = limites.map(l => l.map(n => n.toFixed(3)).join(",")).sort().join("|")
    if ((!ajustouRef.current || (ajustarAoMudar && chave !== chaveAjusteRef.current)) && limites.length) {
      if (limites.length === 1) mapa.setView(limites[0], pontoEditavel ? 15 : 11)
      else mapa.fitBounds(L.latLngBounds(limites), { padding: [40, 40], maxZoom: 13 })
      ajustouRef.current = true
      chaveAjusteRef.current = chave
    }
  }

  // redesenha quando os dados mudam
  useEffect(() => { desenhar() })

  return (
    <div ref={divRef} className={`relative z-0 w-full overflow-hidden rounded-xl border bg-slate-100 ${className}`} style={{ height: altura }} />
  )
}
