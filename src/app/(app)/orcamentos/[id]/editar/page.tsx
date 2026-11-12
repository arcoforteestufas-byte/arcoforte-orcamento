import { createClient, createAdminClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import { OrcamentoForm } from "../../novo/orcamento-form"
import { ItemOrcamento } from "@/utils/engine"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

export default async function EditarOrcamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const supabaseAdmin = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  const cargo = user?.user_metadata?.cargo || 'Visualizador'
  const isAdministrador = cargo === 'Administrador'

  // 1. Buscar o orçamento existente
  const { data: orcamento, error: orcError } = await supabaseAdmin
    .from('orcamentos')
    .select('*')
    .eq('id', id)
    .single()

  if (orcError || !orcamento) {
    console.error('Erro ao buscar orçamento para edição:', { id, orcError })
    notFound()
  }

  // 2. Buscar os itens do orçamento
  const { data: itens } = await supabaseAdmin
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

  // 3. Buscar parâmetros, produtos, regras e clientes
  const { data: parametrosDef } = await supabaseAdmin
    .from('parametros_estufa')
    .select('*')
    .eq('ativo', true)
    .order('criado_em', { ascending: true })

  const { data: produtos } = await supabaseAdmin
    .from('produtos')
    .select('*')
    .eq('ativo', true)

  const { data: regras } = await supabaseAdmin
    .from('regras_calculo')
    .select(`
      id, posicao_id, produto_codigo, formula_quantidade, condicao_aplicabilidade,
      unidade_medida, regra_arredondamento, margem_perda,
      posicoes (nome, grupo_id, grupos_componentes (nome, ordem))
    `)
    .eq('ativo', true)

  let clientesQuery = supabaseAdmin
    .from('clientes')
    .select('id, nome, documento, cidade_uf')
    .order('nome', { ascending: true })

  if (!isAdministrador && user) {
    clientesQuery = clientesQuery.eq('vendedor_id', user.id)
  }

  const { data: clientes } = await clientesQuery

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/orcamentos/${orcamento.id}`} className={buttonVariants({ variant: "outline", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Editar Orçamento #ORC-{orcamento.id.split('-')[0].toUpperCase()}
          </h2>
          <p className="text-muted-foreground">
            Altere o cliente, dimensões, parâmetros técnicos ou a lista de materiais do pedido.
          </p>
        </div>
      </div>

      <OrcamentoForm
        parametrosDef={parametrosDef || []}
        regras={regras as any || []}
        produtos={produtos || []}
        clientes={clientes || []}
        orcamentoInicial={{
          id: orcamento.id,
          cliente_id: orcamento.cliente_id,
          status: orcamento.status,
          parametros_utilizados: orcamento.parametros_utilizados || {},
          itens: itensFormatados
        }}
      />
    </div>
  )
}

