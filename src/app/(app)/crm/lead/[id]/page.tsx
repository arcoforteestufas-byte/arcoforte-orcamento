import Link from "next/link"
import { obterFichaLead, obterQuadro } from "@/app/actions/crm"
import { entregasDoLead, proximasViagensPorUf } from "@/app/actions/entregas"
import { LeadPagina } from "./lead-pagina"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function LeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ salvo?: string }>
}) {
  const { id } = await params
  const { salvo } = await searchParams
  const ficha = await obterFichaLead(id)

  if (!ficha.ok) {
    return (
      <div className="rounded-xl border bg-background p-10 text-center space-y-3">
        <p className="font-medium">{ficha.erro}</p>
        <Link href="/crm" className="text-[#d97021] hover:underline">Voltar para o CRM</Link>
      </div>
    )
  }

  const [quadro, fretes, entregas] = await Promise.all([
    obterQuadro(ficha.dados!.lead.funil_id, { semLeads: true }),
    // viagens programadas para o estado do lead (se o módulo de entregas ainda não existir, vem vazio)
    proximasViagensPorUf(ficha.dados!.lead.uf).catch(() => []),
    entregasDoLead(id).catch(() => []),
  ])
  return <LeadPagina ficha={ficha.dados!} quadro={quadro} orcamentoSalvoId={salvo || null} fretes={fretes} entregas={entregas} />
}
