import { Parser } from 'expr-eval'

export type ParametrosEstufa = Record<string, string | number | boolean>

export type RegraCalculo = {
  id: string
  posicao_id: string
  produto_codigo: string
  formula_quantidade: string
  condicao_aplicabilidade: string | null
  unidade_medida: string
  regra_arredondamento: 'cima' | 'baixo' | 'nenhum'
  margem_perda: number
  // Relacionamentos para facilitar o display
  posicoes?: {
    nome: string
    grupo_id: string
    grupos_componentes?: {
      nome: string
      ordem: number
    }
  }
}

export type Produto = {
  codigo: string
  descricao: string
  preco_unitario: number
  unidade: string
  peso_bruto_kg?: number | null
  peso_liquido_kg?: number | null
}

export type ItemOrcamento = {
  regra_id: string
  posicao_id: string
  grupo_id: string
  grupo_nome: string
  posicao_nome: string
  produto_codigo: string
  produto_descricao: string
  quantidade_bruta: number
  quantidade_final: number
  unidade: string
  preco_unitario: number
  valor_total: number
  peso_bruto_total: number
  peso_liquido_total: number
  isManualChange?: boolean
  manualOriginalProduto?: string
  manualUsuarioId?: string
}

/**
 * Motor Matemático Principal
 */
