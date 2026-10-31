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

  const { data: linhasAtualizadas, error } = await supabase
    .from('clientes')
    .update(data)
    .eq('id', id)
    .select('id')

  if (error) {
    return { error: error.message }
  }

  // Sem erro, mas nenhuma linha afetada: geralmente é RLS barrando em silêncio
  // (ex: o usuário logado não é admin nem é o vendedor dono desse cliente).
  if (!linhasAtualizadas || linhasAtualizadas.length === 0) {
    console.error('updateCliente: 0 linhas afetadas', { id, usuario: user.id })
    return { error: 'Não foi possível salvar: cliente não encontrado ou você não tem permissão para editá-lo.' }
  }

  return { success: true }
}
