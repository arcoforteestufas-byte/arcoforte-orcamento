import Link from "next/link"
import { filaExpedicao } from "@/app/actions/expedicao"
import { LoteClient } from "./lote-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function LotePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids } = await searchParams
  const lista = (ids || "").split(",").map(s => s.trim()).filter(Boolean)
  const { entregas, erro } = await filaExpedicao(lista)
  if (erro || !entregas.length) {
    return (
      <div className="mx-auto max-w-xl space-y-3 rounded-xl border bg-background p-10 text-center">
        <p className="font-medium">{erro || "Nenhuma das entregas escolhidas foi encontrada."}</p>
        <Link href="/expedicao" className="text-[#d97021] hover:underline">Voltar para a Expedição</Link>
      </div>
    )
  }
  // key: recomeça a tela quando alguma entrega muda de etapa
  return <LoteClient key={entregas.map(e => `${e.id}:${e.separacao?.status || "p"}`).join(",")} entregas={entregas} />
}
