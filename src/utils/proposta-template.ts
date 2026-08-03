import { ItemOrcamento } from "./engine"
import { agruparItensOrcamento } from "./pdf-generator"

export const PROPOSTA_TEMPLATE_BASE = `
# PROPOSTA COMERCIAL

**Para:** {{CLIENTE_NOME}}
**Documento:** {{CLIENTE_DOCUMENTO}}
**Local:** {{CLIENTE_CIDADE}}

**Orçamento Nº:** {{ORCAMENTO_ID}}
**Data de Emissão:** {{DATA_EMISSAO}}
**Validade:** {{DATA_VALIDADE}}

---

## 1. Apresentação

A **ArcoForte** agradece a oportunidade de apresentar nossa proposta comercial para o fornecimento de materiais e estruturas de estufas agrícolas. Temos o compromisso de entregar produtos de alta qualidade, garantindo a melhor relação custo-benefício para o seu projeto.

## 2. Escopo do Fornecimento

Os materiais orçados são detalhados a seguir:

{{TABELA_ITENS}}

## 3. Resumo Financeiro

- **Subtotal dos Itens:** {{SUBTOTAL}}
- **Desconto:** {{DESCONTO}}
- **Frete:** {{FRETE}}
- **Outras Despesas:** {{OUTRAS_DESPESAS}}

### **TOTAL LÍQUIDO: {{VALOR_TOTAL}}**

## 4. Condições Comerciais e Logística

- **Forma de Pagamento:** {{FORMA_PAGAMENTO}}
- **Tipo de Frete:** {{TIPO_FRETE}}
- **Endereço de Entrega:** {{ENDERECO_ENTREGA}}

## 5. Garantia e Observações

1. Os produtos possuem garantia contra defeitos de fabricação de acordo com as normas vigentes.
2. Esta proposta está sujeita a alterações de preços após o período de validade.
3. Quaisquer modificações no escopo solicitado poderão implicar em revisão de valores e prazos.

{{DESCRICAO_PROPOSTA}}

---
<br/>
<br/>
<div style="display: flex; justify-content: space-between; margin-top: 50px;">
  <div style="border-top: 1px solid #000; width: 45%; text-align: center; padding-top: 5px;">
    Vendedor (ArcoForte)
  </div>
  <div style="border-top: 1px solid #000; width: 45%; text-align: center; padding-top: 5px;">
    Assinatura do Cliente<br/>
    <span style="font-size: 12px">Local e Data: ___________________, ____/____/______</span>
  </div>
</div>
`

export function gerarTextoProposta(orcamento: any, itens: ItemOrcamento[]): string {
  let texto = PROPOSTA_TEMPLATE_BASE

  const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    // ensure date parses correctly if it's iso string
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString('pt-BR')
    } catch {
      return dateStr
    }
  }

  // Tabela de itens (Markdown)
  const itensAgrupados = agruparItensOrcamento(itens)
  let tabelaMarkdown = `| Item | Descrição | Qtd | Unitário | Total |\n|---|---|:---:|---:|---:|\n`
  
  for (const item of itensAgrupados) {
    const nome = item.produto_descricao.replace(/\|/g, '') // remove pipes to not break md table
    const qtd = `${item.quantidade_final} ${item.unidade}`
    const unit = formatadorMoeda.format(item.preco_unitario || 0)
    const total = formatadorMoeda.format(item.valor_total || 0)
    tabelaMarkdown += `| ${item.produto_codigo} | ${nome} | ${qtd} | ${unit} | ${total} |\n`
  }

  const dataValidade = orcamento.data_validade 
    ? formatDate(orcamento.data_validade + 'T00:00:00')
    : 'Não informada'

  const subtotal = orcamento.valor_total || 0
  const desconto = Number(orcamento.desconto) || 0
  const frete = Number(orcamento.frete) || 0
  const outrasDespesas = Number(orcamento.outras_despesas) || 0
  const totalLiquido = subtotal - desconto + frete + outrasDespesas

  // Substituições
  texto = texto.replace('{{CLIENTE_NOME}}', orcamento.clientes?.nome || 'Não informado')
  texto = texto.replace('{{CLIENTE_DOCUMENTO}}', orcamento.clientes?.documento || 'Não informado')
  texto = texto.replace('{{CLIENTE_CIDADE}}', orcamento.clientes?.cidade_uf || 'Não informada')
  
  texto = texto.replace('{{ORCAMENTO_ID}}', orcamento.id ? orcamento.id.split('-')[0].toUpperCase() : '-')
  texto = texto.replace('{{DATA_EMISSAO}}', formatDate(orcamento.criado_em))
  texto = texto.replace('{{DATA_VALIDADE}}', dataValidade)
  
  texto = texto.replace('{{TABELA_ITENS}}', tabelaMarkdown)
  
  texto = texto.replace('{{SUBTOTAL}}', formatadorMoeda.format(subtotal))
  texto = texto.replace('{{DESCONTO}}', formatadorMoeda.format(desconto))
  texto = texto.replace('{{FRETE}}', formatadorMoeda.format(frete))
  texto = texto.replace('{{OUTRAS_DESPESAS}}', formatadorMoeda.format(outrasDespesas))
  texto = texto.replace('{{VALOR_TOTAL}}', formatadorMoeda.format(totalLiquido))

  texto = texto.replace('{{FORMA_PAGAMENTO}}', orcamento.forma_pagamento || 'A combinar')
  texto = texto.replace('{{TIPO_FRETE}}', orcamento.tipo_frete || 'A combinar')
  texto = texto.replace('{{ENDERECO_ENTREGA}}', orcamento.endereco_entrega || 'A combinar')

  const descProposta = orcamento.descricao_proposta 
    ? `\n## Observações da Proposta\n\n${orcamento.descricao_proposta}\n`
    : ''
  texto = texto.replace('{{DESCRICAO_PROPOSTA}}', descProposta)

  return texto
}
