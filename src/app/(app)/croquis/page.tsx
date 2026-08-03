import { createClient } from "@/utils/supabase/server"
import { UploadModal } from "./upload-modal"
import { CroquisGallery } from "./gallery"

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

      <CroquisGallery croquis={croquis || []} isAdministrador={isAdministrador} />
    </div>
  )
}
