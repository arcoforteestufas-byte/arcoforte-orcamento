import type { Metadata } from "next"
import Link from "next/link"
import { obterPainel } from "@/app/actions/entregas"
import { PainelTelaCheia } from "./painel-tela-cheia"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = { title: "Painel de entregas — ArcoForte" }

// Painel em tela cheia (sem o menu do sistema), bom para TV do escritório. Exige login.
export default async function PainelEntregasPage() {
  const painel = await obterPainel()
  if (painel.erro) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 p-6 text-center text-slate-200">
        <p className="text-lg font-semibold">{painel.erro}</p>
        <Link href="/entregas" className="text-orange-400 hover:underline">Voltar para Entregas</Link>
      </main>
    )
  }
  return <PainelTelaCheia painel={painel} />
}
