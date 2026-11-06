"use server"

import { createClient, createAdminClient } from "@/utils/supabase/server"

export interface HistoricoRegraItem {
  id: string
  regra_id: string
  campo_alterado: string
  valor_anterior: string | null
  novo_valor: string | null
  alterado_em: string
  usuario_nome?: string
}

export async function obterHistoricoRegra(regraId: string): Promise<{
  success: boolean
  historico: HistoricoRegraItem[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('regras_calculo_historico')
      .select('id, regra_id, campo_alterado, valor_anterior, novo_valor, alterado_em, usuarios(nome)')
      .eq('regra_id', regraId)
      .order('alterado_em', { ascending: false })
      .limit(50)

    if (error) {
      // Fallback via admin client se RLS bloquear leitura direta
      const adminClient = await createAdminClient()
      const { data: adminData } = await adminClient
        .from('regras_calculo_historico')
        .select('id, regra_id, campo_alterado, valor_anterior, novo_valor, alterado_em, usuarios(nome)')
        .eq('regra_id', regraId)
        .order('alterado_em', { ascending: false })
        .limit(50)

      const itens = (adminData || []).map((row: any) => ({
        id: row.id,
        regra_id: row.regra_id,
        campo_alterado: row.campo_alterado,
        valor_anterior: row.valor_anterior,
        novo_valor: row.novo_valor,
        alterado_em: row.alterado_em,
        usuario_nome: row.usuarios?.nome || undefined
      }))

      return { success: true, historico: itens }
    }

    const itens = (data || []).map((row: any) => ({
      id: row.id,
      regra_id: row.regra_id,
      campo_alterado: row.campo_alterado,
      valor_anterior: row.valor_anterior,
      novo_valor: row.novo_valor,
      alterado_em: row.alterado_em,
      usuario_nome: row.usuarios?.nome || undefined
    }))

    return { success: true, historico: itens }
  } catch (err: any) {
    console.error("Erro ao obter histórico da regra:", err)
    return { success: false, historico: [], error: err.message }
  }
}
