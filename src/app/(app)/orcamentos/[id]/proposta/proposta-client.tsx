"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft, Edit3, Eye } from "lucide-react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"

export function PropostaClient({ orcamento, textoInicial }: { orcamento: any, textoInicial: string }) {
  const [texto, setTexto] = useState(textoInicial)
  const [modoEdicao, setModoEdicao] = useState(false)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex flex-col gap-6 pb-12 print:pb-0">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Link href={`/orcamentos/${orcamento.id}`} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Proposta Comercial</h2>
            <p className="text-muted-foreground">ID: #{orcamento.id.split('-')[0].toUpperCase()}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setModoEdicao(!modoEdicao)}
            className="gap-2"
          >
            {modoEdicao ? <Eye className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
            {modoEdicao ? "Visualizar" : "Editar Texto"}
          </Button>
          <Button 
            onClick={handlePrint}
            className="gap-2 bg-[#d97021] hover:bg-[#c3631b] text-white"
          >
            <Printer className="h-4 w-4" />
            Imprimir / Salvar PDF
          </Button>
        </div>
      </div>

      <div className="flex justify-center">
        {modoEdicao ? (
          <div className="w-full max-w-4xl bg-white border rounded-lg shadow-sm p-4 print:hidden">
            <p className="text-sm text-muted-foreground mb-4">
              Você pode editar o texto da proposta usando Markdown. O formato será convertido automaticamente para impressão.
            </p>
            <textarea 
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="w-full min-h-[800px] p-4 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#d97021]"
            />
          </div>
        ) : (
          <div className="w-full max-w-4xl bg-white border rounded-lg shadow-sm p-12 print:p-0 print:border-none print:shadow-none print:w-full print:max-w-none proposta-print-container">
            <div className="max-w-none text-slate-800">
              <ReactMarkdown
                components={{
                  // Permite que o html inserido funcione se necessário
                  h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-[#d97021] border-b pb-4 mb-6" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4 border-b pb-2" {...props} />,
                  table: ({node, ...props}) => <table className="w-full border-collapse my-6 text-sm" {...props} />,
                  th: ({node, ...props}) => <th className="border border-slate-300 bg-slate-100 p-2 text-left font-bold" {...props} />,
                  td: ({node, ...props}) => <td className="border border-slate-300 p-2" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
                  li: ({node, ...props}) => <li className="text-slate-700 leading-relaxed" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-bold text-slate-900" {...props} />,
                  p: ({node, ...props}) => {
                    // Check if the paragraph has our html signature block
                    if (Array.isArray(props.children) && typeof props.children[0] === 'string' && (props.children[0] as string).includes('Vendedor (ArcoForte)')) {
                      return (
                        <div className="flex justify-between mt-24">
                          <div className="border-t border-black w-[45%] text-center pt-2">
                            Vendedor (ArcoForte)
                          </div>
                          <div className="border-t border-black w-[45%] text-center pt-2">
                            Assinatura do Cliente<br/>
                            <span className="text-xs">Local e Data: ___________________, ____/____/______</span>
                          </div>
                        </div>
                      )
                    }
                    return <p className="mb-4 text-slate-700 leading-relaxed" {...props} />
                  }
                }}
              >
                {texto}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
