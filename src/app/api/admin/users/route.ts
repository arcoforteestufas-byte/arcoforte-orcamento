import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create a Supabase client with the Service Role Key for admin tasks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// GET: List all users
export async function GET() {
  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
    
    if (error) throw error

    return NextResponse.json(users)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Create a new user
export async function POST(req: Request) {
  try {
    const { email, password, nome, cargo } = await req.json()
    
    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 })
    }

    const { data: { user }, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nome: nome || email.split('@')[0],
        cargo: cargo || 'Visualizador'
      }
    })
    
    if (error) throw error

    return NextResponse.json(user)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT: Update a user's role or info
export async function PUT(req: Request) {
  try {
    const { id, nome, cargo, password } = await req.json()
    
    if (!id) return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })

    const updates: any = {}
    
    if (nome || cargo) {
      updates.user_metadata = { nome, cargo }
    }
    
    if (password) {
      updates.password = password
    }

    const { data: { user }, error } = await supabaseAdmin.auth.admin.updateUserById(id, updates)
    
    if (error) throw error

    return NextResponse.json(user)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Remove a user
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    
    if (!id) return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
    
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
