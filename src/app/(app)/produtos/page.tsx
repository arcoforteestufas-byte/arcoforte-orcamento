import { createClient } from "@/utils/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { XlsxUploader } from "@/components/xlsx-uploader"
import { Badge } from "@/components/ui/badge"

import { EditableWeightCell } from "./editable-weight-cell"

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código (SKU)</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Peso Bruto (kg)</TableHead>
                <TableHead className="text-right">Peso Líq. (kg)</TableHead>
                <TableHead className="text-right">Preço Unitário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!produtos || produtos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    Nenhum produto cadastrado ainda. Sincronize com o Sensio!
                  </TableCell>
                </TableRow>
              ) : (
                produtos.map(produto => (
                  <TableRow key={produto.codigo}>
                    <TableCell className="font-medium">
                      <Badge variant="outline" className="font-mono">{produto.codigo}</Badge>
                    </TableCell>
                    <TableCell>{produto.descricao}</TableCell>
                    <TableCell>{produto.unidade}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <EditableWeightCell produtoId={produto.id} campo="peso_bruto_kg" valorInicial={produto.peso_bruto_kg} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <EditableWeightCell produtoId={produto.id} campo="peso_liquido_kg" valorInicial={produto.peso_liquido_kg} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.preco_unitario || 0)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
