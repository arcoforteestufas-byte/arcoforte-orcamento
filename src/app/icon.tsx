import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default async function Icon() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data } = await supabase.from('configuracoes').select('logo_url').eq('id', 1).single()
    
    if (data?.logo_url && data.logo_url.startsWith('data:image/')) {
      const matches = data.logo_url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
      if (matches && matches.length === 3) {
        const buffer = Buffer.from(matches[2], 'base64')
        return new Response(buffer, {
          headers: { 'Content-Type': matches[1] },
        })
      }
    }
  } catch (e) {
    console.error(e)
  }

  // Retorna um quadrado transparente como fallback
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: 'transparent',
        }}
      />
    ),
    { ...size }
  )
}
