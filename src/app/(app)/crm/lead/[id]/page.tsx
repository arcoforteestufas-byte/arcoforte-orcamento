import Link from "next/link"
import { obterFichaLead, obterQuadro } from "@/app/actions/crm"
import { LeadPagina } from "./lead-pagina"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ficha = await obterFichaLead(id)

  if (!ficha.ok) {
    return (
      <div className="rounded-xl border bg-background p-10 text-center space-y-3">
        <p className="font-medium">{ficha.erro}</p>
        <Link href="/crm" className="text-[#d97021] hover:underline">Voltar para o CRM</Link>
      </div>
    )
  }

  const quadro = await obterQuadro(ficha.dados!.lead.funil_id, { semLeads: true })
  return <LeadPagina ficha={ficha.dados!} quadro={quadro} />
}
