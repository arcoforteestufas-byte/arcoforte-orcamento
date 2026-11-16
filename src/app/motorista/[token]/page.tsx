import type { Metadata } from "next"
import { createClient } from "@/utils/supabase/server"
import { MotoristaClient, type Roteiro } from "./motorista-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "Roteiro de entrega — ArcoForte",
  robots: { index: false, follow: false },
}

// Página pública do motorista (sem login). Só funciona com o código da viagem.
export default async function MotoristaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("ent_motorista_roteiro", { p_token: token })

  if (error || !data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-lg font-semibold">Link inválido</p>
        <p className="text-sm text-slate-500">Peça um novo link para a logística da ArcoForte.</p>
      </main>
    )
  }
  return <MotoristaClient token={token} inicial={data as Roteiro} />
}
