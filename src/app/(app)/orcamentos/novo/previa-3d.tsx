"use client"

// Estufa em 3D ao vivo enquanto o vendedor preenche o orçamento automático.
// Em tela grande fica encaixada ao lado do formulário (tela dividida); em tela pequena vira janela flutuante.
// Usa o mesmo simulador do Croqui 3D (/api/estufa3d) e manda as medidas por mensagem ({afe:"cfg"}),
// sem recarregar o 3D a cada mudança.

import { useEffect, useMemo, useRef, useState } from "react"
import { Box, Maximize2, Minimize2, X } from "lucide-react"
import type { ParametrosEstufa } from "@/utils/engine"
import { configDoOrcamento, hashDaConfig, type ConfigEstufa3D } from "@/lib/estufa3d/config"

const CHAVE = "orc-previa3d"
// medidas que mudam o tamanho da estufa: quando mudam, a câmera reenquadra
const DIMENSOES = ["Lm", "nM", "nV", "vao", "PD"] as const

/** Já dá para desenhar a estufa? (módulos, largura do módulo e vãos informados) */
export function temMedidas3D(p: ParametrosEstufa) {
  return Number(p["n_modulos"]) >= 1 && Number(p["largura_modulo"]) > 0 && Number(p["n_vaos"]) >= 1
}

/** Estado da prévia (aberta/escondida, lembrado no navegador) e se a tela é larga para dividir */
export function usePrevia3D() {
  const [aberta, setAbertaEstado] = useState(true)
  const [larga, setLarga] = useState(false)
  useEffect(() => {
    try { if (localStorage.getItem(CHAVE) === "fechado") setAbertaEstado(false) } catch { /* sem armazenamento */ } // eslint-disable-line react-hooks/set-state-in-effect
    const mq = window.matchMedia("(min-width: 1024px)")
    const ver = () => setLarga(mq.matches)
    ver()
    mq.addEventListener("change", ver)
    return () => mq.removeEventListener("change", ver)
  }, [])
  const setAberta = (v: boolean) => {
    setAbertaEstado(v)
    try { localStorage.setItem(CHAVE, v ? "aberto" : "fechado") } catch { /* sem armazenamento: só não lembra */ }
  }
  return { aberta, setAberta, larga }
}

export function Previa3D({ params, aberta, setAberta, encaixada }: {
  params: ParametrosEstufa
  aberta: boolean
  setAberta: (v: boolean) => void
  /** true = ocupa a coluna da direita (tela dividida); false = janela flutuante */
  encaixada: boolean
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const pronto = useRef(false)
  const ultima = useRef<ConfigEstufa3D | null>(null)
  const [cheia, setCheia] = useState(false)
  const [carregado, setCarregado] = useState(false)
  const pode = temMedidas3D(params)

  // campos que podem ter sido apagados voltam ao padrão (senão o 3D guarda o valor antigo)
  const cfg = useMemo<ConfigEstufa3D>(() => ({ div: 0, doors: [], ...configDoOrcamento(params) }), [params])
  const chave = JSON.stringify(cfg)

  // endereço do 3D fixado na primeira abertura (depois as mudanças vão por mensagem)
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    if (pode && aberta && !src) setSrc("/api/estufa3d" + hashDaConfig(cfg)) // eslint-disable-line react-hooks/set-state-in-effect
  }, [pode, aberta, src, cfg])

  const enviar = (c: ConfigEstufa3D) => {
    const win = frame.current?.contentWindow
    if (!win || !pronto.current) return
    const antes = ultima.current
    const fit = !antes || DIMENSOES.some(k => antes[k] !== c[k])
    win.postMessage({ afe: "cfg", id: Date.now().toString(36), cfg: c, fit }, window.location.origin)
    ultima.current = c
  }

  // manda as medidas novas 400 ms depois da última digitação
  useEffect(() => {
    if (!src) return
    const t = setTimeout(() => enviar(JSON.parse(chave)), 400)
    return () => clearTimeout(t)
  }, [chave, src])

  // Esc sai da tela cheia
  useEffect(() => {
    if (!cheia) return
    const f = (e: KeyboardEvent) => { if (e.key === "Escape") setCheia(false) }
    window.addEventListener("keydown", f)
    return () => window.removeEventListener("keydown", f)
  }, [cheia])

  const esconder = () => { pronto.current = false; setCarregado(false); setCheia(false); setAberta(false) }

  if (!pode) {
    if (!encaixada) return null
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-slate-50 p-6 text-center text-sm text-muted-foreground">
        <Box className="h-10 w-10 text-[#d97021]/60" />
        <p>Preencha a <b>largura</b>, o <b>comprimento</b> e o <b>número de módulos</b> para ver a estufa em 3D aqui.</p>
      </div>
    )
  }

  if (!aberta) {
    return (
      <button type="button" onClick={() => setAberta(true)}
        className="fixed bottom-40 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-[#d97021] px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-[#c3631b] md:bottom-6">
        <Box className="h-4 w-4" /> Ver em 3D
      </button>
    )
  }

  // o mesmo elemento muda de classe (encaixado / flutuante / tela cheia) para o 3D não recarregar
  const classe = cheia
    ? "fixed inset-3 z-[60] md:inset-6"
    : encaixada
      ? "relative h-full"
      : "fixed bottom-40 right-3 z-40 h-[260px] w-[calc(100vw-1.5rem)] sm:w-[420px] md:bottom-6 md:right-6 md:h-[320px]"
  return (
    <div className={`${classe} flex flex-col overflow-hidden rounded-2xl border bg-background shadow-xl`}>
      <div className="flex items-center gap-2 border-b bg-gradient-to-r from-orange-50 to-transparent px-3 py-1.5">
        <Box className="h-4 w-4 text-[#d97021]" />
        <span className="flex-1 truncate text-sm font-semibold">
          Estufa em 3D
          <span className="ml-1.5 font-normal text-muted-foreground">
            {params["n_modulos"]} × {String(params["largura_modulo"]).replace(".", ",")} m · {params["n_vaos"]} vãos
          </span>
        </span>
        <button type="button" className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => setCheia(!cheia)} title={cheia ? "Voltar (Esc)" : "Tela cheia"}>
          {cheia ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          <span className="hidden sm:inline">{cheia ? "Voltar" : "Tela cheia"}</span>
        </button>
        <button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={esconder} title="Esconder o 3D">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="relative min-h-0 flex-1 bg-slate-100">
        {src && (
          <iframe ref={frame} src={src} title="Estufa em 3D" className="h-full w-full border-0"
            onLoad={() => {
              pronto.current = true
              setCarregado(true)
              // o 3D abriu com as medidas da hora em que foi aberto: manda as atuais
              ultima.current = null
              setTimeout(() => enviar(JSON.parse(chave)), 700)
            }} />
        )}
        {!carregado && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Carregando 3D...</div>
        )}
      </div>
    </div>
  )
}
