"use client"

// Janela flutuante com a estufa em 3D, atualizada enquanto o vendedor preenche o orçamento automático.
// Usa o mesmo simulador do Croqui 3D (/api/estufa3d) e manda as medidas por mensagem ({afe:"cfg"}),
// sem recarregar o 3D a cada mudança.

import { useEffect, useMemo, useRef, useState } from "react"
import { Box, Maximize2, Minimize2, X } from "lucide-react"
import type { ParametrosEstufa } from "@/utils/engine"
import { configDoOrcamento, hashDaConfig, type ConfigEstufa3D } from "@/lib/estufa3d/config"

type Tamanho = "fechado" | "normal" | "grande"
const CHAVE = "orc-previa3d"

// medidas que mudam o tamanho da estufa: quando mudam, a câmera reenquadra
const DIMENSOES = ["Lm", "nM", "nV", "vao", "PD"] as const

function lerTamanho(): Tamanho {
  try {
    const v = localStorage.getItem(CHAVE)
    return v === "fechado" || v === "grande" ? v : "normal"
  } catch { return "normal" }
}

export function Previa3D({ params }: { params: ParametrosEstufa }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const pronto = useRef(false)
  const ultima = useRef<ConfigEstufa3D | null>(null)
  const [tamanho, setTamanho] = useState<Tamanho>("normal")
  const [carregado, setCarregado] = useState(false)

  useEffect(() => { setTamanho(lerTamanho()) }, []) // eslint-disable-line react-hooks/set-state-in-effect
  const mudarTamanho = (t: Tamanho) => {
    if (t === "fechado") { pronto.current = false; setCarregado(false) }
    setTamanho(t)
    try { localStorage.setItem(CHAVE, t) } catch { /* sem armazenamento: só não lembra */ }
  }

  // só mostra quando já dá para desenhar: módulos e largura do módulo informados
  const temMedidas = Number(params["n_modulos"]) >= 1 && Number(params["largura_modulo"]) > 0 && Number(params["n_vaos"]) >= 1

  // campos que podem ter sido apagados voltam ao padrão (senão o 3D guarda o valor antigo)
  const cfg = useMemo<ConfigEstufa3D>(() => ({ div: 0, doors: [], ...configDoOrcamento(params) }), [params])
  const chave = JSON.stringify(cfg)

  // endereço do 3D fixado na primeira abertura (depois as mudanças vão por mensagem)
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    if (temMedidas && tamanho !== "fechado" && !src) setSrc("/api/estufa3d" + hashDaConfig(cfg)) // eslint-disable-line react-hooks/set-state-in-effect
  }, [temMedidas, tamanho, src, cfg])

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

  if (!temMedidas) return null

  if (tamanho === "fechado") {
    return (
      <button type="button" onClick={() => mudarTamanho("normal")}
        className="fixed bottom-40 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-[#d97021] px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-[#c3631b] md:bottom-6">
        <Box className="h-4 w-4" /> Ver em 3D
      </button>
    )
  }

  const grande = tamanho === "grande"
  return (
    <div className={
      grande
        ? "fixed inset-3 z-50 flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl md:inset-8"
        : "fixed bottom-40 right-3 z-40 flex h-[260px] w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl sm:w-[420px] md:bottom-6 md:right-6 md:h-[320px] lg:w-[480px]"
    }>
      <div className="flex items-center gap-2 border-b bg-gradient-to-r from-orange-50 to-transparent px-3 py-1.5">
        <Box className="h-4 w-4 text-[#d97021]" />
        <span className="flex-1 truncate text-sm font-semibold">
          Estufa em 3D
          <span className="ml-1.5 font-normal text-muted-foreground">
            {params["n_modulos"]} × {String(params["largura_modulo"]).replace(".", ",")} m · {params["n_vaos"]} vãos
          </span>
        </span>
        <button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => mudarTamanho(grande ? "normal" : "grande")} title={grande ? "Diminuir" : "Aumentar"}>
          {grande ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        <button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => mudarTamanho("fechado")} title="Esconder">
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
      <div className="border-t px-3 py-1 text-[11px] text-muted-foreground">
        Prévia: muda conforme você preenche. O croqui da proposta continua no menu Croqui 3D.
      </div>
    </div>
  )
}
