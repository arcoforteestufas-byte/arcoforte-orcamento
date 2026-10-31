// Constrói o conjunto "achatado" (flat) de variáveis usadas para preencher o
// modelo Word (.docx) da proposta. As chaves aqui são exatamente os nomes das
// tags que devem ser escritas no arquivo .docx, entre chaves simples: {nome_da_tag}
//
// Para a lista de materiais (tabela de itens), o Word usa um loop:
//   {#itens} ... {codigo} {descricao} {quantidade} {unitario} {total} ... {/itens}
// dentro de uma linha de tabela — o docxtemplater repete essa linha pra cada item.

export interface VariaveisDocx {
  numero_pedido: string
  data_emissao: string
  data_validade: string
  vendedor_nome: string
  vendedor_telefone: string
  cliente_nome: string
  cliente_documento: string
  cliente_telefone: string
  cliente_email: string
  cliente_endereco: string
  cliente_cidade: string
  cliente_contato: string
  cultura: string
  largura_total: string
  comprimento_total: string
  altura_lateral: string
  altura_central: string
  area_total: string
  modulos: string
  arco_calandrado: string
  colunas_extremidades: string
  colunas_central: string
  filme_cobertura: string
  fechamento_lateral: string
  porta_acesso: string
  laterais: string
  central_calha: string
  travas_internas: string
  travas_externas: string
  travamento_frontal: string
  valor_estrutura: string
  frete: string
  valor_total: string
  prazo_entrega: string
  forma_pagamento: string
  itens: { codigo: string; descricao: string; quantidade: string; unitario: string; total: string }[]
}

// Descrição de cada tag, pra mostrar como referência na tela de Configurações.
export const DESCRICAO_VARIAVEIS_DOCX: { tag: string; descricao: string }[] = [
  { tag: 'numero_pedido', descricao: 'Número do pedido/proposta' },
  { tag: 'data_emissao', descricao: 'Data de emissão (DD/MM/AAAA)' },
  { tag: 'data_validade', descricao: 'Data de validade da proposta' },
  { tag: 'vendedor_nome', descricao: 'Nome do vendedor' },
  { tag: 'vendedor_telefone', descricao: 'Telefone do vendedor' },
  { tag: 'cliente_nome', descricao: 'Nome/Razão Social do cliente' },
  { tag: 'cliente_documento', descricao: 'CPF/CNPJ do cliente' },
  { tag: 'cliente_telefone', descricao: 'Telefone do cliente' },
  { tag: 'cliente_email', descricao: 'Email do cliente' },
  { tag: 'cliente_endereco', descricao: 'Endereço do cliente' },
  { tag: 'cliente_cidade', descricao: 'Cidade/UF do cliente' },
  { tag: 'cliente_contato', descricao: 'Pessoa de contato do cliente' },
  { tag: 'cultura', descricao: 'Cultura / uso da estufa' },
  { tag: 'largura_total', descricao: 'Largura total (m)' },
  { tag: 'comprimento_total', descricao: 'Comprimento total (m)' },
  { tag: 'altura_lateral', descricao: 'Altura lateral / pé-direito (m)' },
  { tag: 'altura_central', descricao: 'Altura central / do arco (m)' },
  { tag: 'area_total', descricao: 'Área total (m²)' },
  { tag: 'modulos', descricao: 'Número de módulos' },
  { tag: 'arco_calandrado', descricao: 'Especificação dos arcos' },
  { tag: 'colunas_extremidades', descricao: 'Especificação das colunas de extremidade' },
  { tag: 'colunas_central', descricao: 'Especificação das colunas centrais' },
  { tag: 'filme_cobertura', descricao: 'Especificação do filme de cobertura' },
  { tag: 'fechamento_lateral', descricao: 'Especificação do fechamento lateral' },
  { tag: 'porta_acesso', descricao: 'Especificação da porta de acesso' },
  { tag: 'laterais', descricao: 'Especificação das laterais' },
  { tag: 'central_calha', descricao: 'Especificação da calha central' },
  { tag: 'travas_internas', descricao: 'Especificação das travas internas' },
  { tag: 'travas_externas', descricao: 'Especificação das travas externas' },
  { tag: 'travamento_frontal', descricao: 'Especificação do travamento frontal' },
  { tag: 'valor_estrutura', descricao: 'Valor da estrutura (sem frete), formatado em R$' },
  { tag: 'frete', descricao: 'Valor do frete, formatado em R$ (ou "INCLUSO")' },
  { tag: 'valor_total', descricao: 'Valor total da proposta, formatado em R$' },
  { tag: 'prazo_entrega', descricao: 'Prazo de entrega (dias)' },
  { tag: 'forma_pagamento', descricao: 'Forma de pagamento' },
]

export function construirVariaveisDocx(formData: any, itensFormatados: any[], formatCurrency: (v: any) => string): VariaveisDocx {
  return {
    numero_pedido: formData.orcamentoId || '',
    data_emissao: formData.dataEmissao || '',
    data_validade: formData.dataValidade || '',
    vendedor_nome: formData.vendedorNome || '',
    vendedor_telefone: formData.vendedorTelefone || '',
    cliente_nome: formData.clienteNome || '',
    cliente_documento: formData.clienteDocumento || '',
    cliente_telefone: formData.clienteTelefone || '',
    cliente_email: formData.clienteEmail || '',
    cliente_endereco: formData.clienteEndereco || '',
    cliente_cidade: formData.clienteCidade || '',
    cliente_contato: formData.clienteContato || '',
    cultura: formData.cultura || '',
    largura_total: formData.larguraTotal || '',
    comprimento_total: formData.comprimentoTotal || '',
    altura_lateral: formData.alturaLateral || '',
    altura_central: formData.alturaCentral || '',
    area_total: formData.areaTotal || '',
    modulos: formData.modulos || '',
    arco_calandrado: (formData.arcoCalandrado || '').toUpperCase(),
    colunas_extremidades: (formData.colunasExtremidades || '').toUpperCase(),
    colunas_central: (formData.colunasCentral || '').toUpperCase(),
    filme_cobertura: (formData.filmeCobertura || '').toUpperCase(),
    fechamento_lateral: (formData.fechamentoLateral || '').toUpperCase(),
    porta_acesso: (formData.portaAcesso || '').toUpperCase(),
    laterais: (formData.lateralTubo || '').toUpperCase(),
    central_calha: (formData.centralCalha || '').toUpperCase(),
    travas_internas: (formData.travasInternas || '').toUpperCase(),
    travas_externas: (formData.travasExternas || '').toUpperCase(),
    travamento_frontal: 'TUBO RETANGULAR 50/30',
    valor_estrutura: formatCurrency(formData.valorEstrutura ?? formData.valorTotal),
    frete: isNaN(Number(formData.frete)) ? (formData.frete || '') : formatCurrency(formData.frete),
    valor_total: formatCurrency(formData.valorTotal),
    prazo_entrega: formData.prazoEntrega || '',
    forma_pagamento: formData.variantePagamento === 'B' ? 'À vista PIX' : 'Parcelado + FINAME',
    itens: (itensFormatados || []).map((i: any) => ({
      codigo: i.codigo || i.produto_codigo || '',
      descricao: i.nome || i.produto_descricao || '',
      quantidade: String(i.qtd ?? `${i.quantidade_final ?? ''} ${i.unidade ?? ''}`.trim()),
      unitario: i.unitStr || formatCurrency(i.preco_unitario),
      total: i.totalStr || formatCurrency(i.valor_total),
    })),
  }
}
