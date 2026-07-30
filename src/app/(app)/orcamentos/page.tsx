import { createClient } from "@/utils/supabase/server"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, Search, FileText } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function OrcamentosPage() {
  const supabase = await createClient()

  // Busca os orçamentos no banco com os dados do cliente
  const { data: orcamentos, error } = await supabase
    .from('orcamentos')
    .select(`
      id,
      valor_total,
      status,
      criado_em,
      clientes (
        nome
      )
    `)
    .order('criado_em', { ascending: false })

  if (error) {
    console.error("Erro ao carregar orçamentos:", error)
  }

  // Formatador de Moeda
  const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  // Formatador de Data
  const formatadorData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Aprovado</Badge>
      case 'Rascunho':
        return <Badge variant="outline" className="text-orange-500 border-orange-200 bg-orange-50">Rascunho</Badge>
      case 'Enviado':
        return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Enviado</Badge>
      case 'Perdido':
        return <Badge variant="destructive">Perdido</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Orçamentos</h2>
          <p className="text-muted-foreground">
            Gerencie e acompanhe todos os orçamentos gerados.
          </p>
        </div>
        <Link 
          href="/orcamentos/novo"
          className={buttonVariants({ variant: "default", className: "gap-2 bg-[#d97021] hover:bg-[#c3631b]" })}
        >
          <PlusCircle className="h-4 w-4" />
          Novo Orçamento
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Histórico de Orçamentos</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por cliente ou ID..."
                className="pl-8 bg-background"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orcamentos && orcamentos.length > 0 ? (
                orcamentos.map((orc: any) => (
                  <TableRow key={orc.id}>
                    <TableCell className="font-medium">
                      #ORC-{orc.id.split('-')[0].toUpperCase()}
                    </TableCell>
                    <TableCell>{orc.clientes?.nome}</TableCell>
                    <TableCell>{formatadorData.format(new Date(orc.criado_em))}</TableCell>
                    <TableCell>{formatadorMoeda.format(orc.valor_total || 0)}</TableCell>
                    <TableCell>
                      {getStatusBadge(orc.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link 
                        href={`/orcamentos/${orc.id}`}
                        className={buttonVariants({ variant: "ghost", size: "icon" })}
                        title="Ver Detalhes"
                      >
                        <FileText className="h-4 w-4 text-slate-500" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    Nenhum orçamento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
