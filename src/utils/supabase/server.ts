import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { cache } from 'react'
import type { User } from '@supabase/supabase-js'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export async function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  )
}


/**
 * Usuário logado, conferido pela assinatura do token (getClaims), sem ir ao servidor do Supabase
 * quando o projeto usa chaves assimétricas (ES256). Projetos com a chave antiga caem no getUser.
 * Fica guardado durante a requisição: layout e página usam a mesma conferência.
 * Traz id, email e user_metadata (cargo, nome...). O cargo novo vale quando o token renova (até 1 h).
 */
export const obterUsuario = cache(async (): Promise<User | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const c = data?.claims
  if (error || !c?.sub) return null
  return {
    id: c.sub,
    email: c.email,
    phone: c.phone,
    role: c.role,
    aud: String(c.aud ?? "authenticated"),
    user_metadata: c.user_metadata || {},
    app_metadata: c.app_metadata || {},
    is_anonymous: c.is_anonymous,
    created_at: "",
  } as User
})
