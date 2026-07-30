import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Users, Package } from "lucide-react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/server"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createClient()

  // Buscar contagens
  const { count: orcamentosCount } = await supabase.from('orcamentos').select('*', { count: 'exact', head: true })
  const { count: clientesCount } = await supabase.from('clientes').select('*', { count: 'exact', head: true })
  const { count: produtosCount } = await supabase.from('produtos').select('*', { count: 'exact', head: true })

  // Data de hoje para simular "criados hoje" ou pegar dados mais complexos depois
  const hoje = new Date().toLocaleDateString('pt-BR')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Painel de Controle</h2>
        <p className="text-muted-foreground">
          Bem-vindo ao sistema de geração de orçamentos rápidos da ArcoForte.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Orçamentos
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orcamentosCount || 0} Salvos</div>
            <p className="text-xs text-muted-foreground mt-1">
              Até o dia {hoje}
            </p>
            <Link 
              href="/orcamentos" 
              className={buttonVariants({ variant: "outline", className: "w-full mt-4" })}
            >
              Ver Todos
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clientes
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientesCount || 0} Cadastrados</div>
            <p className="text-xs text-muted-foreground mt-1">
              Base de clientes atualizada
            </p>
            <Link 
              href="/clientes" 
              className={buttonVariants({ variant: "outline", className: "w-full mt-4" })}
            >
              Gerenciar Clientes
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Produtos & Preços
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{produtosCount || 0} Itens Base</div>
            <p className="text-xs text-muted-foreground mt-1">
              Prontos para precificação
            </p>
            <Link 
              href="/produtos" 
              className={buttonVariants({ variant: "outline", className: "w-full mt-4" })}
            >
              Tabela de Preços
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
