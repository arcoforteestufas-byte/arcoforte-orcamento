import { filaExpedicao } from "@/app/actions/expedicao"
import { ExpedicaoClient } from "./expedicao-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ExpedicaoPage() {
  const { entregas, erro } = await filaExpedicao()
  return <ExpedicaoClient entregas={entregas} erro={erro || null} />
}
