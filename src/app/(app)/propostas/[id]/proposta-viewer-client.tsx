"use client"

import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft, FileText } from "lucide-react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import dynamic from "next/dynamic"

// Importar react-pdf via dynamic import para rodar apenas no client side
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false, loading: () => <p className="text-center p-12 text-muted-foreground">Carregando visualizador de PDF...</p> }
)
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false }
)
import { PropostaDocument } from "../../components/PropostaDocument"

export function PropostaViewerClient({ proposta }: { proposta: any }) {
  const hasDadosJson = !!proposta.dados_json

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex flex-col gap-6 pb-12 print:pb-0 h-[calc(100vh-100px)]">
      <div className="flex items-center justify-between gap-4 print:hidden shrink-0">
        <div className="flex items-center gap-4">
          <Link href={`/propostas`} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Proposta Comercial</h2>
            <p className="text-muted-foreground">Cliente: {proposta.cliente_nome}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {proposta.arquivo_docx_url && (
            <a href={proposta.arquivo_docx_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Baixar Word
              </Button>
            </a>
          )}
          {hasDadosJson ? (
            <PDFDownloadLink document={<PropostaDocument dados={proposta.dados_json} />} fileName={`proposta_${proposta.cliente_nome.replace(/\s+/g, '_')}.pdf`}>
              <Button className="gap-2 bg-[#d97021] hover:bg-[#c3631b] text-white">
                <Printer className="h-4 w-4" />
                Baixar PDF Oficial
              </Button>
            </PDFDownloadLink>
          ) : (
            <Button 
              onClick={handlePrint}
              className="gap-2 bg-[#d97021] hover:bg-[#c3631b] text-white"
            >
              <Printer className="h-4 w-4" />
              Imprimir Histórico (Markdown)
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 w-full bg-slate-100 border rounded-lg overflow-hidden shadow-inner">
        {hasDadosJson ? (
          <PDFViewer width="100%" height="100%" className="w-full h-full border-none">
            <PropostaDocument dados={proposta.dados_json} />
          </PDFViewer>
        ) : (
          <div className="flex justify-center p-8 overflow-y-auto h-full">
            <div className="w-full max-w-4xl bg-white border rounded-lg shadow-sm p-12 print:p-0 print:border-none print:shadow-none print:w-full print:max-w-none proposta-print-container">
              <div className="max-w-none text-slate-800">
                <p className="text-sm text-red-500 mb-8 font-bold">
                  Aviso: Esta proposta é antiga e não possui o histórico visual de PDF (dados_json). 
                  Abaixo está o texto salvo em Markdown.
                </p>
                <ReactMarkdown
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-[#d97021] border-b pb-4 mb-6" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4 border-b pb-2" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-lg font-bold text-slate-700 mt-6 mb-3" {...props} />,
                    table: ({node, ...props}) => <table className="w-full border-collapse my-6 text-sm" {...props} />,
                    th: ({node, ...props}) => <th className="border border-slate-300 bg-slate-100 p-2 text-left font-bold" {...props} />,
                    td: ({node, ...props}) => <td className="border border-slate-300 p-2" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
                    li: ({node, ...props}) => <li className="text-slate-700 leading-relaxed" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-slate-900" {...props} />,
                    p: ({node, ...props}) => {
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
                  {proposta.texto_conteudo}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
