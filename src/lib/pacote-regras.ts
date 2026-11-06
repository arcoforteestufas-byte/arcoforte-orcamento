/**
 * PACOTE DE REGRAS ARCOFORTE
 *
 * Um "pacote" é UM arquivo JSON com tudo que define o cálculo do orçamento:
 * grupos, parâmetros do formulário, regras de cálculo e exemplos conferidos.
 * Ele é montado fora do sistema (com o Claude) e enviado pela tela
 * Configurações → Pacote de Regras, que valida com ESTE arquivo antes de gravar.
 *
 * Este arquivo não fala com o banco: só define o formato e faz as conferências.
 * Quem lê/grava no banco é src/app/actions/pacote-regras.ts.
 */
import { calcularOrcamento, criarParser, type ParametrosEstufa, type Produto, type RegraCalculo } from "@/utils/engine"

export const FORMATO_PACOTE = "arcoforte-pacote-regras"

export type TipoParametro = "numero" | "selecao" | "booleano" | "texto"
export type Arredondamento = "cima" | "baixo" | "nenhum"

export type ParametroPacote = {
  nome_tecnico: string
  rotulo: string
  tipo: TipoParametro
  opcoes: string[] | null
}

export type GrupoPacote = { ordem: number; nome: string }

export type RegraPacote = {
  /** Código fixo da regra (R001, R002...). Nunca reaproveitar um código de regra apagada. */
  id: string
  /** Ordem do grupo (1 = Postes, 2 = Arcos...). */
  grupo: number
  posicao: string
  /** Código do produto no cadastro de Produtos. */
  produto: string
  formula: string
  /** Vazio/null = sempre aplica. */
  condicao: string | null
  /** false = fica só documentada no pacote, desligada no sistema. Padrão: true. */
  ativa?: boolean
  unidade?: string
  arredondamento?: Arredondamento
  margem_perda?: number
  obs?: string
}

export type ExemploPacote = {
  nome: string
  /** Exatamente o que o formulário entrega ao motor ao clicar em Calcular. */
  parametros: ParametrosEstufa
  /** Quantidade final esperada por código de produto (somando todos os grupos). */
  esperado: Record<string, number>
  /** true (padrão) = qualquer produto que sair e não estiver em "esperado" é erro. */
  esperado_completo?: boolean
  obs?: string
}

export type HistoricoPacote = { versao: string; data: string; autor?: string; mudanca: string }

export type Pacote = {
  formato: string
  versao: string
  data: string
  historico: HistoricoPacote[]
  grupos: GrupoPacote[]
  parametros: ParametroPacote[]
  regras: RegraPacote[]
  exemplos: ExemploPacote[]
  pendencias?: string[]
}

export type Problema = { nivel: "erro" | "aviso"; onde: string; mensagem: string }

export type ResultadoExemplo = {
  nome: string
  ok: boolean
  linhas: { produto: string; esperado: number | null; calculado: number | null; ok: boolean }[]
}

/** Parâmetros que o formulário sempre precisa (campos fixos da tela de orçamento). */
export const PARAMETROS_OBRIGATORIOS = ["n_modulos", "largura_modulo", "n_vaos", "vao", "pe_direito"]

/**
 * Variáveis que o formulário (src/app/(app)/orcamentos/novo/orcamento-form.tsx) entrega ao motor
 * e que NÃO são linhas da tabela parametros_estufa. Conferido no código em 06/11/2026.
 * "requer" = só existe quando esse parâmetro está no pacote (o campo só aparece com ele).
 * "valores" = valores possíveis que o formulário envia (para conferir comparações de texto).
 * Se o formulário mudar, ESTA lista precisa mudar junto.
 */
