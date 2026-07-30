"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateRegraCalculo(
  id: string, 
  data: {
    posicao_id: string;
    produto_codigo: string;
    formula_quantidade: string;
    condicao_aplicabilidade: string;
    unidade_medida: string;
    regra_arredondamento: string;
    margem_perda: number;
  }
) {
  const supabase = await createClient()

  // Nullify empty conditions
  const updateData = {
    ...data,
    condicao_aplicabilidade: data.condicao_aplicabilidade.trim() === "" ? null : data.condicao_aplicabilidade
  }

  const { error } = await supabase
    .from('regras_calculo')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error("Erro ao atualizar regra:", error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/regras')
  return { success: true }
}
