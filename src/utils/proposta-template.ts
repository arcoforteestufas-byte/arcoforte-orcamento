import { ItemOrcamento } from "./engine"
import { agruparItensOrcamento } from "./pdf-generator"
import { TEXTOS_PROPOSTA } from "@/config/proposta-template"

export function resolverDadosProposta(orcamento: any, itens: ItemOrcamento[], topicos: any[] = [], configuracoes?: any) {
  const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString('pt-BR')
    } catch {
      return dateStr
    }
  }

  const orcamentoId = orcamento.id ? orcamento.id.split('-')[0].toUpperCase() : 'AVULSO'
  const dataEmissao = formatDate(orcamento.criado_em || new Date().toISOString())
  const dataValidade = orcamento.data_validade ? formatDate(orcamento.data_validade + 'T00:00:00') : 'Não informada'
  
  const clienteNome = orcamento.clientes?.nome || '[Nome do Cliente]'
  const clienteDoc = orcamento.clientes?.documento || '[CPF/CNPJ]'
  const clienteCidade = orcamento.clientes?.cidade_uf || '[Cidade/UF]'
  const clienteContato = orcamento.clientes?.contato || '**'

  const vendedorNome = orcamento.usuarios?.nome || '**'
  const vendedorTelefone = orcamento.usuarios?.telefone || '**'

  const params = orcamento.parametros_estufa?.[0] || {}
  const cultura = params.cultura || '**'
  const comprimento = Number(params.comprimento_total) || 0
  const largura = Number(params.largura_total) || 0
  const alturaLateral = Number(params.pe_direito) || 0
  
  const aberturaFicha = TEXTOS_PROPOSTA.gerarAberturaFichaTecnica(cultura, comprimento, largura, alturaLateral)

  const profundidade = params.tipo_pilar === 'concreto' ? '40 cm' : '25 cm'
  const alturaArco = params.altura_arco || '**'
  const tipoLateralText = params.tipo_lateral === 'calha' ? 'calha de alumínio' : (params.tipo_lateral === 'metalon' ? 'tubo retangular 50/30' : '**')
  const caracteristicasArray = TEXTOS_PROPOSTA.gerarCaracteristicas(profundidade, alturaArco, tipoLateralText)
  
  const prazoReal = orcamento.prazo_entrega || '**'
  const clausulasArray = TEXTOS_PROPOSTA.gerarClausulasFixas(prazoReal)

  const itensAgrupados = agruparItensOrcamento(itens)
  
  let materialCobertura = '**'
  let materialLateral = '**'
  let materialFrontal = '**'
  let materialMeiaLua = '**'

  const itensFormatados = itensAgrupados.map(item => {
    const nome = item.produto_descricao.replace(/\|/g, '')
    const n = nome.toLowerCase()
    
    if (n.includes('filme') && n.includes('cobertura')) materialCobertura = nome
    else if (n.includes('filme') && !materialCobertura.includes('filme')) materialCobertura = nome
    
    if (n.includes('tela') && n.includes('lateral')) materialLateral = nome
    else if (n.includes('tela') && !n.includes('topo') && materialLateral === '**') materialLateral = nome
    
    if (n.includes('frontal') || n.includes('frente')) materialFrontal = nome
    if (n.includes('meia lua') || n.includes('meialua') || n.includes('topo')) materialMeiaLua = nome

    return {
      codigo: item.produto_codigo,
      nome,
      qtd: `${item.quantidade_final} ${item.unidade}`,
      unitStr: formatadorMoeda.format(item.preco_unitario || 0),
      totalStr: formatadorMoeda.format(item.valor_total || 0),
      ...item
    }
  })

  const subtotal = orcamento.valor_total || 0
  const desconto = Number(orcamento.desconto) || 0
  const frete = Number(orcamento.frete) || 0
  const outrasDespesas = Number(orcamento.outras_despesas) || 0
  const totalLiquido = subtotal - desconto + frete + outrasDespesas

  // Construção da Tabela Frente e Fundo (Especificação Técnica)
  const buscarEspecificacao = (termo: string, defaultNotFound: string = '**') => {
    const item = itensFormatados.find(i => i.grupo_nome && i.grupo_nome.toLowerCase().includes(termo.toLowerCase()))
    return item ? item.nome : defaultNotFound
  }

  const tabelaFrenteFundo = [
    { componente: 'Arcos', especificacao: buscarEspecificacao('Arco') },
    { componente: 'Colunas extremidades', especificacao: buscarEspecificacao('extremidade') },
    { componente: 'Colunas central', especificacao: buscarEspecificacao('central') },
    { componente: 'Filme de cobertura', especificacao: buscarEspecificacao('cobertura') },
    { componente: 'Encaixes', especificacao: buscarEspecificacao('encaixe') },
    { componente: 'Fechamento lateral', especificacao: buscarEspecificacao('fechamento lateral') },
    { componente: 'Reforços/contraventos', especificacao: buscarEspecificacao('contravento') },
    { componente: 'Porta de acesso', especificacao: buscarEspecificacao('porta', 'Não haverá') },
    { componente: 'Parafusos', especificacao: buscarEspecificacao('parafuso') },
    { componente: 'Laterais', especificacao: buscarEspecificacao('lateral') },
    { componente: 'Central', especificacao: buscarEspecificacao('calha', 'Não haverá') },
    { componente: 'Molas', especificacao: buscarEspecificacao('mola') },
    { componente: 'Travas internas', especificacao: buscarEspecificacao('trava interna') },
    { componente: 'Travas externas', especificacao: buscarEspecificacao('trava externa') },
    { componente: 'Travamento frontal', especificacao: buscarEspecificacao('travamento frontal') }
  ]

  // Condicionais Extras
  const estruturaInterna = buscarEspecificacao('estrutura interna', 'NOT_FOUND')
  if (estruturaInterna !== 'NOT_FOUND') tabelaFrenteFundo.push({ componente: 'Estrutura interna', especificacao: estruturaInterna })

  const cortinaMovel = buscarEspecificacao('cortina', 'NOT_FOUND')
  if (cortinaMovel !== 'NOT_FOUND') tabelaFrenteFundo.push({ componente: 'Cortina móvel', especificacao: cortinaMovel })

  const sistemaTelado = buscarEspecificacao('telado', 'NOT_FOUND')
  if (sistemaTelado !== 'NOT_FOUND') tabelaFrenteFundo.push({ componente: 'Sistema de telado móvel', especificacao: sistemaTelado })

  const optB_trigger = 'A SER PAGO VIA PIX NA ASSINATURA'
  let variantePagamentoSelecionada = ''
  if (orcamento.forma_pagamento && orcamento.forma_pagamento.includes(optB_trigger)) {
    variantePagamentoSelecionada = TEXTOS_PROPOSTA.condicoesPagamento.varianteB.replace(/{{VALOR_TOTAL}}/g, formatadorMoeda.format(totalLiquido))
  } else {
    variantePagamentoSelecionada = TEXTOS_PROPOSTA.condicoesPagamento.varianteA
  }

  const garantiasSplit = TEXTOS_PROPOSTA.garantias.split('Excluem-se também da garantia')
  const garantiasPart = garantiasSplit[0] || ''
  const exclusoesPart = garantiasSplit[1] ? 'Excluem-se também da garantia\n' + garantiasSplit[1] : ''

  return {
    configuracoes,
    cabecalho: {
      vendedorNome,
      vendedorTelefone,
      orcamentoId,
      dataEmissao,
      dataValidade,
      clienteNome,
      clienteContato,
      clienteDoc,
      clienteCidade,
    },
    fichaTecnica: {
      titulo: aberturaFicha.titulo,
      subtitulo: aberturaFicha.subtitulo,
      texto: aberturaFicha.texto,
      textoAbaixoMedidas: TEXTOS_PROPOSTA.textoAbaixoMedidas,
      medidas: {
        largura,
        comprimento,
        peDireito: alturaLateral,
        alturaArco
      },
      tabelaFrenteFundo
    },
    caracteristicasArray,
    clausulasArray,
    responsabilidadesPartesArray: TEXTOS_PROPOSTA.responsabilidadesPartes.split('\n\n').filter((p: string) => p.trim() !== ''),
    garantiasArray: garantiasPart.split('\n\n').filter((p: string) => p.trim() !== ''),
    exclusoesGarantiaArray: exclusoesPart.split('\n\n').filter((p: string) => p.trim() !== ''),
    itensFormatados,
    financeiro: {
      subtotalStr: formatadorMoeda.format(subtotal),
      descontoStr: formatadorMoeda.format(desconto),
      freteStr: formatadorMoeda.format(frete),
      outrasDespesasStr: formatadorMoeda.format(outrasDespesas),
      totalLiquidoStr: formatadorMoeda.format(totalLiquido),
    },
    pagamento: {
      finame: TEXTOS_PROPOSTA.condicoesPagamento.finame,
      varianteSelecionada: variantePagamentoSelecionada
    },
    revestimentos: {
      cobertura: materialCobertura,
      lateral: materialLateral,
      frontal: materialFrontal,
      meiaLua: materialMeiaLua
    },
    topicos
  }
}

