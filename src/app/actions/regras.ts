"use server"

import { createClient, createAdminClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export interface HistoricoRegraItem {
  id: string
  regra_id: string
  campo_alterado: string
  valor_anterior: string | null
  novo_valor: string | null
  alterado_em: string
  usuario_nome?: string
}

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
  const { data: { user } } = await supabase.auth.getUser()

  // Nullify empty conditions
  const updateData = {
    ...data,
    condicao_aplicabilidade: data.condicao_aplicabilidade?.trim() === "" ? null : data.condicao_aplicabilidade
  }

  // 1. Obter registro atual antes do update para histórico
  const { data: regraAnterior } = await supabase
    .from('regras_calculo')
    .select('*')
    .eq('id', id)
    .single()

  // 2. Executar a atualização da regra
  const { error } = await supabase
    .from('regras_calculo')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error("Erro ao atualizar regra:", error)
    return { success: false, error: error.message }
  }

  // 3. Registrar auditoria em regras_calculo_historico
  if (regraAnterior && user) {
    const camposParaComparar = [
      'formula_quantidade',
      'condicao_aplicabilidade',
      'produto_codigo',
      'posicao_id',
      'unidade_medida',
      'regra_arredondamento',
      'margem_perda'
    ] as const

    const logsParaInserir = []

    for (const campo of camposParaComparar) {
      const vAntigo = (regraAnterior as any)[campo] ?? null
      const vNovo = (updateData as any)[campo] ?? null

      const strAntigo = vAntigo === null ? "" : String(vAntigo).trim()
      const strNovo = vNovo === null ? "" : String(vNovo).trim()

      if (strAntigo !== strNovo) {
        logsParaInserir.push({
          regra_id: id,
          usuario_id: user.id,
          campo_alterado: campo,
          valor_anterior: strAntigo || null,
          novo_valor: strNovo || null,
          alterado_em: new Date().toISOString()
        })
      }
    }

    if (logsParaInserir.length > 0) {
      try {
        const adminClient = await createAdminClient()
        await adminClient.from('regras_calculo_historico').insert(logsParaInserir)
      } catch (logErr) {
        console.warn("Aviso ao registrar histórico de alteração de regra:", logErr)
      }
    }
  }

  revalidatePath('/admin/regras')
  return { success: true }
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
