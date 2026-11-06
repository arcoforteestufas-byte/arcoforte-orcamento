import { createAdminClient } from "@/utils/supabase/server"
import { RegrasTable } from "./regras-table"

export default async function RegrasMontagemPage() {
  const supabaseAdmin = await createAdminClient()

  const { data: grupos } = await supabaseAdmin.from('grupos_componentes').select('*').order('ordem')
  const { data: posicoes } = await supabaseAdmin.from('posicoes').select('*')
  const { data: regras } = await supabaseAdmin.from('regras_calculo').select('*').eq('ativo', true)
  const { data: produtos } = await supabaseAdmin.from('produtos').select('codigo, descricao')

  if (!grupos) return <div>Carregando...</div>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Regras de Montagem</h2>
        <p className="text-muted-foreground">
          Consulta das regras ativas. Para alterar regras use Configurações → Pacote de Regras.
        </p>
      </div>

      <RegrasTable
        grupos={grupos}
        posicoes={posicoes || []}
        regras={regras || []}
        produtos={produtos || []}
      />
    </div>
  )
}
