import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/utils/supabase/server"
import { buttonVariants } from "@/components/ui/button"
import { configDoOrcamento, hashDaConfig } from "@/lib/estufa3d/config"
import { Estufa3DViewer, type OpcaoOrcamento3D } from "./viewer"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function Estufa3DPage({ searchParams }: { searchParams: Promise<{ orc?: string }> }) {
  const { orc } = await searchParams
  const supabase = await createClient()

  // Últimos orçamentos que o usuário pode ver (a regra de acesso do banco já filtra por vendedor)
  const { data: lista } = await supabase
    .from("orcamentos")
    .select("id, criado_em, parametros_utilizados, clientes ( nome )")
    .order("criado_em", { ascending: false })
    .limit(40)

  let itens = lista || []
  if (orc && !itens.some((o: any) => o.id === orc)) {
    const { data: um } = await supabase
      .from("orcamentos")
      .select("id, criado_em, parametros_utilizados, clientes ( nome )")
      .eq("id", orc)
      .maybeSingle()
    if (um) itens = [um, ...itens]
  }

  const fmt = (n: unknown) => String(n ?? "").replace(".", ",")
  const opcoes: OpcaoOrcamento3D[] = itens.map((o: any) => {
    const p = o.parametros_utilizados || {}
    const cliente = Array.isArray(o.clientes) ? o.clientes[0]?.nome : o.clientes?.nome
    const medidas = p.n_modulos && p.largura_modulo
      ? `${p.n_modulos} × ${fmt(p.largura_modulo)} m · ${p.n_vaos || "?"} vãos de ${fmt(p.vao) || "?"} m`
      : "sem medidas"
    const data = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(o.criado_em))
    return {
      id: o.id,
      rotulo: `#${String(o.id).split("-")[0].toUpperCase()} · ${cliente || "Sem cliente"} · ${medidas} · ${data}`,
      hash: hashDaConfig(configDoOrcamento(p)),
    }
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/croquis" className={buttonVariants({ variant: "outline", size: "icon" })}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Estufa 3D</h2>
            <p className="text-muted-foreground">
              Escolha um orçamento para abrir o 3D com as medidas dele, ou monte livremente.
            </p>
          </div>
        </div>
      </div>
      <Estufa3DViewer opcoes={opcoes} inicialId={orc && opcoes.some(o => o.id === orc) ? orc : ""} />
    </div>
  )
}
