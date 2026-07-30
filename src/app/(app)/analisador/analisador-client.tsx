"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileUp, Search, AlertTriangle, CheckCircle2, XCircle, ArrowRightCircle, Sparkles } from "lucide-react"
import { calcularOrcamento } from "@/utils/engine"

type AnalisadorClientProps = {
  regras: any[];
  produtos: any[];
  posicoes: any[];
}

type PdfItem = {
  codigo: string | null;
  descricao: string;
  quantidade: number;
  unidade: string;
}

export function AnalisadorClient({ regras, produtos, posicoes }: AnalisadorClientProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Parâmetros extraídos pela IA ou preenchidos pelo usuário
  const [parametros, setParametros] = useState<any>({
    n_vaos: 0,
    n_modulos: 0,
    pe_direito: 0,
    largura_modulo: 0,
    // defaults
    tipo_arco: "simples",
    cobertura: false,
    fechamento_lateral: false,
    calha_lateral: false
  })

  const [pdfItens, setPdfItens] = useState<PdfItem[]>([])
  const [gabarito, setGabarito] = useState<any[]>([])
  const [analiseFeita, setAnaliseFeita] = useState(false)

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const analisarPdf = async () => {
    if (!file) return
    setIsAnalyzing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/analisar-pdf", {
        method: "POST",
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro desconhecido ao ler o PDF.")
      }

      setPdfItens(data.itens || [])
      
      // Atualizar os parâmetros com o que a IA encontrou (se houver)
      if (data.parametros_estufa) {
        setParametros((prev: any) => ({
          ...prev,
          ...data.parametros_estufa
        }))
      }

      setAnaliseFeita(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const gerarComparacao = () => {
    // Roda o motor matemático
    const resultado = calcularOrcamento(parametros, regras, produtos)
    setGabarito(resultado)
  }

  // Gera o Diff Table
  const comparar = () => {
    if (!analiseFeita || gabarito.length === 0) return []

    const comparacao: any[] = []
    
    // 1. Percorrer o gabarito
    gabarito.forEach(itemGabarito => {
      const pdfMatch = pdfItens.find(p => p.codigo === itemGabarito.codigo || (p.descricao.toLowerCase().includes(itemGabarito.descricao.toLowerCase())))
      
      if (pdfMatch) {
        comparacao.push({
          codigo: itemGabarito.codigo,
          descricao: itemGabarito.descricao,
          qtdGabarito: itemGabarito.quantidade,
          qtdPdf: pdfMatch.quantidade,
          status: itemGabarito.quantidade === pdfMatch.quantidade ? 'ok' : 'divergente'
        })
      } else {
        comparacao.push({
          codigo: itemGabarito.codigo,
          descricao: itemGabarito.descricao,
          qtdGabarito: itemGabarito.quantidade,
          qtdPdf: 0,
          status: 'falta'
        })
      }
    })

    // 2. Achar itens no PDF que não estão no Gabarito
    pdfItens.forEach(itemPdf => {
      const gMatch = gabarito.find(g => g.codigo === itemPdf.codigo || (g.descricao.toLowerCase().includes(itemPdf.descricao.toLowerCase())))
      if (!gMatch) {
        comparacao.push({
          codigo: itemPdf.codigo,
          descricao: itemPdf.descricao,
          qtdGabarito: 0,
          qtdPdf: itemPdf.quantidade,
          status: 'sobra_desconhecido'
        })
      }
    })

    return comparacao
  }

  const relatorio = comparar()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Coluna 1: Upload e Parâmetros */}
      <div className="space-y-6 lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>1. Upload do PDF</CardTitle>
            <CardDescription>Envie o pedido ou orçamento em PDF</CardDescription>
          </CardHeader>
          <CardContent>
            {!file ? (
              <label 
                onDragOver={e => e.preventDefault()}
                onDrop={handleFileDrop}
                className="border-2 border-dashed border-zinc-300 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-zinc-50 cursor-pointer transition-colors"
              >
                <FileUp className="h-10 w-10 text-zinc-400 mb-4" />
                <p className="text-sm font-medium">Arraste um PDF aqui</p>
                <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar</p>
                <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
              </label>
            ) : (
              <div className="bg-zinc-50 p-4 rounded-md border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-2 rounded">
                    <FileUp className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm truncate w-40">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Trocar</Button>
              </div>
            )}

            {error && (
              <div className="mt-4 text-xs bg-red-50 text-red-600 p-3 rounded border border-red-100">
                {error}
              </div>
            )}

            <Button 
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700" 
              disabled={!file || isAnalyzing}
              onClick={analisarPdf}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isAnalyzing ? "IA Lendo Documento..." : "Ler Itens com IA"}
            </Button>
          </CardContent>
        </Card>

        {analiseFeita && (
          <Card className="border-indigo-200 shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">2. Parâmetros (Gabarito)</CardTitle>
              <CardDescription>Revise os dados que a IA encontrou ou preencha manualmente para o cálculo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Qtd. Vãos</Label>
                  <Input type="number" value={parametros.n_vaos} onChange={e => setParametros({...parametros, n_vaos: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Qtd. Naves (Módulos)</Label>
                  <Input type="number" value={parametros.n_modulos} onChange={e => setParametros({...parametros, n_modulos: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pé-Direito (m)</Label>
                  <Input type="number" value={parametros.pe_direito} onChange={e => setParametros({...parametros, pe_direito: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Largura Módulo (m)</Label>
                  <Input type="number" value={parametros.largura_modulo} onChange={e => setParametros({...parametros, largura_modulo: Number(e.target.value)})} />
                </div>
              </div>

              <Button 
                onClick={gerarComparacao} 
                className="w-full bg-[#d97021] hover:bg-[#c3631b] mt-2"
              >
                Gerar Comparação
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Coluna 2: Resultados */}
      <div className="lg:col-span-2">
        <Card className="h-full min-h-[500px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" /> Relatório da Análise
            </CardTitle>
            <CardDescription>Comparação entre o que está no papel e o ideal.</CardDescription>
          </CardHeader>
          <CardContent>
            
            {!analiseFeita ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-zinc-400">
                <Search className="h-16 w-16 mb-4 opacity-20" />
                <p>Aguardando leitura do PDF...</p>
              </div>
            ) : gabarito.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-zinc-400 text-center px-8">
                <CheckCircle2 className="h-16 w-16 mb-4 text-emerald-400 opacity-50" />
                <p className="text-lg text-zinc-800 font-semibold mb-2">PDF Lido com Sucesso!</p>
                <p>A IA encontrou {pdfItens.length} itens no documento.</p>
                <p className="text-sm mt-4 text-amber-600 bg-amber-50 p-3 rounded">
                  Confira os parâmetros na barra lateral e clique em <b>"Gerar Comparação"</b> para cruzar os dados.
                </p>
              </div>
            ) : (
              <div className="border rounded-md">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-100 border-b text-zinc-600">
                    <tr>
                      <th className="p-3 font-semibold">Produto</th>
                      <th className="p-3 font-semibold text-center">Gabarito (Ideal)</th>
                      <th className="p-3 font-semibold text-center">No PDF</th>
                      <th className="p-3 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.map((r, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium text-zinc-800">{r.codigo ? r.codigo + " - " : ""}{r.descricao}</td>
                        <td className="p-3 text-center">{r.qtdGabarito > 0 ? r.qtdGabarito : "-"}</td>
                        <td className="p-3 text-center">{r.qtdPdf > 0 ? r.qtdPdf : "-"}</td>
                        <td className="p-3 text-center">
                          {r.status === 'ok' && (
                            <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-semibold">
                              <CheckCircle2 className="h-3 w-3" /> Correto
                            </span>
                          )}
                          {r.status === 'divergente' && (
                            <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-xs font-semibold">
                              <AlertTriangle className="h-3 w-3" /> Difere
                            </span>
                          )}
                          {r.status === 'falta' && (
                            <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-semibold">
                              <XCircle className="h-3 w-3" /> Faltando no Pedido
                            </span>
                          )}
                          {r.status === 'sobra_desconhecido' && (
                            <span className="inline-flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-1 rounded-full text-xs font-semibold">
                              <ArrowRightCircle className="h-3 w-3" /> Desconhecido/Sobra
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </CardContent>
        </Card>
      </div>

    </div>
  )
}
