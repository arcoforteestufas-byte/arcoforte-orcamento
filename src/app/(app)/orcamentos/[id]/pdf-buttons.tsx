"use client"

import { Button } from "@/components/ui/button"
import { Download, FileText } from "lucide-react"
import { ItemOrcamento } from "@/utils/engine"
import { useRouter } from "next/navigation"

export function PdfButtons({ itens, orcamento }: { itens: ItemOrcamento[], orcamento: any }) {
  const router = useRouter()

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
      <div className="h-px bg-zinc-800 my-2" />
      <Button 
        variant="outline" 
        className="w-full justify-start gap-2 border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white"
        onClick={() => router.push(`/orcamentos/${orcamento.id}/proposta`)}
      >
        <FileText className="h-4 w-4" />
        Gerar Proposta Comercial
      </Button>
    </div>
  )
}
