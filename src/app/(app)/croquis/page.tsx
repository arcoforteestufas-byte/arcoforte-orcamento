import { createClient } from "@/utils/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Image as ImageIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { UploadModal } from "./upload-modal"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CroquisPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  const cargo = user?.user_metadata?.cargo || 'Visualizador'
  const isAdministrador = cargo === 'Administrador'

  // Fetch croquis
  const { data: croquis, error } = await supabase
    .from('croquis')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Biblioteca de Croquis</h2>
          <p className="text-muted-foreground">
            Consulte desenhos técnicos e modelos de estufas.
          </p>
        </div>
        {isAdministrador && <UploadModal />}
      </div>

      <Card>
        <div className="p-4 border-b">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por título ou tag..."
              className="pl-8 bg-background"
            />
          </div>
        </div>
        <CardContent className="p-6">
          {!croquis || croquis.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <ImageIcon className="h-12 w-12 mb-4 opacity-20" />
              <p>Nenhum croqui encontrado na biblioteca.</p>
              {isAdministrador && <p className="text-sm mt-1">Clique em "Novo Croqui" para adicionar o primeiro.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {croquis.map((croqui) => (
                <div key={croqui.id} className="group relative rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col">
                  <div className="aspect-video w-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
                    {croqui.imagem_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={croqui.imagem_url} 
                        alt={croqui.titulo} 
                        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-slate-300" />
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-semibold text-lg line-clamp-1">{croqui.titulo}</h3>
                    {croqui.descricao && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2 flex-1">
                        {croqui.descricao}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {(croqui.tags || []).map((tag: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
