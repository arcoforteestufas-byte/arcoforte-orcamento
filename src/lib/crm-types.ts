// Tipos do CRM (funil de vendas) — usados pelo servidor e pelas telas.

export type TipoEtapa = "aberta" | "ganho" | "perdido"
export type StatusLead = "aberto" | "ganho" | "perdido"

export interface CrmFunil {
  id: string
  nome: string
  ordem: number
  ativo: boolean
  cor: string
  descricao: string | null
  proximo_funil_id: string | null
  membros_veem_todos: boolean
  membros_editam_todos: boolean
  usuarios?: string[] // ids com acesso (vazio = todos)
}

export interface CrmEtapa {
  id: string
  funil_id: string
  nome: string
  cor: string
  ordem: number
  tipo: TipoEtapa
  probabilidade: number
}

export interface CrmItemLista {
  id: string
  nome: string
  ordem: number
  ativo: boolean
}

export type TipoCampo = "texto" | "numero" | "selecao" | "sim_nao" | "data"

export interface CrmOpcaoCampo {
  id?: string      // selecao
  rotulo?: string  // selecao
  min?: number     // numero (faixa)
  pontos: number
}

export interface CrmCampo {
  id: string
  nome: string
  tipo: TipoCampo
  opcoes: CrmOpcaoCampo[]
  pontos_sim: number
  funis: string[]
  ajuda: string | null
  ordem: number
  ativo: boolean
}

export const TIPOS_CAMPO: { valor: TipoCampo; rotulo: string }[] = [
  { valor: "selecao", rotulo: "Lista de opções" },
  { valor: "sim_nao", rotulo: "Sim / Não" },
  { valor: "numero", rotulo: "Número" },
  { valor: "texto", rotulo: "Texto livre" },
  { valor: "data", rotulo: "Data" },
]

export interface CrmConfig {
  vendedor_ve_todos: boolean
  vendedor_edita_todos: boolean
  motivo_perda_obrigatorio: boolean
  dias_alerta_parado: number
  score_morno: number
  score_quente: number
}

export interface CrmUsuario {
  id: string
  nome: string
}

export interface CrmLead {
  id: string
  funil_id: string
  etapa_id: string
  cliente_id: string | null
  titulo: string
  contato_nome: string | null
  telefone: string | null
  email: string | null
  cidade: string | null
  uf: string | null
  origem_id: string | null
  cultura: string | null
  area_m2: number | null
  valor_estimado: number
  vendedor_id: string
  status: StatusLead
  motivo_perda_id: string | null
  motivo_perda_obs: string | null
  orcamento_ganho_id: string | null
  valor_fechado: number | null
  ganho_em: string | null
  perdido_em: string | null
  etapa_desde: string
  proxima_acao_em: string | null
  observacoes: string | null
  ordem: number
  criado_em: string
  atualizado_em: string
  campos: Record<string, unknown>
  score: number
  // calculados na leitura
  cliente_nome?: string | null
  qtd_orcamentos?: number
  maior_orcamento?: number
  tarefas_abertas?: number
  tarefa_atrasada?: boolean
}

export interface CrmCliente {
  id: string
  nome: string
  tipo_documento: "CNPJ" | "CPF" | null
  documento: string | null
  telefone: string | null
  email: string | null
  cidade_uf: string | null
  endereco: string | null
  contato: string | null
  contato_telefone: string | null
  nome_fantasia: string | null
}

export interface CrmOrcamentoResumo {
  id: string
  numero_pedido: string | null
  status: string
  valor_total: number
  criado_em: string
  largura?: number | null
  comprimento?: number | null
  faltam_para_proposta?: string[]
  proposta?: { id: string; status: string; criado_em: string } | null
}

export interface CrmAtividade {
  id: string
  lead_id: string
  tipo: string
  descricao: string
  usuario_id: string | null
  criado_em: string
}

export interface CrmTarefa {
  id: string
  lead_id: string
  titulo: string
  vence_em: string | null
  concluida: boolean
  concluida_em: string | null
  responsavel_id: string | null
  criado_em: string
}

