import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Atualiza os cookies da sessão e confere o usuário (uma conferência só, local)
  const { response, user } = await updateSession(request)

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
  const ehLogistica = cargoUsuario === 'Logística'
  const ehExpedicao = cargoUsuario === 'Expedição'
  // vendedor trabalha pelo CRM, logística pelas Entregas, expedição na separação; os demais começam em orçamentos
  const inicio = ehVendedor ? '/crm' : ehLogistica ? '/entregas?aba=vendas' : ehExpedicao ? '/expedicao' : '/orcamentos'

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

  // Logística: sem funil, orçamentos e propostas. Só abre (para ler) os leads ganhos
  // e os orçamentos/propostas deles, a partir de Entregas.
  if (user && ehLogistica) {
    const p = request.nextUrl.pathname
    const bloqueada =
      p === '/crm' || (p.startsWith('/crm/') && !p.startsWith('/crm/lead/')) ||
      p === '/orcamentos' || p.startsWith('/orcamentos/novo') || /^\/orcamentos\/[^/]+\/(editar|proposta)/.test(p) ||
      p === '/propostas' || p.startsWith('/propostas/nova')
    if (bloqueada) {
      return NextResponse.redirect(new URL('/entregas?aba=vendas', request.url))
    }
  }


  // Expedição: só a separação e conferência
  if (user && ehExpedicao && !request.nextUrl.pathname.startsWith('/expedicao') && !request.nextUrl.pathname.startsWith('/motorista/')) {
    return NextResponse.redirect(new URL('/expedicao', request.url))
  }
  // Separação: só Expedição, Logística e Administrador
  if (user && request.nextUrl.pathname.startsWith('/expedicao') && !['Expedição', 'Logística', 'Administrador'].includes(cargoUsuario)) {
    return NextResponse.redirect(new URL(inicio, request.url))
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
