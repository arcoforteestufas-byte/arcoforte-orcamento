import Link from "next/link"
import { obterSeparacao } from "@/app/actions/expedicao"
import { SeparacaoClient } from "./separacao-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function SeparacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { dados, erro } = await obterSeparacao(id)
  if (!dados) {
    return (
      <div className="mx-auto max-w-xl space-y-3 rounded-xl border bg-background p-10 text-center">
        <p className="font-medium">{erro || "Entrega não encontrada."}</p>
        <Link href="/expedicao" className="text-[#d97021] hover:underline">Voltar para a Expedição</Link>
      </div>
    )
  }
  // key: recomeça o estado da tela quando a separação muda no servidor
  return <SeparacaoClient key={dados.entrega.separacao?.status || "pendente"} {...dados} />
}
