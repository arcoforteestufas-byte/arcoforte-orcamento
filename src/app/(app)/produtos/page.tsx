import Link from "next/link"
import { Boxes } from "lucide-react"
import { createClient } from "@/utils/supabase/server"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { XlsxUploader } from "@/components/xlsx-uploader"
import { ProductsTable } from "./products-table"

export default async function ProdutosPage() {
  const supabase = await createClient()
  const { data: produtos } = await supabase.from('produtos').select('*').order('codigo')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Produtos e Preços</h2>
          <p className="text-muted-foreground">
            Gerenciamento de produtos, matérias-primas e insumos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/produtos/catalogo-3d" className={buttonVariants({ variant: "outline", className: "gap-2" })}>
            <Boxes className="h-4 w-4" />
            Catálogo de peças 3D
          </Link>
          <XlsxUploader />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo de Produtos</CardTitle>
          <CardDescription>Lista completa de todos os itens disponíveis para cálculo e seus respectivos preços.</CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const total = produtos?.length || 0
            const comPeso = (produtos || []).filter(p => Number(p.peso_bruto_kg) > 0).length
            if (!total || comPeso === total) return null
            return (
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <div className="min-w-[160px] flex-1">
                  <b>{comPeso} de {total}</b> produtos com peso cadastrado. Sem peso, o orçamento não calcula o peso total nem o frete por kg.
                  <span className="block text-xs text-amber-800/80">Importe uma planilha com Código e Peso Bruto, ou digite o peso direto na tabela abaixo.</span>
                </div>
                <div className="h-2 w-40 overflow-hidden rounded-full bg-amber-200">
                  <div className="h-full bg-amber-500" style={{ width: `${Math.round((comPeso / total) * 100)}%` }} />
                </div>
              </div>
            )
          })()}
          <ProductsTable produtos={produtos || []} />
        </CardContent>
      </Card>
    </div>
  )
}
