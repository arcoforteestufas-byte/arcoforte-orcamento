import { dadosEntregaDoLead, obterPainel, vendasFechadas } from "@/app/actions/entregas"
import { EntregasClient } from "./entregas-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function EntregasPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; aba?: string }>
}) {
  const { lead, aba } = await searchParams
  const [painel, vendas] = await Promise.all([obterPainel(), vendasFechadas().catch(() => [])])

  // Vindo do CRM: abre "nova entrega" já preenchida com os dados do lead ganho
  let novaDoLead = null
  if (lead && !painel.erro) {
    const r = await dadosEntregaDoLead(lead)
    novaDoLead = r.ok ? r.dados! : null
  }

  return <EntregasClient painel={painel} vendas={vendas} novaDoLead={novaDoLead} abaInicial={aba || null} />
}
