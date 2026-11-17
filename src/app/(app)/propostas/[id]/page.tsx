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

  // proposta de um orçamento ligado a lead: o "voltar" leva ao lead no CRM
  let voltarPara = "/propostas"
  if (proposta.orcamento_id) {
    const { data: orc } = await supabase.from('orcamentos').select('lead_id').eq('id', proposta.orcamento_id).maybeSingle()
    if (orc?.lead_id) voltarPara = `/crm/lead/${orc.lead_id}`
  }

  return (
    <PropostaViewerClient 
      proposta={proposta} 
      voltarPara={voltarPara}
    />
  )
}
