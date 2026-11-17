import { createClient } from "@/utils/supabase/server"
import { UploadModal } from "./upload-modal"
import { CroquisGallery } from "./gallery"
import Link from "next/link"
import { Box } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Biblioteca de Croquis</h2>
          <p className="text-muted-foreground">
            Consulte desenhos técnicos e modelos de estufas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/croquis/estufa-3d"
            className={buttonVariants({ variant: "default", className: "gap-2 bg-[#d97021] hover:bg-[#c3631b]" })}
          >
            <Box className="h-4 w-4" />
            Estufa 3D
          </Link>
          {isAdministrador && <UploadModal />}
        </div>
      </div>

      <CroquisGallery croquis={croquis || []} isAdministrador={isAdministrador} />
    </div>
  )
}
