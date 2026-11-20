import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default function CatalogoPecas3DPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Catálogo de peças 3D</h2>
          <p className="text-muted-foreground">
            Cada peça da estufa em 3D, com código, onde vai e medidas. Gire com o mouse ou o dedo.
          </p>
        </div>
        <Link href="/croquis" className={buttonVariants({ variant: "outline", className: "gap-2" })}>
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Croqui 3D
        </Link>
      </div>
      <iframe
        src="/api/catalogo3d"
        title="Catálogo de peças 3D"
        className="w-full rounded-lg border bg-white"
        style={{ height: "calc(100vh - 220px)", minHeight: 560 }}
      />
    </div>
  )
}
