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

    const batch = []

    // Vamos ler cada linha
    for (const row of rows) {
      // Novas chaves baseadas na exportação do Sensio
      const codigo = String(row['Código SKU'] || row['Código'] || '').trim()
      const item = String(row['Descrição'] || row['Nome'] || row['Item'] || '').trim()
      const un = String(row['Unidade'] || row['Un.'] || '').trim()
      
      let valorUnRaw = row['Preço Unitário'] || row['Valor Un.'] || row['Preço']
      let preco = 0

      if (typeof valorUnRaw === 'number') {
        preco = valorUnRaw
      } else if (typeof valorUnRaw === 'string') {
        let limpo = valorUnRaw.replace(/[R$\s]/g, '')
        if (limpo.includes(',')) {
          limpo = limpo.replace(/\./g, '').replace(',', '.')
        }
        preco = parseFloat(limpo)
      }

      if (isNaN(preco)) preco = 0

      if (preco >= 99999999) {
        throw new Error(`O produto ${codigo} (${item}) tem um preço muito grande (${valorUnRaw}). Verifique a planilha.`)
      }

      if (!codigo || !item) continue

      batch.push({
        codigo: codigo,
        descricao: item,
        unidade: un || 'un',
        preco_unitario: isNaN(preco) ? 0 : preco
      })
    }

    if (batch.length > 0) {
      // Fazer o upsert (inserir ou atualizar) em lotes de 1000 para não estourar o limite de requisição e ser muito rápido
      for (let i = 0; i < batch.length; i += 1000) {
        const chunk = batch.slice(i, i + 1000)
        const { error } = await supabase.from('produtos').upsert(chunk, { onConflict: 'codigo' })
        if (error) throw new Error(error.message)
      }
    }

    revalidatePath('/produtos')
    return { success: true, message: `Sincronização concluída: ${batch.length} produtos processados e atualizados com sucesso.` }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
