import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Users, Package, TrendingUp } from "lucide-react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/server"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const cargo = user?.user_metadata?.cargo || 'Visualizador'
  const isAdministrador = cargo === 'Administrador'

  // Buscar contagens
  let orcamentosQuery = supabase.from('orcamentos').select('valor_total', { count: 'exact' })
  let clientesQuery = supabase.from('clientes').select('*', { count: 'exact', head: true })

  if (!isAdministrador && user) {
    orcamentosQuery = orcamentosQuery.eq('vendedor_id', user.id)
    clientesQuery = clientesQuery.eq('vendedor_id', user.id)
  }

  const { data: orcamentosData, count: orcamentosCount } = await orcamentosQuery
  const { count: clientesCount } = await clientesQuery
  const { count: produtosCount } = await supabase.from('produtos').select('*', { count: 'exact', head: true })

  // Valor total acumulado
  const valorTotalAcumulado = orcamentosData?.reduce((acc, curr) => acc + (curr.valor_total || 0), 0) || 0

  // Data de hoje para simular "criados hoje" ou pegar dados mais complexos depois
  const hoje = new Date().toLocaleDateString('pt-BR')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Painel de Controle</h2>
        <p className="text-muted-foreground">
          {isAdministrador 
            ? "Visão geral de todos os orçamentos e cadastros do sistema ArcoForte." 
            : `Resumo das suas atividades e vendas, ${user?.user_metadata?.nome || 'Vendedor'}.`}
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Orçamentos Gerados
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orcamentosCount || 0} Orçamentos</div>
            <p className="text-xs text-muted-foreground mt-1">
              {isAdministrador ? "No total da empresa" : "Criados por você"}
            </p>
            <Link 
              href="/orcamentos" 
              className={buttonVariants({ variant: "outline", className: "w-full mt-4" })}
            >
              Ver Orçamentos
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Valor Total Orçado
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotalAcumulado)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Soma de todos os orçamentos
            </p>
            <Link 
              href="/orcamentos/novo" 
              className={buttonVariants({ variant: "default", className: "w-full mt-4 bg-emerald-600 hover:bg-emerald-700" })}
            >
              Novo Orçamento
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isAdministrador ? "Total de Clientes" : "Seus Clientes"}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientesCount || 0} Cadastrados</div>
            <p className="text-xs text-muted-foreground mt-1">
              {isAdministrador ? "Base completa" : "Clientes atendidos por você"}
            </p>
            <Link 
              href="/clientes" 
              className={buttonVariants({ variant: "outline", className: "w-full mt-4" })}
            >
              Gerenciar Clientes
            </Link>
          </CardContent>
        </Card>

        {isAdministrador && (
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
        )}
      </div>
    </div>
  )
}
