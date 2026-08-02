import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import { ItemOrcamento } from "@/utils/engine"
import { PropostaClient } from "./proposta-client"
import { gerarTextoProposta } from "@/utils/proposta-template"

export default async function PropostaViewPage({ params }: { params: Promise<{ id: string }> }) {
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

  // Transformar os itens do DB no formato ItemOrcamento
  const itensFormatados: ItemOrcamento[] = (itens || []).map((item: any) => ({
    regra_id: '',
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

  const textoInicial = gerarTextoProposta(orcamento, itensFormatados)

  return (
    <PropostaClient 
      orcamento={orcamento} 
      textoInicial={textoInicial} 
    />
  )
}
