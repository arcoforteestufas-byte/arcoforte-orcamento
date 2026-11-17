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
  /** Explicação em linguagem simples vinda do Pacote de Regras (campo "explicacao"). Pode ter {variavel} e {resultado}. */
  explicacao?: string | null
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
  /** Como o sistema chegou na quantidade: uma entrada por regra que somou neste item. */
  detalhes?: DetalheCalculo[]
}

export type DetalheCalculo = {
  posicao_nome: string
  formula: string
  condicao: string | null
  /** Valores das variáveis que a fórmula usou, no momento do cálculo. */
  variaveis: Record<string, string | number | boolean>
  quantidade_bruta: number
  margem_perda: number
  arredondamento: string
  quantidade_final: number
  explicacao?: string | null
}

function formatarValor(v: unknown): string {
  if (typeof v === 'number') return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(v)
  if (typeof v === 'boolean') return v ? 'sim' : 'não'
  if (v === '' || v === null || v === undefined) return '(vazio)'
  return String(v)
}

/** Troca {variavel} e {resultado} do texto da explicação pelos valores usados no cálculo. */
export function montarTextoExplicacao(d: DetalheCalculo): string | null {
  if (!d.explicacao || !d.explicacao.trim()) return null
  const parser = criarParser()
  const valores = new Proxy(d.variaveis, {
    get(alvo, chave) {
      if (chave === 'resultado') return d.quantidade_bruta
      if (typeof chave === 'string' && chave in alvo) return (alvo as any)[chave]
      return 0
    }
  })
  // {nome} troca pelo valor; {conta} (ex.: {n_modulos + 1}) calcula com os mesmos valores do cálculo
  return d.explicacao.replace(/\{([^{}]+)\}/g, (original, conteudo: string) => {
    try {
      return formatarValor(parser.evaluate(conteudo.trim(), valores as any))
    } catch {
      return original
    }
  })
}

/** Variáveis usadas nos trechos {...} de uma explicação. */
export function variaveisDaExplicacao(texto: string | null | undefined): string[] {
  if (!texto) return []
  const parser = criarParser()
  const nomes = new Set<string>()
  for (const m of texto.matchAll(/\{([^{}]+)\}/g)) {
    try {
      for (const v of parser.parse(m[1].trim()).variables()) if (v !== 'resultado') nomes.add(v)
    } catch { /* trecho inválido: o validador do pacote avisa */ }
  }
  return [...nomes]
}

/** Mostra a fórmula com os números no lugar das variáveis (ex.: "(13 - 1) * 3 - 3"). */
export function formulaComValores(d: DetalheCalculo): string {
  return d.formula.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (nome) => {
    if (!(nome in d.variaveis)) return nome
    const v = d.variaveis[nome]
    if (typeof v === 'string') return `'${v}'`
    if (typeof v === 'boolean') return v ? 'true' : 'false'
    return String(v)
  })
}

/**
 * Cria o interpretador de fórmulas usado pelo motor (com as funções estilo Excel).
 * Exportado para que o validador de pacotes de regras use EXATAMENTE o mesmo interpretador.
 */
export function criarParser(): Parser {
  const parser = new Parser()
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
  return parser
}

/** Tipos de arco que o formulário oferece. */
export const TIPOS_ARCO = ['SIMPLES', 'DUPLO', 'LANTERNIM'] as const

/**
 * Tipo de arco de cada módulo, na ordem. Normalmente todos usam o "Tipo de Arco" escolhido.
 * Na opção avançada (arco_por_modulo ligado, 2 módulos ou mais) cada módulo tem o seu,
 * guardado em arcos_modulos como texto separado por vírgula (ex.: 'DUPLO,LANTERNIM,DUPLO').
 * Posição vazia ou inválida usa o tipo de arco padrão.
 */
export function arcosDosModulos(p: ParametrosEstufa): string[] {
  const n = Math.max(0, Math.floor(Number(p['n_modulos']) || 0))
  const padrao = String(p['tipo_arco'] || '')
  const ligado = p['arco_por_modulo'] === true || p['arco_por_modulo'] === 'true'
  const lista = ligado && n >= 2 ? String(p['arcos_modulos'] || '').split(',').map(s => s.trim()) : []
  return Array.from({ length: n }, (_, i) => (TIPOS_ARCO as readonly string[]).includes(lista[i]) ? lista[i] : padrao)
}

/**
 * Monta as variáveis calculadas que o motor usa além dos campos do formulário:
 * n_divisas (total de arcos de divisa), quantos módulos têm cada tipo de arco
 * (n_mod_simples, n_mod_duplo, n_mod_lanternim) e quantos arcos de divisa caem em
 * cada tipo (n_div_simples, n_div_duplo, n_div_lanternim). Usar SEMPRE antes de calcularOrcamento.
 */
export function prepararParametros(p: ParametrosEstufa): ParametrosEstufa {
  const nModulos = Number(p['n_modulos']) || 0
  const nDivisasPorModulo = Number(p['n_divisas_por_modulo']) || 0
  const arcos = arcosDosModulos(p)
  const conta = (t: string) => arcos.filter(a => a === t).length
  const ns = conta('SIMPLES'), nd = conta('DUPLO'), nl = conta('LANTERNIM')
  return {
    ...p,
    n_divisas: nDivisasPorModulo * nModulos,
    n_mod_simples: ns,
    n_mod_duplo: nd,
    n_mod_lanternim: nl,
    n_div_simples: nDivisasPorModulo * ns,
    n_div_duplo: nDivisasPorModulo * nd,
    n_div_lanternim: nDivisasPorModulo * nl,
  }
}

/**
 * Motor Matemático Principal
 */
export function calcularOrcamento(
  parametros: ParametrosEstufa,
  regrasRaw: RegraCalculo[],
  produtos: Produto[]
): ItemOrcamento[] {
  const parser = criarParser()
  
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

    if (posicaoNome.toLowerCase().includes('meia lua') && parametros['produto_meia_lua']) {
      return String(parametros['produto_meia_lua'])
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
      const variaveisUsadas: Record<string, string | number | boolean> = {}
      for (const nome of [...qtyExpr.variables(), ...variaveisDaExplicacao(regra.explicacao)]) {
        const v = (safeParametros as any)[nome]
        variaveisUsadas[nome] = (v === undefined || v === null) ? 0 : v
      }
      
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
        peso_liquido_total: pesoLiquidoTotal,
        detalhes: [{
          posicao_nome: regra.posicoes?.nome || 'Desconhecida',
          formula: regra.formula_quantidade,
          condicao: regra.condicao_aplicabilidade,
          variaveis: variaveisUsadas,
          quantidade_bruta: quantidadeBruta,
          margem_perda: regra.margem_perda || 0,
          arredondamento: regra.regra_arredondamento || 'nenhum',
          quantidade_final: quantidadeFinal,
          explicacao: regra.explicacao ?? null
        }]
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
      existente.detalhes = [...(existente.detalhes || []), ...(item.detalhes || [])]
      
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
