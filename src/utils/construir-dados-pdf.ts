import { TEXTOS_PROPOSTA } from "@/config/proposta-template"

export function construirDadosJsonParaPDF(formData: any, settings: any, itensFormatados: any[] = []) {
  // Find topics or fallback to empty strings
  const getTopic = (id: string) => settings?.proposta_topicos?.find((t: any) => t.id === id) || { titulo: '', texto: '' };

  const formatCurrency = (val: string | number) => {
    let parsedValor = 0;
    if (typeof val === 'number') {
      parsedValor = val;
    } else {
      let str = String(val || '').trim();
      if (str.includes(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
      } else if (str.includes('.')) {
        const parts = str.split('.');
        if (parts[parts.length - 1].length !== 2) str = str.replace(/\./g, '');
      }
      parsedValor = Number(str.replace(/[^\d.-]/g, '')) || 0;
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parsedValor);
  }

  // IMPORTANTE: as seções "Características" e "Cláusulas" são texto jurídico-técnico
  // fixo (verbatim das propostas reais), com só alguns números variáveis. Por isso são
  // geradas a partir das funções canônicas em src/config/proposta-template.ts (a mesma
  // fonte usada pelo fluxo de Markdown), e NÃO a partir do texto bruto do tópico no banco
  // — o tópico no banco guarda apenas o título dessa seção (editável), não o corpo do texto,
  // para não arriscar perder/alterar o texto legal ao editar tópicos em Configurações.
  const caracteristicasArray = TEXTOS_PROPOSTA.gerarCaracteristicas(
    formData.profundidadeFundacao,
    formData.alturaArco,
    formData.materialTravessa
  );

  const clausulasArray = TEXTOS_PROPOSTA.gerarClausulasFixas(formData.prazoEntrega);

  const formatTextToArray = (text: string) => text.split('\n').filter((p: string) => p.trim() !== '');

  // Build the huge dados object
  return {
    configuracoes: settings,
    titulos: {
      fichaTecnica: getTopic('ficha_tecnica').titulo,
      frenteFundo: getTopic('frente_fundo').titulo,
      caracteristicas: getTopic('caracteristicas').titulo,
      revestimentos: getTopic('revestimentos').titulo,
      tabelaPreco: getTopic('tabela_preco').titulo,
      pagamento: getTopic('pagamento').titulo,
      clausulas: getTopic('clausulas').titulo,
      responsabilidades: getTopic('responsabilidades').titulo,
      garantias: getTopic('garantias').titulo,
      exclusoes: getTopic('exclusoes').titulo,
    },
    cabecalho: {
      vendedorNome: formData.vendedorNome,
      vendedorTelefone: formData.vendedorTelefone,
      orcamentoId: formData.orcamentoId,
      dataEmissao: formData.dataEmissao,
      dataValidade: formData.dataValidade,
      clienteNome: formData.clienteNome,
      clienteContato: formData.clienteContato,
    },
    fichaTecnica: {
      titulo: `ORÇAMENTO DE UMA ESTUFA PARA ${formData.cultura?.toUpperCase() || ''}`,
      subtitulo: `${formData.larguraTotal || ''}L X ${formData.comprimentoTotal || ''}C X ${formData.alturaLateral || ''}A`,
      texto: `Constitui objeto da presente proposta a prestação, pela Arco forte, em caráter de exclusividade, dos serviços de:\nORÇAMENTO DE UMA ESTUFA. A MESMA terá medidas de ${formData.comprimentoTotal || ''} metros de comprimento ${formData.larguraTotal || ''} metros na largura CONFORME apresentado antes neste projeto.`,
      croquiUrl: formData.croquiUrl || '',
      medidas: {
        largura: formData.largura,
        comprimento: formData.comprimento,
        peDireito: formData.alturaLateral,
        alturaArco: formData.alturaCentral,
        larguraTotal: formData.larguraTotal || '',
        comprimentoTotal: formData.comprimentoTotal || '',
        areaTotal: formData.areaTotal || '',
        modulos: formData.modulos || '',
        coberturaFilme: formData.coberturaFilme || '',
      },
      tabelaFrenteFundo: [
        { componente: 'Arcos', especificacao: formData.arcoCalandrado },
        { componente: 'Colunas extremidades', especificacao: formData.colunasExtremidades },
        { componente: 'Colunas central', especificacao: formData.colunasCentral },
        { componente: 'Filme de cobertura', especificacao: formData.filmeCobertura },
        { componente: 'Encaixes', especificacao: 'GALVANIZADOS' },
        { componente: 'Fechamento lateral', especificacao: formData.fechamentoLateral },
        { componente: 'Reforços/Contraventos', especificacao: 'TUBO 2 POLEGADAS' },
        { componente: 'Porta de acesso', especificacao: formData.portaAcesso },
        { componente: 'Parafusos', especificacao: 'GALVANIZADOS' },
        { componente: 'Laterais', especificacao: formData.lateralTubo },
        { componente: 'Central', especificacao: formData.centralCalha },
        { componente: 'Molas', especificacao: 'MOLA ZIG ZAG' },
        { componente: 'Travas internas', especificacao: formData.travasInternas },
        { componente: 'Travas externas', especificacao: formData.travasExternas },
      ]
    },
    caracteristicasArray: caracteristicasArray,
    revestimentos: {
      cobertura: formData.coberturaFilme,
      lateral: formData.fechamentoLateral,
      frontal: formData.fechamentoLateral,
      meiaLua: formData.filmeCobertura
    },
    itensFormatados: itensFormatados,
    financeiro: {
      freteStr: isNaN(Number(formData.frete)) ? formData.frete : formatCurrency(formData.frete),
      totalLiquidoStr: formatCurrency(formData.valorTotal),
    },
    pagamento: {
      finame: "PREÇO E CONDIÇÕES DE PAGAMENTO.\nCODIGO FINAME: 04213113",
      varianteSelecionada: formData.variantePagamento === 'A' 
        ? "50% DE ENTRADA VIA PIX (ASSINATURA DO CONTRATO) / 50% NO CARREGAMENTO DA MERCADORIA / CARTAO DE CRÉDITO ATÉ 18X COM TAXAS DA MÁQUINA / 50% DE ENTRADA RESTANTE 2X NO BOLETO BANCARIO (COM TAXA) / 50% ENTRADA RESTANTE 6X NO BOLETO (COM TAXA) / 50% ENTRADA RESTANTE 10X NO BOLETO (COM TAXA) / SE O PAGAMENTO FOR NO CARTÃO E PAGO TODO NO FECHAMENTO DO CONTRATO. / BOLETO MEDIANTE APROVAÇÃO BANCÁRIA)"
        : `${formatCurrency(formData.valorTotal)} A SER PAGO VIA PIX NA ASSINATURA DO CONTRATO.`
    },
    clausulasArray: clausulasArray,
    responsabilidadesPartesArray: formatTextToArray(getTopic('responsabilidades').texto),
    garantiasArray: formatTextToArray(getTopic('garantias').texto),
    exclusoesGarantiaArray: formatTextToArray(getTopic('exclusoes').texto),
  }
}
