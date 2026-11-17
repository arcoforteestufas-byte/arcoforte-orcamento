import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function middleware(request: NextRequest) {
  // Atualiza os cookies da sessão
  const response = await updateSession(request)

  // Checar autenticação
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname === '/login'
  // Link do motorista (roteiro + localização): público, protegido pelo código da viagem
  const isPaginaMotorista = request.nextUrl.pathname.startsWith('/motorista/')

  // Redirecionamentos de Segurança
  if (!user && !isLoginPage && !isPaginaMotorista) {
    // Redireciona para o login se não estiver logado e não estiver na página de login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const cargoUsuario = user?.user_metadata?.cargo || 'Visualizador'
  const ehVendedor = cargoUsuario === 'Vendedor'
  // vendedor trabalha pelo CRM; os demais começam em orçamentos
  const inicio = ehVendedor ? '/crm' : '/orcamentos'

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL(inicio, request.url))
  }

  // Vendedor faz orçamento e proposta só pelo cartão do lead no CRM:
  // as listas gerais e o "novo orçamento" sem lead levam de volta ao CRM.
  if (user && ehVendedor) {
    const p = request.nextUrl.pathname
    const semLead = p === '/orcamentos/novo' && !request.nextUrl.searchParams.get('lead')
    if (p === '/orcamentos' || p === '/propostas' || semLead) {
      return NextResponse.redirect(new URL('/crm', request.url))
    }
  }


  // Proteção de rotas Admin
  if (user && (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/produtos'))) {
    if (cargoUsuario !== 'Administrador') {
      return NextResponse.redirect(new URL(inicio, request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/chat (chat api)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/chat|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
