"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Camera, Download, Loader2, Maximize2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { uploadArquivoParaAssets } from "@/utils/upload-asset"

export type OpcaoOrcamento3D = { id: string; rotulo: string; hash: string; croquiUrl: string }

type Captura = { url: string; cfg: Record<string, unknown> }

export function Estufa3DViewer({ opcoes, inicialId, podeSalvar }: { opcoes: OpcaoOrcamento3D[]; inicialId: string; podeSalvar: boolean }) {
  const router = useRouter()
  const frame = useRef<HTMLIFrameElement>(null)
  const [selecionado, setSelecionado] = useState(inicialId)
  const [salvando, setSalvando] = useState(false)
  const [croquiAtual, setCroquiAtual] = useState<Record<string, string>>({})
  const opcao = opcoes.find(o => o.id === selecionado)
  const src = "/api/estufa3d" + (opcao?.hash || "")
  const croquiUrl = (selecionado && croquiAtual[selecionado]) || opcao?.croquiUrl || ""

  // Pede ao 3D a imagem da vista atual (com a faixa da marca) e a configuração montada
  const capturar = () => new Promise<Captura>((resolve, reject) => {
    const win = frame.current?.contentWindow
    if (!win) return reject(new Error("O 3D ainda não carregou."))
    const id = Math.random().toString(36).slice(2)
    const fim = setTimeout(() => { window.removeEventListener("message", ouvir); reject(new Error("O 3D não respondeu. Espere carregar e tente de novo.")) }, 8000)
    function ouvir(ev: MessageEvent) {
      const d = ev.data
      if (ev.source !== win || !d || d.afe !== "img" || d.id !== id) return
      clearTimeout(fim)
      window.removeEventListener("message", ouvir)
      if (!d.url) return reject(new Error("Não foi possível gerar a imagem."))
      resolve({ url: d.url, cfg: d.cfg || {} })
    }
    window.addEventListener("message", ouvir)
    win.postMessage({ afe: "img", id, w: 2000, q: 0.9 }, window.location.origin)
  })

  const baixar = async () => {
    try {
      const { url } = await capturar()
      const a = document.createElement("a")
      a.href = url
      a.download = "croqui-estufa-arcoforte.jpg"
      a.click()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const usarNaProposta = async () => {
    if (!selecionado) return
    setSalvando(true)
    try {
      const { url, cfg } = await capturar()
      const blob = await (await fetch(url)).blob()
      const nome = `croquis-3d/${selecionado}-${Date.now()}.jpg`
      const publicUrl = await uploadArquivoParaAssets(blob, nome)

      const supabase = createClient()
      const { data: atual, error: erroLer } = await supabase
        .from("orcamentos").select("parametros_utilizados").eq("id", selecionado).single()
      if (erroLer) throw erroLer
      const { error } = await supabase
        .from("orcamentos")
        .update({
          parametros_utilizados: {
            ...(atual?.parametros_utilizados || {}),
            croqui_url: publicUrl,
            croqui_id: "",
            croqui_3d: cfg,
          },
        })
        .eq("id", selecionado)
      if (error) throw error

      setCroquiAtual(c => ({ ...c, [selecionado]: publicUrl }))
      toast.success("Croqui salvo no orçamento. Ele já sai na proposta.")
      router.refresh()
    } catch (e: any) {
      toast.error("Erro ao salvar o croqui: " + (e?.message || e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col lg:flex-row gap-2 lg:items-center">
        <label htmlFor="orc3d" className="text-sm font-medium whitespace-nowrap">Orçamento:</label>
        <select
          id="orc3d"
          value={selecionado}
          onChange={e => setSelecionado(e.target.value)}
          className="h-9 w-full lg:max-w-xl rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Montar livremente (sem orçamento)</option>
          {opcoes.map(o => (
            <option key={o.id} value={o.id}>{o.rotulo}</option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2 lg:ml-auto">
          {selecionado && podeSalvar && (
            <Button onClick={usarNaProposta} disabled={salvando} className="gap-2 bg-[#d97021] hover:bg-[#c3631b]">
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              Usar esta vista como croqui da proposta
            </Button>
          )}
          <Button variant="outline" onClick={baixar} className="gap-2">
            <Download className="h-4 w-4" /> Baixar imagem
          </Button>
          <Button variant="outline" size="icon" title="Abrir em outra aba" onClick={() => window.open(src, "_blank")}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selecionado && croquiUrl && (
        <div className="flex items-center gap-3 rounded-md border p-2 text-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={croquiUrl} alt="Croqui atual do orçamento" className="h-12 w-20 object-cover rounded shrink-0" />
          <span className="text-slate-600 flex-1">Croqui atual deste orçamento (é o que sai na proposta).</span>
          <Link href={`/orcamentos/${selecionado}`} className="text-[#d97021] hover:underline whitespace-nowrap">Abrir orçamento →</Link>
        </div>
      )}

      <div className="rounded-xl border overflow-hidden bg-white" style={{ height: "calc(100vh - 230px)", minHeight: 520 }}>
        <iframe
          ref={frame}
          key={src}
          src={src}
          title="Estufa 3D"
          className="w-full h-full border-0"
          allow="fullscreen"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Dica: gire e aproxime a estufa até a vista que quer mostrar, ligue ou desligue as medidas, e só então gere o croqui.
        O 3D é para visualizar a ideia; medidas, perfis e materiais finais seguem o orçamento.
      </p>
    </div>
  )
}
