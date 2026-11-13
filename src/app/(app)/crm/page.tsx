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
  const quadro = await obterQuadro(funil)

  return <CrmBoard quadro={quadro} leadInicial={lead || null} />
}
