import { createClient } from "@/utils/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('configuracoes').select('logo_url').eq('id', 1).single()
    
    if (data?.logo_url && data.logo_url.startsWith('data:image/')) {
      const matches = data.logo_url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
      if (matches && matches.length === 3) {
        const buffer = Buffer.from(matches[2], 'base64')
        return new Response(buffer, {
          headers: {
            'Content-Type': matches[1],
            'Cache-Control': 'public, max-age=60, s-maxage=3600',
          },
        })
      }
    }
    
    // Fallback if no logo
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error("Error fetching favicon:", error)
    return new Response(null, { status: 500 })
  }
}
