"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Download, FileText, AlertTriangle } from "lucide-react"
import { ItemOrcamento } from "@/utils/engine"
import { getCamposFaltando } from "@/utils/proposta-requisitos"

export function PdfButtons({ itens, orcamento }: { itens: ItemOrcamento[], orcamento: any }) {
  const [camposFaltando, setCamposFaltando] = useState<{ campo: string; label: string }[]>([])

  const handleDownload = async (agrupado: boolean) => {
    const { gerarPDFOrcamento } = await import('@/utils/pdf-generator')
    gerarPDFOrcamento(orcamento, itens, agrupado)
  }

  const handleGerarProposta = () => {
    const faltando = getCamposFaltando(orcamento)
    if (faltando.length > 0) {
      setCamposFaltando(faltando)
      return
    }
    // Navegação "dura" (recarrega a página de verdade) pra nunca reaproveitar
    // uma resposta antiga em cache dessa rota, visitada antes dos dados serem salvos.
    window.location.href = `/orcamentos/${orcamento.id}/proposta`
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="outline"
        className="w-full justify-start gap-2 bg-transparent border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white"
        onClick={() => handleDownload(false)}
      >
        <Download className="h-4 w-4" />
        Exportar PDF (Detalhado)
      </Button>
      <Button
        className="w-full justify-start gap-2 bg-[#d97021] hover:bg-[#c3631b] text-white"
        onClick={() => handleDownload(true)}
      >
        <Download className="h-4 w-4" />
        Exportar PDF (Agrupado)
      </Button>
      <div className="h-px bg-zinc-800 my-2" />
      <Button
        variant="outline"
        className="w-full justify-start gap-2 bg-transparent border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white"
        onClick={handleGerarProposta}
      >
        <FileText className="h-4 w-4" />
        Gerar Proposta Comercial
      </Button>

      <Dialog open={camposFaltando.length > 0} onOpenChange={(open) => !open && setCamposFaltando([])}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Faltam informações para gerar a proposta
            </DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo em &quot;Detalhes Comerciais &amp; Logística&quot; e clique em
              &quot;Salvar Fechamento&quot; antes de gerar a proposta:
            </DialogDescription>
          </DialogHeader>
          <ul className="text-sm font-medium text-slate-700 list-disc list-inside">
            {camposFaltando.map(({ campo, label }) => (
              <li key={campo}>{label}</li>
            ))}
          </ul>
          <DialogFooter>
            <Button
              className="bg-[#d97021] hover:bg-[#c3631b] text-white"
              onClick={() => setCamposFaltando([])}
            >
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
