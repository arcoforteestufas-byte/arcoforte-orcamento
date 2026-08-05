import { createClient, createAdminClient } from "@/utils/supabase/server"
import { OrcamentoForm } from "./orcamento-form"

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

export default async function NovoOrcamentoPage() {
  const supabase = await createClient()
  const supabaseAdmin = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  const cargo = user?.user_metadata?.cargo || 'Visualizador'
  const isAdministrador = cargo === 'Administrador'

  const { data: parametrosDef, error } = await supabaseAdmin
    .from('parametros_estufa')
    .select('*')
    .eq('ativo', true)
    .order('criado_em', { ascending: true })

  console.log('DEBUG VERCEL:', {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    user: (await supabase.auth.getUser()).data.user?.id,
    parametrosCount: parametrosDef?.length,
    error
  })

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Novo Orçamento Rápido</h2>
          <p className="text-muted-foreground">
            Preencha as especificações técnicas da estufa para gerar a lista de materiais.
          </p>
        </div>
      </div>

      <OrcamentoForm 
        parametrosDef={parametrosDef || []} 
        regras={regras as any || []} 
        produtos={produtos || []} 
        clientes={clientes || []}
      />
    </div>
  )
}
