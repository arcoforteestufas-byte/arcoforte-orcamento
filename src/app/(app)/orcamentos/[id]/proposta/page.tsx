import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { ItemOrcamento } from "@/utils/engine"
import { PropostaClient } from "./proposta-client"
import { getCamposFaltando } from "@/utils/proposta-requisitos"

export default async function PropostaViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient()

  // 1. Fetch Orçamento
  const { data: orcamento, error: orcError } = await supabase
    .from('orcamentos')
    .select(`
      *,
      clientes ( nome, documento, cidade_uf, telefone, email, endereco, contato ),
      usuarios ( nome, telefone )
    `)
    .eq('id', id)
    .single()

  if (orcError || !orcamento) {
    console.error('Erro ao buscar orçamento para proposta', {
      id,
      message: orcError?.message,
      code: orcError?.code,
      details: orcError?.details,
      hint: orcError?.hint,
      temOrcamento: !!orcamento,
    })
    notFound()
  }

  // 1.1 Confere se os campos obrigatórios da proposta foram preenchidos
  // no orçamento (aba "Detalhes Comerciais & Logística"). Se faltar algo,
  // avisa o usuário em vez de abrir o formulário com dados incompletos.
  const camposFaltando = getCamposFaltando(orcamento)

  if (camposFaltando.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <AlertTriangle className="h-10 w-10 text-orange-500" />
        <h2 className="text-2xl font-bold tracking-tight">Faltam informações para gerar a proposta</h2>
        <p className="text-muted-foreground max-w-md">
          Antes de gerar a proposta comercial, preencha os campos abaixo na aba
          &quot;Detalhes Comerciais &amp; Logística&quot; deste orçamento e clique em &quot;Salvar Fechamento&quot;:
        </p>
        <ul className="text-sm font-medium text-slate-700 list-disc list-inside">
          {camposFaltando.map(({ campo, label }) => (
            <li key={campo}>{label}</li>
          ))}
        </ul>
        <Link href={`/orcamentos/${id}`} className={buttonVariants({ variant: "default", className: "gap-2 bg-[#d97021] hover:bg-[#c3631b] mt-2" })}>
          Voltar para o Orçamento
        </Link>
      </div>
    )
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

  return (
    <PropostaClient
      orcamento={orcamento}
      itens={itensFormatados}
    />
  )
}
