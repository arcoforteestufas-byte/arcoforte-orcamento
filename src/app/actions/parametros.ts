"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

type ParametroInput = {
    nome_tecnico: string;
    rotulo: string;
    tipo: string;
    opcoes: string | null;
    ativo: boolean;
}

export async function createParametro(data: ParametroInput) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('parametros_estufa')
        .insert(data)

    if (error) {
        console.error("Erro ao criar parâmetro:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/parametros')
    return { success: true }
}

export async function updateParametro(id: string, data: ParametroInput) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('parametros_estufa')
        .update(data)
        .eq('id', id)

    if (error) {
        console.error("Erro ao atualizar parâmetro:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/parametros')
    return { success: true }
}
