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
  // frete próprio do veículo (vazio = tabela geral)
  frete_valor_km: number | null
  frete_valor_kg: number | null
  frete_minimo: number | null
  /** tabela de frete que o veículo usa (vazio = tabela geral) */
  tabela_frete_id?: string | null
}

/** Tabela de frete extra (a "Tabela geral" fica em EntConfig) */
export interface EntTabelaFrete {
  id: string
  nome: string
  valor_km: number
  cobrar_volta: boolean
  valor_kg: number
  minimo: number
  desconto_viagem: number
  observacao: string | null
  ativo: boolean
  ordem: number
}

/** Veículo como opção na calculadora de frete */
export type VeiculoFrete = Pick<EntVeiculo, "id" | "placa" | "descricao" | "capacidade_kg" | "frete_valor_km" | "frete_valor_kg" | "frete_minimo" | "proprio" | "tabela_frete_id">

export function nomeVeiculo(v: Pick<EntVeiculo, "placa" | "descricao">) {
  return v.descricao ? `${v.descricao} (${v.placa})` : v.placa
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
  foto_url: string | null
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
  distancia_ida_km: number | null
  distancia_total_km: number | null
  duracao_total_min: number | null
  trechos: number[] | null
  rota: [number, number][] | null
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
  cidade_ibge: number | null
  distancia_km: number | null
  distancia_estimada: boolean
}

export interface EntConfig {
  origem_nome: string
  origem_uf: string
  origem_ibge: number | null
  origem_lat: number
  origem_lng: number
  // tabela de frete
  frete_valor_km: number
  frete_cobrar_volta: boolean
  frete_valor_kg: number
  frete_minimo: number
  frete_desconto_viagem: number
  frete_observacao: string | null
}

export const CONFIG_ENT_PADRAO: EntConfig = {
  origem_nome: "Anápolis", origem_uf: "GO", origem_ibge: 5201108, origem_lat: -16.3281, origem_lng: -48.953,
  frete_valor_km: 6.5, frete_cobrar_volta: true, frete_valor_kg: 0, frete_minimo: 0, frete_desconto_viagem: 30, frete_observacao: null,
}

/** Resultado do cálculo de frete */
export interface CalculoFrete {
  origem: string
  destino: string
  kmIda: number
  kmCobrados: number
  minutos: number
  estimada: boolean          // true = sem serviço de rota (linha reta × 1,3)
  pesoKg: number
  valorKm: number            // km cobrados × R$/km
  valorPeso: number          // peso × R$/kg
  desconto: number           // R$ de desconto por aproveitar viagem
  minimoAplicado: boolean
  valor: number              // valor final sugerido
  descricao: string          // texto para o campo "Tipo de frete" do orçamento
  tabela: Pick<EntConfig, "frete_valor_km" | "frete_cobrar_volta" | "frete_valor_kg" | "frete_minimo" | "frete_desconto_viagem">
  veiculo: { id: string; nome: string; capacidade_kg: number | null; valorProprio: boolean } | null
  /** tabela usada no cálculo (id null = tabela geral) */
  tabelaUsada: { id: string | null; nome: string }
  acimaCapacidade: boolean   // peso maior que a capacidade do veículo escolhido
}

/** Entrega do lead, com os dados da viagem para mostrar no CRM */
export interface EntregaDoLead extends EntEntrega {
  viagem: Pick<EntViagem, "id" | "titulo" | "status" | "saida_prevista" | "retorno_previsto" | "ultima_posicao_em"> | null
  veiculo: string | null
  motorista: string | null
}

/** Lead ganho (venda fechada) para a logística programar a entrega */
export interface VendaFechada {
  id: string
  titulo: string
  cliente: string | null
  cidade: string | null
  uf: string | null
  valor: number | null
  ganho_em: string | null
  vendedor: string | null
  /** prazo de entrega contratual (multa se atrasar) */
  prazo_entrega: string | null
  entregas: { id: string; status: StatusEntrega; viagem_id: string | null; chegada_prevista: string | null; entregue_em: string | null }[]
}

// ---------------------------------------------------------------------
// Prazo de entrega contratual (multa se atrasar)
// ---------------------------------------------------------------------

/** Faltando esta quantidade de dias (ou menos) sem viagem marcada, a venda entra em risco */
export const ALERTA_PRAZO_DIAS = 7

export type RiscoPrazo = "atrasada" | "depois_prazo" | "risco" | "sem_prazo" | "ok" | "entregue_prazo" | "entregue_atraso"

