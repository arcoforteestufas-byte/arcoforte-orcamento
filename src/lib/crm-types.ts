// Tipos do CRM (funil de vendas) — usados pelo servidor e pelas telas.

export type TipoEtapa = "aberta" | "ganho" | "perdido"
export type StatusLead = "aberto" | "ganho" | "perdido"

export interface CrmFunil {
  id: string
  nome: string
  ordem: number
  ativo: boolean
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

export interface CrmConfig {
  vendedor_ve_todos: boolean
  vendedor_edita_todos: boolean
  motivo_perda_obrigatorio: boolean
  dias_alerta_parado: number
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
  // calculados na leitura
  cliente_nome?: string | null
  qtd_orcamentos?: number
  maior_orcamento?: number
  tarefas_abertas?: number
  tarefa_atrasada?: boolean
}

export interface CrmOrcamentoResumo {
  id: string
  numero_pedido: string | null
  status: string
  valor_total: number
  criado_em: string
  largura?: number | null
  comprimento?: number | null
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
  config: CrmConfig
  isAdmin: boolean
  userId: string
  erro?: string
}

export interface CrmFichaLead {
  lead: CrmLead
  orcamentos: CrmOrcamentoResumo[]
  atividades: CrmAtividade[]
  tarefas: CrmTarefa[]
}

export const CONFIG_PADRAO: CrmConfig = {
  vendedor_ve_todos: false,
  vendedor_edita_todos: false,
  motivo_perda_obrigatorio: true,
  dias_alerta_parado: 7,
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
