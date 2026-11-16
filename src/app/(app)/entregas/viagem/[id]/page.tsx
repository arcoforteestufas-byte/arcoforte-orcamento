import Link from "next/link"
import { obterPainel, obterPosicoes } from "@/app/actions/entregas"
import { ViagemClient } from "./viagem-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ViagemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const painel = await obterPainel()
  const viagem = painel.viagens.find(v => v.id === id)

  if (painel.erro || !viagem) {
    return (
      <div className="rounded-xl border bg-background p-10 text-center space-y-3">
        <p className="font-medium">{painel.erro || "Viagem não encontrada."}</p>
        <Link href="/entregas" className="text-[#d97021] hover:underline">Voltar para Entregas</Link>
      </div>
    )
  }

  const trilha = await obterPosicoes(id)
  return <ViagemClient painel={painel} viagem={viagem} trilha={trilha} />
}
