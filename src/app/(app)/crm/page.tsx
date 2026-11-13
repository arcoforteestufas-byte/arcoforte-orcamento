import { redirect } from "next/navigation"
import { obterQuadro } from "@/app/actions/crm"
import { CrmBoard } from "./crm-board"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ funil?: string; lead?: string }>
}) {
  const { funil, lead } = await searchParams
  // Links antigos (/crm?lead=<id>) abrem a página do lead
  if (lead) redirect(`/crm/lead/${lead}`)

  const quadro = await obterQuadro(funil)
  return <CrmBoard quadro={quadro} />
}