export interface CrmQuadro {
  funis: CrmFunil[]
  funilAtual: CrmFunil | null
  etapas: CrmEtapa[]
  leads: CrmLead[]
  usuarios: CrmUsuario[]
  origens: CrmItemLista[]
  motivos: CrmItemLista[]
  campos: CrmCampo[]
  contagemFunis: Record<string, number>
  config: CrmConfig
  isAdmin: boolean
  userId: string
  erro?: string
}

export interface CrmFichaLead {
  lead: CrmLead
  cliente: CrmCliente | null
  orcamentos: CrmOrcamentoResumo[]
  atividades: CrmAtividade[]
  tarefas: CrmTarefa[]
  podeEditar: boolean
}

export const CONFIG_PADRAO: CrmConfig = {
  vendedor_ve_todos: false,
  vendedor_edita_todos: false,
  motivo_perda_obrigatorio: true,
  dias_alerta_parado: 7,
  score_morno: 30,
  score_quente: 60,
}

/** Data de hoje (AAAA-MM-DD) no horário de Brasília — evita "virar o dia" às 21h por causa do UTC */
export function hojeISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date())
}

// ---------------------------------------------------------------------
// Score (lead quente / frio)
// ---------------------------------------------------------------------

function numeroBR(v: unknown): number {
  let s = String(v ?? "").trim()
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".")
  return Number(s)
}

/** Pontos que um campo dá para o valor preenchido */
export function pontosDoCampo(campo: CrmCampo, valor: unknown): number {
  if (valor === null || valor === undefined || valor === "") return 0
  switch (campo.tipo) {
    case "sim_nao":
      return valor === "sim" ? Number(campo.pontos_sim) || 0 : 0
    case "selecao":
      return Number(campo.opcoes.find(o => o.id === valor)?.pontos) || 0
    case "numero": {
      const n = numeroBR(valor)
      if (!Number.isFinite(n)) return 0
      let pts = 0
      let melhor = -Infinity
      for (const f of campo.opcoes) {
        const min = Number(f.min) || 0
        if (n >= min && min >= melhor) { melhor = min; pts = Number(f.pontos) || 0 }
      }
      return pts
    }
    default:
      return 0
  }
}

/** Maior pontuação possível de um campo */
export function pontosMaximos(campo: CrmCampo): number {
  if (campo.tipo === "sim_nao") return Math.max(0, Number(campo.pontos_sim) || 0)
  if (campo.tipo === "selecao" || campo.tipo === "numero")
    return Math.max(0, ...campo.opcoes.map(o => Number(o.pontos) || 0))
  return 0
}

export function calcularScore(campos: CrmCampo[], valores: Record<string, unknown> | null | undefined) {
  let total = 0
  for (const c of campos) if (c.ativo) total += pontosDoCampo(c, valores?.[c.id])
  return total
}

export type Temperatura = "frio" | "morno" | "quente"

export function temperatura(score: number, cfg: Pick<CrmConfig, "score_morno" | "score_quente">): Temperatura {
  if (score >= cfg.score_quente) return "quente"
  if (score >= cfg.score_morno) return "morno"
  return "frio"
}

export const TEMPERATURA_INFO: Record<Temperatura, { rotulo: string; classe: string; cor: string }> = {
  frio: { rotulo: "Frio", classe: "bg-sky-50 text-sky-700 ring-sky-200", cor: "#0ea5e9" },
  morno: { rotulo: "Morno", classe: "bg-amber-50 text-amber-700 ring-amber-200", cor: "#f59e0b" },
  quente: { rotulo: "Quente", classe: "bg-red-50 text-red-700 ring-red-200", cor: "#ef4444" },
}

/** O campo aparece neste funil? (lista vazia = todos) */
export function campoNoFunil(c: CrmCampo, funilId: string) {
  return !c.funis?.length || c.funis.includes(funilId)
}

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]

export const TIPOS_ATIVIDADE: { valor: string; rotulo: string }[] = [
  { valor: "nota", rotulo: "Nota" },
  { valor: "ligacao", rotulo: "Ligação" },
  { valor: "whatsapp", rotulo: "WhatsApp" },
  { valor: "visita", rotulo: "Visita" },
  { valor: "email", rotulo: "E-mail" },
]