export const VARIAVEIS_FORMULARIO: { nome: string; descricao: string; requer?: string; valores?: string[] }[] = [
  { nome: "comprimento_estufa", descricao: "Calculada: vao * (n_vaos - 1) + último vão" },
  { nome: "n_divisas", descricao: "Calculada ao clicar Calcular: n_divisas_por_modulo * n_modulos (0 se vazio)" },
  { nome: "n_divisas_por_modulo", descricao: "Campo 'Quantos arcos de divisa por módulo?'", requer: "arco_divisa" },
  { nome: "portas_abrir", descricao: "Soma das portas do tipo 'Porta de Abrir'" },
  { nome: "portas_correr", descricao: "Soma das portas de correr (pequena + grande)" },
  { nome: "portas_correr_pequena", descricao: "Soma das portas de correr 1,20 x 2,00 m" },
  { nome: "portas_correr_grande", descricao: "Soma das portas de correr 2,10 x 3,00 m" },
  { nome: "anticamara_frontal", descricao: "Soma das anticâmaras de modelo 3150", requer: "possui_anticamara" },
  { nome: "anticamara_lateral", descricao: "Soma das anticâmaras de modelo 3160", requer: "possui_anticamara" },
  { nome: "tipo_fechamento_material", descricao: "Material do fechamento lateral", requer: "fechamento_lateral", valores: ["filme", "tela"] },
  { nome: "produto_filme_fechamento", descricao: "Produto escolhido para o fechamento (troca TELA-XXX/FILME-XXX)", requer: "fechamento_lateral" },
  { nome: "divisas_frente", descricao: "Divisas do fechamento na frente (máx. n_modulos - 1)", requer: "fechamento_lateral" },
  { nome: "divisas_fundo", descricao: "Divisas do fechamento no fundo (máx. n_modulos - 1)", requer: "fechamento_lateral" },
  { nome: "fechamento_divisa_perfil", descricao: "Perfil na divisa do fechamento", requer: "fechamento_lateral", valores: ["MOLAS JUNTAS", "MOLAS SEPARADAS"] },
  { nome: "tela_largura_rolo", descricao: "Largura do rolo da tela escolhida (m)", requer: "fechamento_lateral" },
  { nome: "meia_lua_material", descricao: "Material da meia lua dos arcos frontais", requer: "fechamento_lateral", valores: ["filme", "tela"] },
  { nome: "produto_meia_lua", descricao: "Produto da meia lua quando o material é diferente do fechamento", requer: "fechamento_lateral" },
  { nome: "produto_filme_cobertura", descricao: "Produto escolhido para a cobertura (troca FILME-XXX da posição Teto)", requer: "tipo_cobertura" },
]

/** O formulário mostra só estas opções para alguns parâmetros, independentemente do cadastro. */
const VALORES_FIXOS_NO_FORMULARIO: Record<string, string[]> = {
  tipo_cobertura: ["FILME", "TELA"],
}

const PRODUTOS_GENERICOS = ["FILME-XXX", "TELA-XXX"]

export function normalizar(s: string | null | undefined): string {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ")
}

export function normalizarCondicao(c: string | null | undefined): string {
  return (c || "").trim().replace(/\s+/g, " ")
}

export function padroesRegra(r: RegraPacote) {
  return {
    unidade: r.unidade ?? "un",
    arredondamento: r.arredondamento ?? "nenhum",
    margem_perda: Number(r.margem_perda ?? 0),
  }
}

/** Assinatura de conteúdo: duas regras com a mesma assinatura calculam igual. */
export function assinaturaRegra(r: { grupo: number; posicao: string; produto: string; formula: string; condicao: string | null; unidade?: string; arredondamento?: string; margem_perda?: number }): string {
  return [
    r.grupo,
    normalizar(r.posicao),
    String(r.produto).trim(),
    (r.formula || "").trim().replace(/\s+/g, " "),
    normalizarCondicao(r.condicao),
    r.unidade ?? "un",
    r.arredondamento ?? "nenhum",
    Number(r.margem_perda ?? 0),
  ].join(" | ")
}

