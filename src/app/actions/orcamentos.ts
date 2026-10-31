"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function excluirOrcamento(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Usuário não autenticado")

    const cargo = user.user_metadata?.cargo
    if (cargo !== 'Administrador') {
      throw new Error("Apenas o usuário Administrador (master) pode excluir orçamentos.")
    }

    // Remove primeiro os dados que dependem do orçamento (evita erro de chave
    // estrangeira caso o banco não tenha ON DELETE CASCADE configurado).
    const { error: propostasError } = await supabase
      .from('propostas')
      .delete()
      .eq('orcamento_id', id)
    if (propostasError) throw new Error(propostasError.message)

    const { error: itensError } = await supabase
      .from('orcamento_itens')
      .delete()
      .eq('orcamento_id', id)
    if (itensError) throw new Error(itensError.message)

    const { error } = await supabase
      .from('orcamentos')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)

    revalidatePath('/orcamentos')
    revalidatePath('/propostas')
    revalidatePath('/')

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao excluir orçamento." }
  }
}