export function calcularOrcamento(
  parametros: ParametrosEstufa,
  regrasRaw: RegraCalculo[],
  produtos: Produto[]
): ItemOrcamento[] {
  const parser = new Parser()
  
  // Remove regras duplicadas (prevenindo explosão de JOIN ou regras cadastradas em dobro no banco com pequenas variações)
  const regrasMap = new Map<string, RegraCalculo>()
  const assinaturas = new Set<string>()

  for (const r of regrasRaw) {
    if (!r) continue
    // Assinatura restrita: 1 regra por Produto na mesma Posição. Se houver 2 regras pro mesmo produto no mesmo lugar, ignora a duplicata.
    const assinatura = `${r.posicao_id}_${r.produto_codigo}`
    
    if (r.id && !regrasMap.has(r.id) && !assinaturas.has(assinatura)) {
      regrasMap.set(r.id, r)
      assinaturas.add(assinatura)
    }
  }
  const regras = Array.from(regrasMap.values())
  
  // Funções estilo Excel
  parser.functions.IF = function(cond: any, a: any, b: any) { return cond ? a : b; }
  parser.functions.AND = function(...args: any[]) { return args.every(Boolean); }
  parser.functions.OR = function(...args: any[]) { return args.some(Boolean); }
  parser.functions.SUM = function(...args: any[]) { return args.reduce((acc, v) => acc + (Number(v) || 0), 0); }
  parser.functions.ROUNDUP = function(val: any, digits: any=0) { return Math.ceil(val); }
  parser.functions.FLOOR = function(val: any, factor: any) { return Math.floor(val); }
  // CONTAINS: usado para checar se uma posição está selecionada em campos multi-select
  // salvos como string separada por vírgula (ex.: modelo_cabo = 'INTERNOS,LATERAL 1,COMPLETO')
  parser.functions.CONTAINS = function(haystack: any, needle: any) { return String(haystack ?? '').split(',').map(s => s.trim()).includes(String(needle).trim()); }
  const itens: ItemOrcamento[] = []

  // Resolve códigos de produto "placeholder" (FILME-XXX / TELA-XXX) para o produto
  // real escolhido pelo vendedor no formulário. Essas duas posições (Teto/cobertura e
  // Fechamento Lateral em filme ou tela) não têm produto fixo -- variam por pedido -- então
  // as Regras usam um código genérico soh pra existir uma posição na lista, e aqui a gente
  // troca pelo produto de verdade antes de buscar o preço. Sem isso o item aparece na lista
  // com o nome genérico e preço R$ 0,00 (bug corrigido em 03/09/2026, ver manual seção 11).
  function resolverProdutoCodigo(regra: RegraCalculo): string {
    const codigo = regra.produto_codigo
    if (codigo !== 'FILME-XXX' && codigo !== 'TELA-XXX') return codigo

    const posicaoNome = regra.posicoes?.nome || ''
    if (codigo === 'FILME-XXX' && posicaoNome === 'Teto') {
      // Cobertura (topo do arco) -- produto escolhido em "Qual Filme / Plástico?" da cobertura
      const real = parametros['produto_filme_cobertura']
      return real ? String(real) : codigo
    }

    // Fechamento lateral (filme OU tela, mesmo campo pros dois) -- produto escolhido em
    // "Qual Filme / Plástico?" ou "Qual Tela?" do fechamento lateral
    const real = parametros['produto_filme_fechamento']
    return real ? String(real) : codigo
  }

  // Prepara o dicionário de produtos para acesso rápido O(1)
  const produtosDict = produtos.reduce((acc, p) => {
    acc[p.codigo] = p
    return acc
  }, {} as Record<string, Produto>)

  // Proxy para evitar erro de 'undefined variable' no expr-eval. Variáveis faltantes viram 0.
  const safeParametros = new Proxy(parametros, {
    get(target, prop) {
      if (typeof prop === 'string' && prop in target) {
        return target[prop]
      }
      return 0 // Valor padrão seguro para variáveis numéricas ou booleanas em expressões
    }
  })

  for (const regra of regras) {
    try {
      // 1. Avaliar a condição de aplicabilidade
      let aplicavel = true
      if (regra.condicao_aplicabilidade && regra.condicao_aplicabilidade.trim() !== '' && regra.condicao_aplicabilidade !== 'PENDENTE') {
        const expr = parser.parse(regra.condicao_aplicabilidade)
        aplicavel = Boolean(expr.evaluate(safeParametros as any))
      }

      if (!aplicavel) continue

      // 2. Calcular a Quantidade Bruta
      if (regra.formula_quantidade === 'PENDENTE') continue
      
      const qtyExpr = parser.parse(regra.formula_quantidade)
      const quantidadeBruta = Number(qtyExpr.evaluate(safeParametros as any)) || 0
      
      // Se a quantidade calculada for 0 ou negativa, ignoramos o item
      if (quantidadeBruta <= 0) continue

      // 3. Aplicar Margem de Perda
      let quantidadeComPerda = quantidadeBruta
      if (regra.margem_perda > 0) {
        quantidadeComPerda = quantidadeBruta * (1 + regra.margem_perda / 100)
      }

      // 4. Arredondamento
      let quantidadeFinal = quantidadeComPerda
      if (regra.regra_arredondamento === 'cima') {
        quantidadeFinal = Math.ceil(quantidadeComPerda)
      } else if (regra.regra_arredondamento === 'baixo') {
        quantidadeFinal = Math.floor(quantidadeComPerda)
      } else {
        // nenhum (pode manter decimais, arredondando apenas para 2 casas para evitar flutuantes infinitos)
        quantidadeFinal = Math.round(quantidadeComPerda * 100) / 100
      }

      // 5. Preço e Total
      const produtoCodigoResolvido = resolverProdutoCodigo(regra)
      const produto = produtosDict[produtoCodigoResolvido]
      if (!produto) {
        console.warn(`Produto ${produtoCodigoResolvido} não encontrado para a regra ${regra.id}`)
        continue
      }

      const precoUnitario = produto.preco_unitario || 0
      const valorTotal = quantidadeFinal * precoUnitario
      
      const pesoBrutoTotal = (produto.peso_bruto_kg || 0) * quantidadeFinal
      const pesoLiquidoTotal = (produto.peso_liquido_kg || 0) * quantidadeFinal

      // 6. Montar o item final
      itens.push({
        regra_id: regra.id,
        posicao_id: regra.posicao_id,
        grupo_id: regra.posicoes?.grupo_id || 'sem-grupo',
        grupo_nome: regra.posicoes?.grupos_componentes?.nome || 'Sem Grupo',
        posicao_nome: regra.posicoes?.nome || 'Desconhecida',
        produto_codigo: produto.codigo,
        produto_descricao: produto.descricao,
        quantidade_bruta: quantidadeBruta,
        quantidade_final: quantidadeFinal,
        unidade: regra.unidade_medida || produto.unidade,
        preco_unitario: precoUnitario,
        valor_total: valorTotal,
        peso_bruto_total: pesoBrutoTotal,
        peso_liquido_total: pesoLiquidoTotal
      })

    } catch (err: any) {
      console.warn(`Erro ao avaliar regra ${regra.id}: ${err.message}`)
    }
  }

  // 7. Agregação Final
  // Agrupa por grupo_id e produto_codigo para evitar itens duplicados no mesmo grupo
  const itensAgrupados = new Map<string, ItemOrcamento>()

  for (const item of itens) {
    const key = `${item.grupo_id}_${item.produto_codigo}`
    
    if (itensAgrupados.has(key)) {
      const existente = itensAgrupados.get(key)!
      existente.quantidade_bruta += item.quantidade_bruta
      existente.quantidade_final += item.quantidade_final
      existente.valor_total += item.valor_total
      existente.peso_bruto_total += item.peso_bruto_total
      existente.peso_liquido_total += item.peso_liquido_total
      
      // Adiciona a posição se ainda não estiver na lista (para mostrar na UI)
      if (!existente.posicao_nome.includes(item.posicao_nome)) {
        existente.posicao_nome += ` / ${item.posicao_nome}`
      }
    } else {
      // Fazemos uma cópia para não mutar o array original caso seja referenciado
      itensAgrupados.set(key, { ...item })
    }
  }

  const resultadoFinal = Array.from(itensAgrupados.values())

  // Ordena por Grupo e depois por Produto
  return resultadoFinal.sort((a, b) => {
    if (a.grupo_nome < b.grupo_nome) return -1
    if (a.grupo_nome > b.grupo_nome) return 1
    if (a.produto_descricao < b.produto_descricao) return -1
    if (a.produto_descricao > b.produto_descricao) return 1
    return 0
  })
}
