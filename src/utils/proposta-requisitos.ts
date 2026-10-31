// Campos que não são pedidos na criação do orçamento, mas são obrigatórios
// para gerar a proposta comercial (preenchidos em "Detalhes Comerciais & Logística").
// Usado tanto no popup de aviso (clique do botão) quanto na trava da página /proposta.
export const CAMPOS_OBRIGATORIOS_PROPOSTA: { campo: string; label: string }[] = [
  { campo: "cultura", label: "Cultura / Uso da Estufa" },
  { campo: "endereco_entrega", label: "Endereço de Entrega" },
  { campo: "forma_pagamento", label: "Forma de Pagamento" },
  { campo: "prazo_entrega", label: "Prazo de Entrega" },
]

// Campos do cadastro do CLIENTE (tabela clientes) que também precisam estar
// preenchidos para gerar a proposta.
export const CAMPOS_OBRIGATORIOS_CLIENTE: { campo: string; label: string }[] = [
  { campo: "telefone", label: "Telefone / WhatsApp do Cliente" },
  { campo: "documento", label: "CPF / CNPJ do Cliente" },
  { campo: "cidade_uf", label: "Cidade / UF do Cliente" },
  { campo: "endereco", label: "Endereço do Cliente" },
]

export function getCamposFaltando(orcamento: any) {
  const faltandoOrcamento = CAMPOS_OBRIGATORIOS_PROPOSTA.filter(
    ({ campo }) => !orcamento?.[campo] || String(orcamento[campo]).trim() === ""
  )

  const cliente = orcamento?.clientes || {}
  const faltandoCliente = CAMPOS_OBRIGATORIOS_CLIENTE.filter(
    ({ campo }) => !cliente?.[campo] || String(cliente[campo]).trim() === ""
  )

  return [...faltandoCliente, ...faltandoOrcamento]
}
