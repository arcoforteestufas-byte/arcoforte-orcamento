import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { PdfButtons } from "./pdf-buttons"
import { ItemOrcamento } from "@/utils/engine"
import { OrcamentoComercial } from "./orcamento-comercial-client"

export default async function OrcamentoViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient()

  // 1. Fetch Orçamento
  const { data: orcamento, error: orcError } = await supabase
    .from('orcamentos')
    .select(`
      *,
      clientes ( nome, documento, cidade_uf )
    `)
    .eq('id', id)
    .single()

  if (orcError || !orcamento) {
    notFound()
  }

  // 2. Fetch Itens
  const { data: itens, error: itensError } = await supabase
    .from('orcamento_itens')
    .select(`
      *,
      produtos ( descricao ),
      posicoes (
        nome,
        grupos_componentes ( nome )
      )
    `)
    .eq('orcamento_id', id)
    .order('criado_em', { ascending: true })

  // Transformar os itens do DB no formato ItemOrcamento esperado pelo PDF
  const itensFormatados: ItemOrcamento[] = (itens || []).map((item: any) => ({
    regra_id: '', // Não precisamos mais da regra aqui
    posicao_id: item.posicao_id || '',
    grupo_id: '',
    grupo_nome: item.posicoes?.grupos_componentes?.nome || 'Itens Avulsos',
    posicao_nome: item.posicoes?.nome || 'Avulso',
    produto_codigo: item.produto_codigo,
    produto_descricao: item.produtos?.descricao || 'Produto não encontrado',
    quantidade_bruta: Number(item.quantidade),
    quantidade_final: Number(item.quantidade),
    unidade: item.unidade,
    preco_unitario: Number(item.preco_unitario),
    valor_total: Number(item.valor_total),
    peso_bruto_total: 0,
    peso_liquido_total: 0,
    isManualChange: item.origem === 'manual',
    manualOriginalProduto: item.descricao_customizada?.replace('Substituiu: ', '') || ''
  }))

  const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  const dataCriacao = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(orcamento.criado_em))

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/orcamentos" className={buttonVariants({ variant: "outline", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Detalhes do Orçamento</h2>
          <p className="text-muted-foreground">ID: #{orcamento.id.split('-')[0].toUpperCase()}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle>Cliente: {orcamento.clientes?.nome}</CardTitle>
              <CardDescription className="mt-1">
                {orcamento.clientes?.documento ? `Documento: ${orcamento.clientes.documento}` : "Sem documento registrado"} <br/>
                {orcamento.clientes?.cidade_uf ? `Local: ${orcamento.clientes.cidade_uf}` : "Local não informado"}
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 uppercase tracking-wider">
              {orcamento.status}
            </Badge>
          </CardHeader>
          <CardContent className="text-sm text-slate-500 mt-4">
            Gerado em {dataCriacao}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 text-white">
          <CardHeader>
            <CardTitle className="text-lg text-zinc-300">Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#d97021] mt-2 mb-4">
              {formatadorMoeda.format(orcamento.valor_total)}
            </div>
            
            <PdfButtons itens={itensFormatados} orcamento={orcamento} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Materiais Salva</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Array.from(new Set(itensFormatados.map(i => i.grupo_nome))).map(grupo => (
              <div key={grupo}>
                <h3 className="font-bold border-b pb-2 mb-3 text-slate-700">{grupo}</h3>
                <div className="space-y-2">
                  {itensFormatados.filter(i => i.grupo_nome === grupo).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm bg-slate-50 p-2 rounded">
                      <div>
                        <span className="font-medium">{item.produto_descricao}</span>
                        <span className="text-xs text-muted-foreground ml-2">({item.posicao_nome})</span>
                        {item.isManualChange && (
                          <Badge variant="outline" className="ml-2 text-[10px] h-5 bg-orange-50 text-orange-600 border-orange-200">
                            Substituído
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{item.quantidade_final} {item.unidade}</span>
                        <span className="text-xs text-muted-foreground block">
                          {formatadorMoeda.format(item.valor_total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <OrcamentoComercial orcamento={orcamento} />
    </div>
  )
}
