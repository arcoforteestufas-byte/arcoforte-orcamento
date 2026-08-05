import { createClient } from "@/utils/supabase/server"
import { ClientesClient } from "./clientes-client"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ClientesPage() {
  const supabase = await createClient()
  
  // Fetch clients from the database
  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('*')
    .order('criado_em', { ascending: false })
    
  if (error) {
    console.error("Erro ao buscar clientes:", error)
  }

  return <ClientesClient initialClientes={clientes || []} />
}
