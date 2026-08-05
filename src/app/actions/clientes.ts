'use server'

import { createClient } from "@/utils/supabase/server"

export async function saveCliente(data: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Não autenticado' }
  }

  const { error } = await supabase
    .from('clientes')
    .insert({
      ...data,
      vendedor_id: user.id
    })
    
  if (error) {
    return { error: error.message }
  }
  
  return { success: true }
}

export async function updateCliente(id: string, data: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Não autenticado' }
  }

  const { error } = await supabase
    .from('clientes')
    .update(data)
    .eq('id', id)
    
  if (error) {
    return { error: error.message }
  }
  
  return { success: true }
}
