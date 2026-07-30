import { createClient } from "@/utils/supabase/server"
import { OrcamentoForm } from "./orcamento-form"

export default async function NovoOrcamentoPage() {
  const supabase = await createClient()

  const { data: parametrosDef } = await supabase
    .from('parametros_estufa')
    .select('*')
    .eq('ativo', true)
    .order('criado_em', { ascending: true })

  const { data: produtos } = await supabase
    .from('produtos')
    .select('*')
    .eq('ativo', true)

  const { data: regras } = await supabase
    .from('regras_calculo')
    .select(`
      id, posicao_id, produto_codigo, formula_quantidade, condicao_aplicabilidade,
      unidade_medida, regra_arredondamento, margem_perda,
      posicoes (nome, grupo_id, grupos_componentes (nome, ordem))
    `)
    .eq('ativo', true)

  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nome, documento, cidade_uf')
    .order('nome', { ascending: true })

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
