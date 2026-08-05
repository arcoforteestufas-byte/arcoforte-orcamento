'use server'

import { createAdminClient, createClient } from "@/utils/supabase/server"

export async function updateCroqui(id: string, data: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Não autenticado' }
  }

  const cargo = user.user_metadata?.cargo || 'Visualizador'
  
  if (cargo !== 'Administrador') {
    return { error: 'Sem permissão' }
  }

  const supabaseAdmin = await createAdminClient()
  const { error } = await supabaseAdmin.from('croquis').update(data).eq('id', id)
  
  if (error) {
    return { error: error.message }
  }
  
  return { success: true }
}
