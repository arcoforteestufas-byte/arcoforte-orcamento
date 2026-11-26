import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Atualiza a sessão (renova o token se venceu) e confere a assinatura do token.
  // Com chaves assimétricas (ES256) a conferência é local, sem ir ao servidor do Supabase.
  const { data } = await supabase.auth.getClaims()
  const c = data?.claims
  const user = c?.sub ? { id: c.sub, email: c.email, user_metadata: (c.user_metadata || {}) as { cargo?: string; [k: string]: unknown } } : null

  return { response: supabaseResponse, user }
}