export function gerarTextoProposta(orcamento: any, itens: ItemOrcamento[], topicos: any[] = []): string {
  const dados = resolverDadosProposta(orcamento, itens, topicos)

  let texto = `**${TEXTOS_PROPOSTA.cabecalho}**\n\n`
  
  texto = texto.replace(/{{VENDEDOR_NOME}}/g, dados.cabecalho.vendedorNome)
  texto = texto.replace(/{{VENDEDOR_TELEFONE}}/g, dados.cabecalho.vendedorTelefone)
  texto = texto.replace(/{{ORCAMENTO_ID}}/g, dados.cabecalho.orcamentoId)
  texto = texto.replace(/{{DATA_EMISSAO}}/g, dados.cabecalho.dataEmissao)
  texto = texto.replace(/{{DATA_VALIDADE}}/g, dados.cabecalho.dataValidade)
  texto = texto.replace(/{{CLIENTE_NOME}}/g, dados.cabecalho.clienteNome)
  texto = texto.replace(/{{CLIENTE_CONTATO}}/g, dados.cabecalho.clienteContato)

  texto += `\n---\n\n`

  let stringFichaTecnica = `### ${dados.fichaTecnica.titulo}\n**${dados.fichaTecnica.subtitulo}**\n\n${dados.fichaTecnica.texto}\n\n${dados.fichaTecnica.textoAbaixoMedidas}`
  const stringCaracteristicas = dados.caracteristicasArray.join('\n\n')
  const stringClausulas = dados.clausulasArray.join('\n\n')

  let tabelaMarkdown = `| Item | Descrição | Qtd | Unitário | Total |\n|---|---|:---:|---:|---:|\n`
  for (const item of dados.itensFormatados) {
    tabelaMarkdown += `| ${item.codigo} | ${item.nome} | ${item.qtd} | ${item.unitStr} | ${item.totalStr} |\n`
  }

  let stringPagamento = `${dados.pagamento.finame}\n\n${dados.pagamento.varianteSelecionada}`

  if (dados.topicos && dados.topicos.length > 0) {
    const topicosAtivos = dados.topicos.filter(t => t.ativo !== false).sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
    for (const t of topicosAtivos) {
      if (t.titulo) texto += `## ${t.titulo}\n\n`
      let conteudoTopico = t.texto || ''
      conteudoTopico = conteudoTopico.replace(/{{FICHA_TECNICA}}/g, stringFichaTecnica)
      conteudoTopico = conteudoTopico.replace(/{{CARACTERISTICAS}}/g, stringCaracteristicas)
      conteudoTopico = conteudoTopico.replace(/{{TABELA_ITENS}}/g, tabelaMarkdown)
      conteudoTopico = conteudoTopico.replace(/{{CLAUSULAS}}/g, stringClausulas)
      conteudoTopico = conteudoTopico.replace(/{{FINAME_E_PAGAMENTO}}/g, stringPagamento)
      conteudoTopico = conteudoTopico.replace(/{{COBERTURA}}/g, dados.revestimentos.cobertura)
      conteudoTopico = conteudoTopico.replace(/{{LATERAL}}/g, dados.revestimentos.lateral)
      conteudoTopico = conteudoTopico.replace(/{{FRONTAL}}/g, dados.revestimentos.frontal)
      conteudoTopico = conteudoTopico.replace(/{{MEIA_LUA}}/g, dados.revestimentos.meiaLua)
      conteudoTopico = conteudoTopico.replace(/{{SUBTOTAL}}/g, dados.financeiro.subtotalStr)
      conteudoTopico = conteudoTopico.replace(/{{DESCONTO}}/g, dados.financeiro.descontoStr)
      conteudoTopico = conteudoTopico.replace(/{{FRETE}}/g, dados.financeiro.freteStr)
      conteudoTopico = conteudoTopico.replace(/{{OUTRAS_DESPESAS}}/g, dados.financeiro.outrasDespesasStr)
      conteudoTopico = conteudoTopico.replace(/{{VALOR_TOTAL}}/g, dados.financeiro.totalLiquidoStr)
      texto += `${conteudoTopico}\n\n`
    }
  }

  // --- Rodapé e Assinaturas Fixo ---
  texto += `---\n`
  texto += `\n**${TEXTOS_PROPOSTA.encerramento}**\n`
  texto += `<br/>\n<br/>\n`
  texto += `<div style="display: flex; justify-content: space-between; margin-top: 50px;">\n`
  texto += `  <div style="border-top: 1px solid #000; width: 45%; text-align: center; padding-top: 5px;">\n`
  texto += `    Vendedor (ArcoForte)\n`
  texto += `  </div>\n`
  texto += `  <div style="border-top: 1px solid #000; width: 45%; text-align: center; padding-top: 5px;">\n`
  texto += `    Assinatura do Cliente<br/>\n`
  texto += `    <span style="font-size: 12px">Local e Data: ___________________, ____/____/______</span>\n`
  texto += `  </div>\n`
  texto += `</div>\n`

  return texto
}