/** Lê o texto do arquivo e devolve o pacote, ou a lista de erros de formato. */
export function lerPacote(texto: string): { pacote?: Pacote; problemas: Problema[] } {
  const problemas: Problema[] = []
  let bruto: any
  try {
    bruto = JSON.parse(texto)
  } catch (e: any) {
    return { problemas: [{ nivel: "erro", onde: "arquivo", mensagem: `O arquivo não é um JSON válido: ${e.message}` }] }
  }
  if (!bruto || typeof bruto !== "object") {
    return { problemas: [{ nivel: "erro", onde: "arquivo", mensagem: "O arquivo está vazio ou não é um objeto JSON." }] }
  }
  if (bruto.formato !== FORMATO_PACOTE) {
    problemas.push({ nivel: "erro", onde: "formato", mensagem: `O campo "formato" precisa ser "${FORMATO_PACOTE}".` })
  }
  for (const campo of ["grupos", "parametros", "regras"]) {
    if (!Array.isArray(bruto[campo])) problemas.push({ nivel: "erro", onde: campo, mensagem: `O campo "${campo}" precisa ser uma lista.` })
  }
  if (!bruto.versao || typeof bruto.versao !== "string") {
    problemas.push({ nivel: "erro", onde: "versao", mensagem: 'O campo "versao" é obrigatório (ex.: "1.0.0").' })
  }
  if (problemas.length) return { problemas }
  const pacote: Pacote = {
    formato: bruto.formato,
    versao: String(bruto.versao),
    data: String(bruto.data || ""),
    historico: Array.isArray(bruto.historico) ? bruto.historico : [],
    grupos: bruto.grupos,
    parametros: bruto.parametros,
    regras: bruto.regras,
    exemplos: Array.isArray(bruto.exemplos) ? bruto.exemplos : [],
    pendencias: Array.isArray(bruto.pendencias) ? bruto.pendencias : [],
  }
  return { pacote, problemas }
}

/** Monta os parâmetros exatamente como o formulário faz em handleCalcular. */
export function parametrosComoFormulario(p: ParametrosEstufa): ParametrosEstufa {
  const nDivisasPorModulo = Number(p["n_divisas_por_modulo"]) || 0
  const nModulos = Number(p["n_modulos"]) || 0
  return { ...p, n_divisas: nDivisasPorModulo * nModulos }
}

/** Converte as regras ATIVAS do pacote para o formato do motor (para rodar os exemplos). */
export function regrasParaMotor(pacote: Pacote): RegraCalculo[] {
  const nomeGrupo = new Map(pacote.grupos.map(g => [g.ordem, g.nome]))
  return pacote.regras
    .filter(r => r.ativa !== false)
    .map(r => {
      const pd = padroesRegra(r)
      return {
        id: r.id,
        posicao_id: `${r.grupo}|${normalizar(r.posicao)}`,
        produto_codigo: String(r.produto),
        formula_quantidade: r.formula,
        condicao_aplicabilidade: r.condicao,
        unidade_medida: pd.unidade,
        regra_arredondamento: pd.arredondamento,
        margem_perda: pd.margem_perda,
        posicoes: {
          nome: r.posicao,
          grupo_id: String(r.grupo),
          grupos_componentes: { nome: nomeGrupo.get(r.grupo) || String(r.grupo), ordem: r.grupo },
        },
      }
    })
}

function arred2(n: number) {
  return Math.round(n * 100) / 100
}

/**
 * Confere o pacote inteiro. Erros impedem a aplicação; avisos só informam.
 * produtosAtivos = produtos ativos do banco (os mesmos que a tela de orçamento carrega).
 */
