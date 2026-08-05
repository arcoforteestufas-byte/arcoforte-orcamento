import { createClient } from "@/utils/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Calendar, User, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function PropostasListPage() {
  const supabase = await createClient()

  const { data: propostas, error } = await supabase
    .from('propostas')
    .select('*')
    .order('criado_em', { ascending: false })

  const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Propostas Geradas</h1>
          <p className="text-muted-foreground mt-2">Acompanhe todas as propostas enviadas aos clientes.</p>
        </div>
        <Link href="/propostas/nova">
          <Button className="gap-2 bg-[#d97021] hover:bg-[#c3631b] text-white">
            <Plus className="h-4 w-4" />
            Nova Proposta Avulsa
          </Button>
        </Link>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Buscar por cliente..." className="pl-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(!propostas || propostas.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              <FileText className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700">Nenhuma proposta encontrada</h3>
              <p className="text-muted-foreground text-sm max-w-sm mt-2">
                As propostas que você gerar (sejam avulsas ou de orçamentos) aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b text-slate-600 font-medium">
                  <tr>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Vínculo</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Emissão</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {propostas.map((prop) => (
                    <tr key={prop.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{prop.cliente_nome}</div>
                        {prop.vendedor_nome && (
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <User className="w-3 h-3" /> {prop.vendedor_nome}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {prop.orcamento_id ? (
                          <Link href={`/orcamentos/${prop.orcamento_id}`} className="text-[#d97021] hover:underline flex items-center gap-1 font-medium">
                            Orçamento #{prop.orcamento_id.split('-')[0].toUpperCase()}
                          </Link>
                        ) : (
                          <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 font-normal">
                            Avulsa
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {formatadorMoeda.format(prop.valor_total || 0)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(prop.criado_em).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/propostas/${prop.id}`}>
                          <Button variant="ghost" size="sm" className="text-[#d97021] hover:text-[#c3631b] hover:bg-[#d97021]/10">
                            Ver PDF
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
