"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { ItemOrcamento } from "@/utils/engine"

export function PdfButtons({ itens, orcamento }: { itens: ItemOrcamento[], orcamento: any }) {
  const handleDownload = async (agrupado: boolean) => {
    const { gerarPDFOrcamento } = await import('@/utils/pdf-generator')
    gerarPDFOrcamento(orcamento, itens, agrupado)
  }

  return (
    <div className="flex flex-col gap-3">
      <Button 
        variant="outline" 
        className="w-full justify-start gap-2 border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white"
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
    </div>
  )
}
