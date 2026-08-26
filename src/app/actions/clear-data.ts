"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function clearRegrasEParametros() {
    const supabase = await createClient()

    // Apaga todas as regras
    const { error: errorRegras } = await supabase.from('regras_calculo').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (errorRegras) return { success: false, error: "Erro ao apagar regras: " + errorRegras.message }

    // Apaga todos os parametros
    const { error: errorParams } = await supabase.from('parametros_estufa').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (errorParams) return { success: false, error: "Erro ao apagar parâmetros: " + errorParams.message }

    revalidatePath('/admin/parametros')
    revalidatePath('/admin/regras')
    revalidatePath('/orcamentos/novo')

    return { success: true, message: "Todas as Regras e Parâmetros foram apagados com sucesso!" }
}
