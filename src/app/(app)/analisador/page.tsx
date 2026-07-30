import { createClient } from "@/utils/supabase/server"
import { AnalisadorClient } from "./analisador-client"

export default async function AnalisadorPage() {
  const supabase = await createClient()

  // Buscar todos os dados necessários para rodar o motor matematico no cliente
  const { data: regras } = await supabase.from('regras_calculo').select('*').eq('ativo', true)
  const { data: produtos } = await supabase.from('produtos').select('*')
  const { data: posicoes } = await supabase.from('posicoes').select('*')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analisador de Pedidos (PDF)</h2>
          <p className="text-muted-foreground">
            Faça upload de um PDF com lista de peças para a Inteligência Artificial ler e comparar com o nosso motor.
          </p>
        </div>
      </div>

      <AnalisadorClient 
        regras={regras || []}
        produtos={produtos || []}
        posicoes={posicoes || []}
      />
    </div>
  )
}
