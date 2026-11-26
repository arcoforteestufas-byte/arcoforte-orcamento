import { obterUsuario } from "@/utils/supabase/server"
import { CATALOGO3D_HTML } from "@/lib/estufa3d/catalogo-html"

export const dynamic = "force-dynamic"

// Catálogo de peças 3D: só para quem está logado no sistema (não fica público).
export async function GET() {
  const user = await obterUsuario()
  if (!user) {
    return new Response("Não autorizado", { status: 401 })
  }
  return new Response(CATALOGO3D_HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Frame-Options": "SAMEORIGIN",
      "X-Robots-Tag": "noindex, nofollow",
    },
  })
}
