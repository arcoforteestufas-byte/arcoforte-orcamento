import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { obterUsuario } from '@/utils/supabase/server'

// Create a Supabase client with the Service Role Key for admin tasks
const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Só administrador usa esta rota (ela usa a chave de serviço e muda cargos/senhas)
async function negarSeNaoAdmin() {
  const user = await obterUsuario()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (user.user_metadata?.cargo !== 'Administrador') return NextResponse.json({ error: 'Apenas administradores' }, { status: 403 })
  return null
}

// Liberação do CRM (ver/editar leads de todos). Se a tabela do CRM v5 ainda não existir, ignora.
async function salvarPermissoesCrm(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, id: string, verTodos: unknown, editarTodos: unknown) {
  if (verTodos === undefined && editarTodos === undefined) return
  const ver = !!verTodos
  const { error } = await supabaseAdmin.from('crm_permissoes_usuario').upsert({
    usuario_id: id, ver_todos: ver, editar_todos: ver && !!editarTodos, atualizado_em: new Date().toISOString(),
  })
  if (error && !/crm_permissoes_usuario|does not exist|schema cache/i.test(error.message)) throw error
}

// GET: List all users
export async function GET() {
  try {
    const negado = await negarSeNaoAdmin()
    if (negado) return negado
    const supabaseAdmin = getSupabaseAdmin()
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
    
    if (error) throw error

    const { data: perms } = await supabaseAdmin.from('crm_permissoes_usuario').select('usuario_id, ver_todos, editar_todos')
    const porId = new Map((perms || []).map(p => [p.usuario_id, p]))
    return NextResponse.json(users.map(u => ({
      ...u,
      crm_ver_todos: !!porId.get(u.id)?.ver_todos,
      crm_editar_todos: !!porId.get(u.id)?.editar_todos,
    })))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Create a new user
export async function POST(req: Request) {
  try {
    const negado = await negarSeNaoAdmin()
    if (negado) return negado
    const { email, password, nome, cargo, telefone, foto_url, crm_ver_todos, crm_editar_todos } = await req.json()
    
    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data: { user }, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nome: nome || email.split('@')[0],
        cargo: cargo || 'Visualizador',
        telefone: telefone || '',
        foto_url: foto_url || null
      }
    })
    
    if (error) throw error
    if (user) await salvarPermissoesCrm(supabaseAdmin, user.id, crm_ver_todos, crm_editar_todos)

    return NextResponse.json(user)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT: Update a user's role or info
export async function PUT(req: Request) {
  try {
    const negado = await negarSeNaoAdmin()
    if (negado) return negado
    const { id, nome, cargo, telefone, password, foto_url, crm_ver_todos, crm_editar_todos } = await req.json()

    if (!id) return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })

    const updates: any = {}

    if (nome || cargo || telefone !== undefined || foto_url !== undefined) {
      updates.user_metadata = { nome, cargo, telefone, ...(foto_url !== undefined ? { foto_url: foto_url || null } : {}) }
    }
    
    if (password) {
      updates.password = password
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data: { user }, error } = await supabaseAdmin.auth.admin.updateUserById(id, updates)
    
    if (error) throw error
    await salvarPermissoesCrm(supabaseAdmin, id, crm_ver_todos, crm_editar_todos)

    return NextResponse.json(user)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Remove a user
export async function DELETE(req: Request) {
  try {
    const negado = await negarSeNaoAdmin()
    if (negado) return negado
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    
    if (!id) return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })

    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
    
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
