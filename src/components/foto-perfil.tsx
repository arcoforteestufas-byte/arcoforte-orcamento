"use client"

import { useRef, useState } from "react"
import { Camera, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { enviarFoto } from "@/app/actions/fotos"
import { cn } from "@/lib/utils"

/** Bolinha com a foto, ou as iniciais quando não há foto */
export function Avatar({ nome, foto, className }: { nome: string; foto?: string | null; className?: string }) {
  const iniciais = (nome || "?").trim().split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase()
  return foto ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={foto} alt={nome} className={cn("h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white", className)} />
  ) : (
    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#d97021] to-[#ff8c42] text-xs font-bold text-white", className)}>
      {iniciais}
    </div>
  )
}

/** Reduz a imagem para um quadrado de 320 px em JPEG (fica leve para guardar e carregar) */
async function reduzir(arquivo: File): Promise<Blob> {
  const url = URL.createObjectURL(arquivo)
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => falha(new Error("Não foi possível abrir a imagem."))
      i.src = url
    })
    const lado = Math.min(img.naturalWidth, img.naturalHeight)
    const tam = Math.min(320, lado)
    const canvas = document.createElement("canvas")
    canvas.width = tam; canvas.height = tam
    const ctx = canvas.getContext("2d")!
    // recorta o centro em quadrado
    ctx.drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, tam, tam)
    return await new Promise<Blob>((ok, falha) => canvas.toBlob(b => b ? ok(b) : falha(new Error("Falha ao converter a imagem.")), "image/jpeg", 0.85))
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Campo de foto do cadastro: mostra a foto, permite trocar e remover */
export function FotoPerfil({ nome, foto, tipo, onChange }: {
  nome: string
  foto: string | null | undefined
  tipo: "usuario" | "motorista"
  onChange: (url: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)

  const escolher = async (arquivo: File | undefined) => {
    if (!arquivo) return
    if (!arquivo.type.startsWith("image/")) return toast.error("Escolha um arquivo de imagem (JPG, PNG...).")
    setEnviando(true)
    try {
      const blob = await reduzir(arquivo)
      const fd = new FormData()
      fd.append("file", new File([blob], "foto.jpg", { type: "image/jpeg" }))
      fd.append("tipo", tipo)
      const r = await enviarFoto(fd)
      if (!r.ok) return toast.error(r.erro)
      onChange(r.url)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar a foto.")
    } finally {
      setEnviando(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={() => inputRef.current?.click()} disabled={enviando}
        className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d97021]" title="Trocar foto">
        <Avatar nome={nome} foto={foto} className="h-16 w-16 text-base shadow-sm" />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition group-hover:opacity-100">
          <Camera className="h-5 w-5" />
        </span>
        {enviando && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white"><Loader2 className="h-5 w-5 animate-spin" /></span>}
      </button>
      <div className="space-y-1">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={enviando}
          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50">
          <Camera className="h-3.5 w-3.5" /> {foto ? "Trocar foto" : "Colocar foto"}
        </button>
        {foto && (
          <button type="button" onClick={() => onChange(null)} disabled={enviando}
            className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red-600">
            <Trash2 className="h-3.5 w-3.5" /> Remover
          </button>
        )}
        <p className="text-[11px] text-muted-foreground">JPG ou PNG. A foto é recortada em quadrado.</p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => escolher(e.target.files?.[0])} />
    </div>
  )
}
