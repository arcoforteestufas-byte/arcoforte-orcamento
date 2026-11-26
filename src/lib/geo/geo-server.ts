// Geografia do Brasil para o servidor: municípios (IBGE + coordenadas) e rotas por estrada.
// Fonte dos municípios: base aberta kelvins/municipios-brasileiros (MIT), códigos do IBGE.
// Este arquivo só é usado no servidor (o JSON tem ~260 KB e não vai para o navegador).

import municipios from "./municipios-br.json"

export type Cidade = { ibge: number; nome: string; uf: string; lat: number; lng: number }

const LISTA: Cidade[] = (municipios as [number, string, string, number, number][])
  .map(([ibge, nome, uf, lat, lng]) => ({ ibge, nome, uf, lat, lng }))

/** "São José dos Campos" → "sao jose dos campos" (para buscar sem acento) */
export function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim()
}

export function cidadesDaUf(uf: string): Cidade[] {
  const u = uf.toUpperCase()
  return LISTA.filter(c => c.uf === u)
}

export function cidadePorIbge(ibge: number | null | undefined): Cidade | null {
  if (!ibge) return null
  return LISTA.find(c => c.ibge === ibge) || null
}

/** Acha a cidade pelo nome dentro da UF (aceita sem acento). */
export function acharCidade(nome: string | null | undefined, uf: string | null | undefined): Cidade | null {
  if (!nome || !uf) return null
  const n = normalizar(nome)
  const daUf = cidadesDaUf(uf)
  return daUf.find(c => normalizar(c.nome) === n) || daUf.find(c => normalizar(c.nome).startsWith(n)) || null
}

/** Cidade mais próxima de uma posição (ex.: onde o caminhão está), com a distância até o centro dela */
export function cidadeMaisProxima(lat: number, lng: number): { cidade: Cidade; km: number } | null {
  let melhor: Cidade | null = null, menor = Infinity
  const cos = Math.cos((lat * Math.PI) / 180)
  for (const c of LISTA) {
    const d = (c.lat - lat) ** 2 + ((c.lng - lng) * cos) ** 2 // comparação rápida; a distância certa vem depois
    if (d < menor) { menor = d; melhor = c }
  }
  return melhor ? { cidade: melhor, km: Math.round(linhaReta({ lat, lng }, melhor)) } : null
}

/** Distância em linha reta (km) */
export function linhaReta(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export type ResultadoRota = {
  km: number
  minutos: number
  trechosKm: number[]           // km de cada trecho, na ordem dos pontos
  desenho: [number, number][]   // [lat, lng] para desenhar no mapa
  estimada: boolean             // true = sem serviço de rota: linha reta × 1,3
}

/**
 * Rota por estrada passando pelos pontos na ordem (OSRM, serviço público gratuito).
 * Se o serviço não responder, estima com linha reta × 1,3.
 */
export async function rotaPorEstrada(pontos: { lat: number; lng: number }[]): Promise<ResultadoRota | null> {
  if (pontos.length < 2) return null
  const coords = pontos.map(p => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(";")
  try {
    const r = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=simplified&geometries=geojson&steps=false`,
      { headers: { "User-Agent": "ArcoForte-Orcamento/1.0 (sistema interno de entregas)" }, cache: "no-store", signal: AbortSignal.timeout(12000) },
    )
    if (r.ok) {
      const j = await r.json() as {
        code: string
        routes?: { distance: number; duration: number; legs: { distance: number }[]; geometry: { coordinates: [number, number][] } }[]
      }
      const rota = j.code === "Ok" ? j.routes?.[0] : undefined
      if (rota) {
        return {
          km: Math.round(rota.distance / 100) / 10,
          minutos: Math.round(rota.duration / 60),
          trechosKm: rota.legs.map(l => Math.round(l.distance / 100) / 10),
          desenho: rota.geometry.coordinates.map(([lng, lat]) => [Math.round(lat * 1e5) / 1e5, Math.round(lng * 1e5) / 1e5]),
          estimada: false,
        }
      }
    }
  } catch {
    // sem rede / serviço fora: cai na estimativa
  }
  const trechos = pontos.slice(1).map((p, i) => Math.round(linhaReta(pontos[i], p) * 1.3 * 10) / 10)
  const km = Math.round(trechos.reduce((s, t) => s + t, 0) * 10) / 10
  return { km, minutos: Math.round((km / 60) * 60), trechosKm: trechos, desenho: pontos.map(p => [p.lat, p.lng]), estimada: true }
}
