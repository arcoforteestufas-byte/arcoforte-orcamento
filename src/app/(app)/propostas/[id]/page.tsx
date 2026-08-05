import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import { PropostaViewerClient } from "./proposta-viewer-client"

export default async function PropostaViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient()

  const { data: proposta, error } = await supabase
    .from('propostas')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !proposta) {
    notFound()
  }

  return (
    <PropostaViewerClient 
      proposta={proposta} 
    />
  )
}