export function validarPacote(pacote: Pacote, produtosAtivos: Produto[]): { problemas: Problema[]; exemplos: ResultadoExemplo[] } {
  const problemas: Problema[] = []
  const erro = (onde: string, mensagem: string) => problemas.push({ nivel: "erro", onde, mensagem })
  const aviso = (onde: string, mensagem: string) => problemas.push({ nivel: "aviso", onde, mensagem })
  const parser = criarParser()

  // ---------- Grupos ----------
  const ordens = new Set<number>()
  for (const g of pacote.grupos) {
    if (typeof g.ordem !== "number" || !g.nome) erro("grupos", `Grupo inválido: ${JSON.stringify(g)}`)
    if (ordens.has(g.ordem)) erro("grupos", `Grupo de ordem ${g.ordem} aparece mais de uma vez.`)
    ordens.add(g.ordem)
  }

  // ---------- Parâmetros ----------
  const params = new Map<string, ParametroPacote>()
  for (const p of pacote.parametros) {
    const onde = `parâmetro ${p.nome_tecnico || "(sem nome)"}`
    if (!p.nome_tecnico || !/^[a-z][a-z0-9_]*$/.test(p.nome_tecnico)) erro(onde, "nome_tecnico deve ter só letras minúsculas, números e _ (ex.: tipo_arco).")
    if (params.has(p.nome_tecnico)) erro(onde, "Parâmetro repetido.")
    if (!["numero", "selecao", "booleano", "texto"].includes(p.tipo)) erro(onde, `Tipo "${p.tipo}" inválido (use numero, selecao, booleano ou texto).`)
    if (p.tipo === "selecao" && (!Array.isArray(p.opcoes) || p.opcoes.length === 0)) erro(onde, "Parâmetro de seleção precisa de opções.")
    if (!p.rotulo) erro(onde, "Falta o rótulo (texto que aparece no formulário).")
    params.set(p.nome_tecnico, p)
  }
  for (const nome of PARAMETROS_OBRIGATORIOS) {
    if (!params.has(nome)) erro("parâmetros", `O parâmetro obrigatório "${nome}" não está no pacote.`)
  }

  // Variáveis que existirão no formulário com este pacote
  const variaveis = new Map<string, string[] | null>()
  for (const p of params.values()) {
    const valores = VALORES_FIXOS_NO_FORMULARIO[p.nome_tecnico] ?? (p.tipo === "selecao" ? p.opcoes : null)
    variaveis.set(p.nome_tecnico, valores ?? null)
  }
  const variaveisIndisponiveis = new Map<string, string>()
  for (const v of VARIAVEIS_FORMULARIO) {
    if (!v.requer || params.has(v.requer)) variaveis.set(v.nome, v.valores ?? null)
    else variaveisIndisponiveis.set(v.nome, v.requer)
  }

  // ---------- Regras ----------
  const produtos = new Set(produtosAtivos.map(p => String(p.codigo)))
  const ids = new Set<string>()
  const ativasPorLugar = new Map<string, string>()

  const conferirExpressao = (texto: string, onde: string, oQue: string) => {
    let expr
    try {
      expr = parser.parse(texto)
    } catch (e: any) {
      erro(onde, `${oQue} com erro de escrita: ${e.message}`)
      return
    }
    for (const nome of expr.variables()) {
      if (variaveis.has(nome)) continue
      if (variaveisIndisponiveis.has(nome)) {
        erro(onde, `${oQue} usa "${nome}", que só existe no formulário quando o parâmetro "${variaveisIndisponiveis.get(nome)}" está no pacote.`)
      } else {
        erro(onde, `${oQue} usa "${nome}", que o formulário não envia. O motor trataria como 0 e a regra calcularia errado sem avisar.`)
      }
    }
    // Comparações com texto: o valor precisa ser uma opção que o formulário realmente envia
    // ('' é permitido: serve para testar "campo vazio", ex.: modelo_cabo != '')
    const comparacoes: [string, "==" | "!=", string][] = []
    for (const m of texto.matchAll(/([a-z_][a-z0-9_]*)\s*(==|!=)\s*'([^']*)'/gi)) comparacoes.push([m[1], m[2] as "==" | "!=", m[3]])
    for (const m of texto.matchAll(/'([^']*)'\s*(==|!=)\s*([a-z_][a-z0-9_]*)/gi)) comparacoes.push([m[3], m[2] as "==" | "!=", m[1]])
    for (const m of texto.matchAll(/CONTAINS\(\s*([a-z_][a-z0-9_]*)\s*,\s*'([^']*)'\s*\)/gi)) comparacoes.push([m[1], "==", m[2]])
    for (const [nome, op, valor] of comparacoes) {
      const valores = variaveis.get(nome)
      if (!valores || valor === "" || valores.includes(valor)) continue
      const lista = valores.map(v => `'${v}'`).join(", ")
      if (op === "==") {
        erro(onde, `${oQue} compara "${nome}" com '${valor}', mas o formulário só envia: ${lista}. Essa comparação nunca seria verdadeira.`)
      } else {
        aviso(onde, `${oQue} testa "${nome}" diferente de '${valor}', mas esse valor não existe (o formulário só envia: ${lista}). Esse teste é sempre verdadeiro.`)
      }
    }
    if (/\b1\s*==\s*2\b/.test(texto)) {
      aviso(onde, `${oQue} contém "1 == 2" (sempre falso): a regra nunca calcula. Para desligar uma regra, use "ativa": false.`)
    }
  }

  for (const r of pacote.regras) {
    const onde = `regra ${r.id || "(sem código)"}`
    if (!r.id || !/^R\d{3,}$/.test(r.id)) erro(onde, 'Código da regra deve ser no formato R001, R002...')
    if (ids.has(r.id)) erro(onde, "Código de regra repetido.")
    ids.add(r.id)
    if (!ordens.has(r.grupo)) erro(onde, `Grupo ${r.grupo} não existe na lista de grupos do pacote.`)
    if (!r.posicao || !r.posicao.trim()) erro(onde, "Falta a posição.")
    if (!r.formula || !String(r.formula).trim()) erro(onde, "Falta a fórmula.")
    const pd = padroesRegra(r)
    if (!["cima", "baixo", "nenhum"].includes(pd.arredondamento)) erro(onde, `Arredondamento "${pd.arredondamento}" inválido (cima, baixo ou nenhum).`)
    if (Number.isNaN(pd.margem_perda) || pd.margem_perda < 0) erro(onde, "margem_perda precisa ser um número maior ou igual a 0.")

    if (r.ativa === false) continue // regra desligada: fica só documentada

    if (!produtos.has(String(r.produto))) {
      erro(onde, `Produto "${r.produto}" não está cadastrado (ou está inativo) em Produtos. O motor ignoraria esta regra sem avisar.`)
    } else if (PRODUTOS_GENERICOS.includes(String(r.produto))) {
      // ok: o motor troca pelo produto escolhido no formulário
    }
    if (r.formula) conferirExpressao(String(r.formula), onde, "A fórmula")
    const cond = normalizarCondicao(r.condicao)
    if (cond) conferirExpressao(cond, onde, "A condição")

    const lugar = `${r.grupo}|${normalizar(r.posicao)}|${String(r.produto).trim()}`
    if (ativasPorLugar.has(lugar)) {
      erro(onde, `Mesmo grupo, posição e produto da regra ${ativasPorLugar.get(lugar)}. Regras novas com o mesmo nome de posição vão para a mesma posição no banco, e o motor só usa UMA regra por posição+produto (descarta a outra sem avisar). Junte as duas numa fórmula só, dê outro nome de posição, ou desligue uma ("ativa": false).`)
    } else {
      ativasPorLugar.set(lugar, r.id)
    }
  }

  // ---------- Exemplos ----------
  const resultados: ResultadoExemplo[] = []
  if (pacote.exemplos.length === 0) {
    aviso("exemplos", "O pacote não tem nenhum exemplo conferido. Sem exemplo, não há como provar que os números estão certos.")
  }
  const regrasMotor = regrasParaMotor(pacote)
  for (const ex of pacote.exemplos) {
    const onde = `exemplo "${ex.nome}"`
    if (!ex.parametros || !ex.esperado) {
      erro(onde, 'Exemplo precisa de "parametros" e "esperado".')
      continue
    }
    for (const obrig of [...PARAMETROS_OBRIGATORIOS, "comprimento_estufa"]) {
      if (ex.parametros[obrig] === undefined || ex.parametros[obrig] === "") erro(onde, `Falta "${obrig}" nos parâmetros do exemplo.`)
    }
    const itens = calcularOrcamento(parametrosComoFormulario(ex.parametros), regrasMotor, produtosAtivos)
    const calculado = new Map<string, number>()
    for (const it of itens) calculado.set(it.produto_codigo, arred2((calculado.get(it.produto_codigo) || 0) + it.quantidade_final))
    const linhas: ResultadoExemplo["linhas"] = []
    for (const [produto, qtd] of Object.entries(ex.esperado)) {
      const c = calculado.has(produto) ? calculado.get(produto)! : null
      linhas.push({ produto, esperado: Number(qtd), calculado: c, ok: c !== null ? arred2(c) === arred2(Number(qtd)) : Number(qtd) === 0 })
    }
    if (ex.esperado_completo !== false) {
      for (const [produto, c] of calculado) {
        if (!(produto in ex.esperado)) linhas.push({ produto, esperado: null, calculado: c, ok: false })
      }
    }
    const ok = linhas.every(l => l.ok)
    if (!ok) {
      const falhas = linhas.filter(l => !l.ok).map(l => `${l.produto}: esperado ${l.esperado ?? "nada"}, calculado ${l.calculado ?? "nada"}`)
      erro(onde, `O cálculo não bateu com o esperado → ${falhas.join("; ")}`)
    }
    resultados.push({ nome: ex.nome, ok, linhas: linhas.sort((a, b) => a.produto.localeCompare(b.produto)) })
  }

  return { problemas, exemplos: resultados }
}
