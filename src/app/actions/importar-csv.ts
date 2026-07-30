"use server"

import { createClient } from "@/utils/supabase/server"
import Papa from "papaparse"
import { revalidatePath } from "next/cache"

const groups: Record<string, string> = {
  '1': '10000000-0000-0000-0000-000000000001',
  '2': '20000000-0000-0000-0000-000000000002',
  '3': '30000000-0000-0000-0000-000000000003',
  '4': '40000000-0000-0000-0000-000000000004',
  '5': '50000000-0000-0000-0000-000000000005',
  '6': '60000000-0000-0000-0000-000000000006',
  '7': '70000000-0000-0000-0000-000000000007',
  '8': '80000000-0000-0000-0000-000000000008',
  '9': '90000000-0000-0000-0000-000000000009',
  '10': 'a0000000-0000-0000-0000-000000000010',
  '11': 'b0000000-0000-0000-0000-000000000011',
}

export async function importarRegrasCSV(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Usuário não autenticado")

    const file = formData.get('file') as File
    if (!file) throw new Error("Nenhum arquivo enviado")

    const text = await file.text()

    // Faz o parse do CSV
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";" // O CSV de exemplo usa ponto e vírgula
    })

    if (result.errors.length > 0) {
      throw new Error("Erro ao ler o arquivo CSV: " + result.errors[0].message)
    }

    const rows = result.data as any[]

    for (const row of rows) {
      // Ignora linhas vazias ou sem Grupo
      if (!row['Grupo']) continue

      const groupStr = row['Grupo'].split('.')[0].trim()
      const groupId = groups[groupStr]
      if (!groupId) continue // Se o grupo não for mapeado, ignora

      const posName = row['Posicao']?.trim()
      const prodCode = row['Codigo']?.trim()
      const prodName = row['Produto']?.trim()
      const formula = row['Formula_Qtd']?.trim()
      const cond = row['Condicao']?.trim()

      if (!posName || !prodCode) continue

      // 1. Cadastra o Produto se não existir
      if (prodCode !== 'TELA-XXX' && prodCode !== 'FILME-XXX') {
        const { data: existingProd } = await supabase
          .from('produtos')
          .select('codigo')
          .eq('codigo', prodCode)
          .single()

        if (!existingProd) {
          await supabase.from('produtos').insert({
            codigo: prodCode,
            descricao: prodName || 'Sem descrição',
            unidade: 'un',
            preco_unitario: 0
          })
        }
      }

      // 2. Busca ou cadastra a Posição
      let posId = ''
      const { data: existingPos } = await supabase
        .from('posicoes')
        .select('id')
        .eq('grupo_id', groupId)
        .eq('nome', posName)
        .single()

      if (existingPos) {
        posId = existingPos.id
      } else {
        const { data: newPos, error: posError } = await supabase
          .from('posicoes')
          .insert({ grupo_id: groupId, nome: posName })
          .select('id')
          .single()
        
        if (posError) {
          console.error("Erro ao criar posicao", posError)
          continue
        }
        if (newPos) posId = newPos.id
      }

      // 3. Cadastra ou atualiza a Regra
      if (formula && formula !== 'PENDENTE' && cond && cond !== 'PENDENTE') {
        const { data: existingRule } = await supabase
          .from('regras_calculo')
          .select('id')
          .eq('posicao_id', posId)
          .eq('produto_codigo', prodCode)
          .single()

        if (existingRule) {
          await supabase.from('regras_calculo').update({
            formula_quantidade: formula,
            condicao_aplicabilidade: cond
          }).eq('id', existingRule.id)
        } else {
          await supabase.from('regras_calculo').insert({
            posicao_id: posId,
            produto_codigo: prodCode,
            formula_quantidade: formula,
            condicao_aplicabilidade: cond,
            unidade_medida: 'un',
            regra_arredondamento: 'nenhum'
          })
        }
      }
    }

    // Revalida a página para exibir os novos dados
    revalidatePath('/admin/regras')
    
    return { success: true, message: `Foram processadas ${rows.length} linhas com sucesso!` }

  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
