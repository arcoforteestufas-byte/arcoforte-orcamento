'use server'

import { createAdminClient, obterUsuario } from "@/utils/supabase/server"

export async function updateCroqui(id: string, data: any) {
  const user = await obterUsuario()
  
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
