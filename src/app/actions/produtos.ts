"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function excluirProdutos(ids: string[]) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Usuário não autenticado")

    // Buscar todos os produtos que o usuário quer excluir para checar o código (em lotes)
    let produtosParaExcluir: {id: string, codigo: string}[] = []
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100)
      const { data, error } = await supabase
        .from('produtos')
        .select('id, codigo')
        .in('id', chunk)
      if (error) throw new Error(error.message)
      if (data) produtosParaExcluir.push(...data)
    }

    // Buscar todos os códigos que estão sendo usados nas regras
    const { data: regras } = await supabase.from('regras_calculo').select('produto_codigo')
    const codigosEmUso = new Set(regras?.map(r => r.produto_codigo) || [])

    // Filtrar apenas os IDs que NÃO estão em uso
    const idsSeguros = produtosParaExcluir
      ?.filter(p => !codigosEmUso.has(p.codigo))
      .map(p => p.id) || []

    const ignorados = ids.length - idsSeguros.length

    if (idsSeguros.length === 0) {
      return { success: false, error: "Todos os produtos selecionados estão sendo usados nas Regras de Montagem e não podem ser excluídos." }
    }

    // Fazer a exclusão em lotes de 100 para não estourar o limite da URL do PostgREST (Bad Request)
    for (let i = 0; i < idsSeguros.length; i += 100) {
      const chunk = idsSeguros.slice(i, i + 100)
      const { error } = await supabase
        .from('produtos')
        .delete()
        .in('id', chunk)

      if (error) throw new Error(error.message)
    }

    revalidatePath('/produtos')
    const msg = ignorados > 0 
      ? `${idsSeguros.length} produto(s) excluído(s). ${ignorados} foram ignorados pois estão em uso nas Regras de Montagem.`
      : `${idsSeguros.length} produto(s) excluído(s) com sucesso.`
      
    return { success: true, message: msg }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
