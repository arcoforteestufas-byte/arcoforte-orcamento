import { createClient } from "@/utils/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, Search, Edit } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ClientesPage() {
  const supabase = await createClient()
  
  // Fetch clients from the database
  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('*')
    .order('criado_em', { ascending: false })
    
  if (error) {
    console.error("Erro ao buscar clientes:", error)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
          <p className="text-muted-foreground">
            Gerencie o cadastro de clientes e o histórico de orçamentos.
          </p>
        </div>
        <Button className="gap-2 bg-[#d97021] hover:bg-[#c3631b] text-white">
          <PlusCircle className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Clientes</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nome ou cidade..."
                className="pl-8 bg-background"
              />
            </div>
          </div>
          <CardDescription>
            Mostrando todos os clientes cadastrados no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome / Razão Social</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!clientes || clientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                clientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">
                      {cliente.nome}
                      {!cliente.telefone && !cliente.endereco && (
                        <Badge variant="outline" className="ml-2 text-orange-600 border-orange-200 bg-orange-50">
                          Incompleto
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{cliente.documento || '-'}</TableCell>
                    <TableCell>{cliente.cidade_uf || '-'}</TableCell>
                    <TableCell>{cliente.telefone || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" title="Editar Cliente">
                        <Edit className="h-4 w-4" />
                      </Button>
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