export const RISCO_PRAZO: Record<RiscoPrazo, { rotulo: string; dica: string; classe: string; pendente: boolean }> = {
  atrasada: { rotulo: "Atrasadas", dica: "O prazo do contrato já passou e não foi entregue", classe: "bg-red-600 text-white ring-red-600", pendente: true },
  depois_prazo: { rotulo: "Marcadas depois do prazo", dica: "A viagem programada chega depois do prazo do contrato", classe: "bg-red-50 text-red-700 ring-red-300", pendente: true },
  risco: { rotulo: "Em risco", dica: `Faltam ${ALERTA_PRAZO_DIAS} dias ou menos e ainda não tem viagem marcada`, classe: "bg-amber-100 text-amber-900 ring-amber-300", pendente: true },
  sem_prazo: { rotulo: "Sem prazo", dica: "Venda fechada sem prazo de entrega no lead", classe: "bg-slate-100 text-slate-700 ring-slate-300", pendente: true },
  ok: { rotulo: "No prazo", dica: "Ainda com folga ou viagem marcada antes do prazo", classe: "bg-emerald-50 text-emerald-800 ring-emerald-200", pendente: true },
  entregue_prazo: { rotulo: "Entregue no prazo", dica: "", classe: "bg-emerald-50 text-emerald-700 ring-emerald-200", pendente: false },
  entregue_atraso: { rotulo: "Entregue com atraso", dica: "", classe: "bg-red-50 text-red-700 ring-red-200", pendente: false },
}

export function diasEntre(de: string, ate: string) {
  return Math.round((new Date(ate.slice(0, 10) + "T12:00:00").getTime() - new Date(de.slice(0, 10) + "T12:00:00").getTime()) / 86400000)
}

/**
 * Situação do prazo contratual de uma venda.
 * `dataPrevista(e)` devolve quando a entrega chega (chegada prevista ou datas da viagem).
 */
export function classificarPrazo<E extends { status: StatusEntrega; viagem_id: string | null; entregue_em: string | null }>(
  prazo: string | null,
  entregas: E[],
  dataPrevista: (e: E) => string | null | undefined,
  hoje: string,
): { risco: RiscoPrazo; dias: number | null } {
  const entregue = entregas.find(e => e.status === "entregue")
  if (entregue) {
    if (!prazo || !entregue.entregue_em) return { risco: "entregue_prazo", dias: null }
    const atraso = diasEntre(prazo, entregue.entregue_em)
    return { risco: atraso > 0 ? "entregue_atraso" : "entregue_prazo", dias: atraso }
  }
  if (!prazo) return { risco: "sem_prazo", dias: null }
  const falta = diasEntre(hoje, prazo)
  if (falta < 0) return { risco: "atrasada", dias: falta }
  const ativas = entregas.filter(e => e.status !== "cancelada")
  const comViagem = ativas.filter(e => e.viagem_id)
  if (comViagem.some(e => { const d = dataPrevista(e); return !!d && d.slice(0, 10) > prazo })) return { risco: "depois_prazo", dias: falta }
  if (falta <= ALERTA_PRAZO_DIAS && !comViagem.length) return { risco: "risco", dias: falta }
  return { risco: "ok", dias: falta }
}

/** Contagem para os alertas (menu e painel) */
export interface ResumoPrazos {
  atrasada: number
  depois_prazo: number
  risco: number
  sem_prazo: number
  /** vendas mais urgentes, para a lista do alerta */
  urgentes: { id: string; titulo: string; cliente: string | null; cidade: string | null; uf: string | null; prazo: string | null; risco: RiscoPrazo; dias: number | null }[]
}

/** Alteração do prazo contratual (pedido do cliente ou da empresa) */
export interface PrazoAlteracao {
  id: string
  lead_id: string
  prazo_anterior: string | null
  prazo_novo: string
  pedido_por: "cliente" | "empresa"
  motivo: string
  anexo_nome: string | null
  tem_anexo: boolean
  criado_por: string | null
  criado_por_nome: string | null
  criado_em: string
}

/** Lead com os pedidos dele, para ligar uma entrega avulsa ao pedido */
export interface PedidoDoLeadOpcao {
  id: string
  titulo: string
  ganho: boolean
  cliente: string | null
  cidade: string | null
  uf: string | null
  /** entregas não canceladas já ligadas a este lead */
  entregasAtivas: string[]
  pedidos: { id: string; numero: string; valor: number; status: string }[]
}

export type CidadeOpcao = { ibge: number; nome: string; uf: string; lat: number; lng: number }

export interface EntCadastros {
  transportadoras: EntTransportadora[]
  veiculos: EntVeiculo[]
  motoristas: EntMotorista[]
}

export interface EntPainel extends EntCadastros {
  tabelasFrete: EntTabelaFrete[]
  viagens: EntViagem[]
  entregas: EntEntrega[]
  usuarios: { id: string; nome: string }[]
  config: EntConfig
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

export const NOMES_UF: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal",
  ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
}

export function formatarKm(km: number | null | undefined) {
  if (km == null) return ""
  return `${Math.round(Number(km)).toLocaleString("pt-BR")} km`
}

export function formatarDuracao(min: number | null | undefined) {
  if (!min) return ""
  const h = Math.floor(min / 60), m = min % 60
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`
}
