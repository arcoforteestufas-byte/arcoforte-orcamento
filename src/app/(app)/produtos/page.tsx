import { createClient } from "@/utils/supabase/server"
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
        <div className="flex items-center gap-2">
          <XlsxUploader />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo de Produtos</CardTitle>
          <CardDescription>Lista completa de todos os itens disponíveis para cálculo e seus respectivos preços.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProductsTable produtos={produtos || []} />
        </CardContent>
      </Card>
    </div>
  )
}
