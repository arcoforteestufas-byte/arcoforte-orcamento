import Link from "next/link"
import { Images } from "lucide-react"
import { createClient } from "@/utils/supabase/server"
import { buttonVariants } from "@/components/ui/button"
import { configDoOrcamento, hashDaConfig } from "@/lib/estufa3d/config"
import { Estufa3DViewer, type OpcaoOrcamento3D } from "./viewer"

export const dynamic = "force-dynamic"
export const revalidate = 0

const CAMPOS = "id, criado_em, parametros_utilizados, clientes ( nome )"

export default async function CroquisPage({ searchParams }: { searchParams: Promise<{ orc?: string }> }) {
  const { orc } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const cargo = user?.user_metadata?.cargo || "Visualizador"
  const podeSalvar = cargo !== "Logística" && cargo !== "Visualizador"

  // Últimos orçamentos que o usuário pode ver (a regra de acesso do banco já filtra por vendedor)
  const { data: lista } = await supabase
    .from("orcamentos")
    .select(CAMPOS)
    .order("criado_em", { ascending: false })
    .limit(40)

  let itens = lista || []
  if (orc && !itens.some((o: any) => o.id === orc)) {
    const { data: um } = await supabase.from("orcamentos").select(CAMPOS).eq("id", orc).maybeSingle()
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
    // Se o croqui já foi gerado no 3D, reabre do jeito que o vendedor deixou
    const cfg = p.croqui_3d && typeof p.croqui_3d === "object" ? p.croqui_3d : configDoOrcamento(p)
    return {
      id: o.id,
      rotulo: `#${String(o.id).split("-")[0].toUpperCase()} · ${cliente || "Sem cliente"} · ${medidas} · ${data}`,
      hash: hashDaConfig(cfg),
      croquiUrl: p.croqui_url || "",
    }
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Croqui 3D</h2>
          <p className="text-muted-foreground">
            Escolha o orçamento, ajuste a estufa e a posição da câmera e gere o croqui que vai na proposta.
          </p>
        </div>
        <Link href="/croquis/biblioteca" className={buttonVariants({ variant: "outline", className: "gap-2" })}>
          <Images className="h-4 w-4" />
          Biblioteca antiga
        </Link>
      </div>
      <Estufa3DViewer
        opcoes={opcoes}
        inicialId={orc && opcoes.some(o => o.id === orc) ? orc : ""}
        podeSalvar={podeSalvar}
      />
    </div>
  )
}
