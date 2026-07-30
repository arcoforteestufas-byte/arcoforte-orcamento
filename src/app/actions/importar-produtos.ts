"use server"

import { createClient } from "@/utils/supabase/server"
import * as XLSX from "xlsx"
import { revalidatePath } from "next/cache"

export async function importarProdutosXLSX(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Usuário não autenticado")

    const file = formData.get('file') as File
    if (!file) throw new Error("Nenhum arquivo enviado")

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Lê a planilha Excel
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    
    // Converte para JSON
    const rows = XLSX.utils.sheet_to_json(sheet) as any[]

    let inseridos = 0
    let atualizados = 0

    // Vamos ler cada linha
    for (const row of rows) {
      // Sensio keys: "Código", "Item", "Un.", "Valor Un."
      const codigo = String(row['Código'] || '').trim()
      const item = String(row['Item'] || '').trim()
      const un = String(row['Un.'] || '').trim()
      
      let valorUnRaw = row['Valor Un.']
      let preco = 0

      if (typeof valorUnRaw === 'number') {
        preco = valorUnRaw
      } else if (typeof valorUnRaw === 'string') {
        preco = parseFloat(valorUnRaw.replace(',', '.'))
      }

      if (!codigo || !item) continue

      const { data: existing } = await supabase
        .from('produtos')
        .select('codigo')
        .eq('codigo', codigo)
        .single()

      if (existing) {
        await supabase.from('produtos').update({
          descricao: item,
          unidade: un || 'un',
          preco_unitario: isNaN(preco) ? 0 : preco
        }).eq('codigo', codigo)
        atualizados++
      } else {
        await supabase.from('produtos').insert({
          codigo: codigo,
          descricao: item,
          unidade: un || 'un',
          preco_unitario: isNaN(preco) ? 0 : preco
        })
        inseridos++
      }
    }

    revalidatePath('/produtos')
    return { success: true, message: `Sincronização concluída: ${inseridos} novos produtos, ${atualizados} atualizados.` }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
