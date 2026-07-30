import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlusCircle, Settings2, TestTube2 } from "lucide-react"
import { createClient } from "@/utils/supabase/server"
import { CsvUploader } from "@/components/csv-uploader"
import { RegrasTable } from "./regras-table"

export default async function RegrasMontagemPage() {
  const supabase = await createClient()

  const { data: grupos } = await supabase.from('grupos_componentes').select('*').order('ordem')
  const { data: posicoes } = await supabase.from('posicoes').select('*')
  const { data: regras } = await supabase.from('regras_calculo').select('*').eq('ativo', true)
  const { data: produtos } = await supabase.from('produtos').select('codigo, descricao')

  if (!grupos) return <div>Carregando...</div>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Regras de Montagem</h2>
          <p className="text-muted-foreground">
            Gerencie grupos, posições e as fórmulas de cálculo dos produtos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <TestTube2 className="h-4 w-4" />
            Testar Motor
          </Button>
          <CsvUploader />
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Nova Regra
          </Button>
        </div>
      </div>

      <RegrasTable 
        grupos={grupos} 
        posicoes={posicoes || []} 
        regras={regras || []} 
        produtos={produtos || []} 
      />
    </div>
  )
}
