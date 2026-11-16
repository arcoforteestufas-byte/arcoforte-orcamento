// Tipos do módulo de Entregas (logística)

export type StatusViagem = "planejada" | "em_rota" | "concluida" | "cancelada"
export type StatusEntrega = "a_programar" | "programada" | "em_rota" | "entregue" | "cancelada"

export interface EntTransportadora {
  id: string
  nome: string
  documento: string | null
  telefone: string | null
  contato: string | null
  email: string | null
  observacoes: string | null
  ativo: boolean
}

export interface EntVeiculo {
  id: string
  placa: string
  descricao: string | null
  proprio: boolean
  transportadora_id: string | null
  capacidade_kg: number | null
  cor: string
  ativo: boolean
  observacoes: string | null
}

export interface EntMotorista {
  id: string
  nome: string
  telefone: string | null
  cnh: string | null
  cnh_validade: string | null
  transportadora_id: string | null
  ativo: boolean
  observacoes: string | null
}

export interface EntViagem {
  id: string
  titulo: string | null
  veiculo_id: string | null
  motorista_id: string | null
  transportadora_id: string | null
  terceirizada: boolean
  saida_prevista: string
  retorno_previsto: string | null
  saida_real: string | null
  retorno_real: string | null
  status: StatusViagem
  custo_frete: number | null
  observacoes: string | null
  token_motorista: string
  ultima_lat: number | null
  ultima_lng: number | null
  ultima_posicao_em: string | null
  criado_em: string
}

export interface EntEntrega {
  id: string
  viagem_id: string | null
  ordem: number
  cliente_id: string | null
  lead_id: string | null
  orcamento_id: string | null
  destinatario: string
  telefone: string | null
  endereco: string | null
  cidade: string | null
  uf: string | null
  lat: number | null
  lng: number | null
  chegada_prevista: string | null
  entregue_em: string | null
  status: StatusEntrega
  peso_kg: number | null
  descricao_carga: string | null
  observacoes: string | null
  obs_motorista: string | null
  solicitado_por: string | null
  criado_em: string
}

export interface EntCadastros {
  transportadoras: EntTransportadora[]
  veiculos: EntVeiculo[]
  motoristas: EntMotorista[]
}

export interface EntPainel extends EntCadastros {
  viagens: EntViagem[]
  entregas: EntEntrega[]
  usuarios: { id: string; nome: string }[]
  podeGerenciar: boolean
  userId: string
  erro?: string
}

export const STATUS_VIAGEM: Record<StatusViagem, { rotulo: string; classe: string }> = {
  planejada: { rotulo: "Planejada", classe: "bg-slate-100 text-slate-700 ring-slate-200" },
  em_rota: { rotulo: "Em rota", classe: "bg-blue-50 text-blue-700 ring-blue-200" },
  concluida: { rotulo: "Concluída", classe: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  cancelada: { rotulo: "Cancelada", classe: "bg-red-50 text-red-700 ring-red-200" },
}

export const STATUS_ENTREGA: Record<StatusEntrega, { rotulo: string; classe: string; cor: string }> = {
  a_programar: { rotulo: "A programar", classe: "bg-amber-50 text-amber-800 ring-amber-200", cor: "#f59e0b" },
  programada: { rotulo: "Programada", classe: "bg-slate-100 text-slate-700 ring-slate-200", cor: "#64748b" },
  em_rota: { rotulo: "Em rota", classe: "bg-blue-50 text-blue-700 ring-blue-200", cor: "#2563eb" },
  entregue: { rotulo: "Entregue", classe: "bg-emerald-50 text-emerald-700 ring-emerald-200", cor: "#16a34a" },
  cancelada: { rotulo: "Cancelada", classe: "bg-red-50 text-red-700 ring-red-200", cor: "#dc2626" },
}

/** Posição "ao vivo" é considerada atual se chegou nos últimos 15 minutos */
export function posicaoRecente(iso: string | null | undefined) {
  return !!iso && Date.now() - new Date(iso).getTime() < 15 * 60 * 1000
}
