"use server"

import { createClient } from "@/utils/supabase/server"
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

// Normaliza texto pra comparação: remove espaços nas pontas, colapsa espaços duplos e ignora maiúsculas/minúsculas.
// Evita que uma posição/produto já existente deixe de ser encontrado (e seja duplicado) só por causa de
// uma diferença de espaço ou capitalização entre o arquivo MD e o que já está salvo no banco.
function normalizar(s: string | null | undefined): string {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function seedRegrasFromMD(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Usuário não autenticado")

    const file = formData.get('file') as File
    if (!file) throw new Error("Nenhum arquivo enviado")

    const fileContent = await file.text()

    const lines = fileContent.split('\n')
    let isData = false
    const rows = []

    for (let line of lines) {
      line = line.trim()
      if (line.startsWith('R001;')) {
        isData = true
      }
      if (isData && line) {
        if (line.startsWith('Pendências')) continue;
        const [id, grupo, posicao, codigo, produto, formula, condicao, obs] = line.split(';')
        rows.push({
          Grupo: grupo,
          Posicao: posicao,
          Codigo: codigo,
          Produto: produto,
          Formula_Qtd: formula,
          Condicao: condicao,
          Observacao: obs
        })
      }
    }

    if (rows.length === 0) {
      throw new Error("Nenhuma regra encontrada no arquivo.")
    }

    let count = 0;
    let duplicatasEvitadas = 0;
    for (const row of rows) {
      if (!row['Grupo']) continue

      const groupStr = row['Grupo'].split('.')[0].trim()
      const groupId = groups[groupStr]
      if (!groupId) continue

      const posName = row['Posicao']?.trim()
      const prodCode = row['Codigo']?.trim()
      const prodName = row['Produto']?.trim()
      const formula = row['Formula_Qtd']?.trim()
      const cond = row['Condicao']?.trim()

      if (!posName || !prodCode) continue

      // 1. Cadastra o Produto se não existir
      if (prodCode !== 'TELA-XXX' && prodCode !== 'FILME-XXX' && prodCode !== 'MANUAL') {
        const codigos = prodCode.includes(' ou ') ? prodCode.split(' ou ') : [prodCode]

        for (const cod of codigos) {
          const cleanCod = cod.trim()
          const { data: existingProd } = await supabase
            .from('produtos')
            .select('codigo')
            .eq('codigo', cleanCod)
            .single()

          if (!existingProd) {
            await supabase.from('produtos').insert({
              codigo: cleanCod,
              descricao: prodName || 'Sem descrição',
              unidade: 'un',
              preco_unitario: 0
            })
          }
        }
      }

      // 2. Busca ou cadastra a Posição
      // Busca TODAS as posições do grupo e compara normalizado (trim + case-insensitive) em vez de usar
      // .single() com match exato — .single() falha (erro "multiple rows"/"no rows") tanto quando a posição
      // realmente não existe quanto quando já existe MAIS DE UMA posição com esse nome no grupo (o banco de
      // dev tinha posições "Chumbador"/"Teto" duplicadas desde antes deste importador existir), e nos dois
      // casos o código antigo caía no "senão cria uma nova", piorando a duplicata a cada upload.
      //
      // IMPORTANTE: quando há mais de uma posição com o mesmo nome (dado pré-existente duplicado), guardamos
      // TODOS os ids que batem — não só o primeiro — pra usar no passo 3. Se a busca de Regra usasse só um
      // id "escolhido arbitrariamente", ela podia cair bem na posição-duplicata errada (uma que nunca teve
      // Regra associada) e criar uma Regra NOVA ali, mesmo já existindo uma Regra idêntica noutra posição
      // duplicada — foi exatamente isso que causou uma 3ª linha de "Chumbador"/"Teto" ao testar essa correção.
      let posId = ''
      let posIdsComEsseNome: string[] = []
      const { data: posicoesDoGrupo } = await supabase
        .from('posicoes')
        .select('id, nome')
        .eq('grupo_id', groupId)

      const posicoesEncontradas = posicoesDoGrupo?.filter(p => normalizar(p.nome) === normalizar(posName)) || []

      if (posicoesEncontradas.length > 0) {
        posId = posicoesEncontradas[0].id
        posIdsComEsseNome = posicoesEncontradas.map(p => p.id)
        if (posicoesEncontradas.length > 1) {
          console.warn(
            `Aviso: ${posicoesEncontradas.length} posições chamadas "${posName}" já existiam no grupo ${groupStr} (dado duplicado pré-existente, não criado por este upload) — usando todas pra achar a Regra certa.`
          )
        }
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
        if (newPos) {
          posId = newPos.id
          posIdsComEsseNome = [newPos.id]
        }
      }

      // 3. Cadastra ou atualiza a Regra
      if (formula && formula !== 'PENDENTE' && cond && cond !== 'PENDENTE') {
        // Busca a Regra em QUALQUER uma das posições com esse nome (posIdsComEsseNome), não só em posId —
        // assim, mesmo com posições duplicadas no banco, uma Regra já existente é sempre encontrada e
        // atualizada, em vez de nascer uma cópia nova numa posição-duplicata que ainda não tinha Regra.
        const { data: regrasDasPosicoes } = await supabase
          .from('regras_calculo')
          .select('id, produto_codigo, condicao_aplicabilidade')
          .in('posicao_id', posIdsComEsseNome)

        const regrasCorrespondentes = regrasDasPosicoes?.filter(
          r => normalizar(r.produto_codigo) === normalizar(prodCode)
        ) || []

        if (regrasCorrespondentes.length > 1) {
          duplicatasEvitadas++
          console.warn(
            `Aviso: mais de uma Regra encontrada para posição "${posName}" + produto "${prodCode}" — atualizando a ativa (ou a primeira, se todas estiverem desativadas) em vez de criar outra.`
          )
        }

        const existingRule =
          regrasCorrespondentes.find(r => !(r.condicao_aplicabilidade || '').includes('and 1 == 2')) ||
          regrasCorrespondentes[0]

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
        count++;
      }
    }

    revalidatePath('/admin/regras')

    const avisoDuplicatas = duplicatasEvitadas > 0
      ? ` (${duplicatasEvitadas} posição/produto com Regras duplicadas pré-existentes — verifique a tabela.)`
      : ''

    return { success: true, message: `Foram carregadas ${count} regras do arquivo markdown com sucesso!${avisoDuplicatas}` }

  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
