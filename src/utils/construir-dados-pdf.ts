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
      clienteCidade: formData.clienteCidade,
    },
    fichaTecnica: {
      titulo: `ORÇAMENTO DE UMA ESTUFA PARA ${formData.cultura?.toUpperCase() || ''}`,
      subtitulo: `${formData.larguraTotal || ''}L X ${formData.comprimentoTotal || ''}C X ${formData.alturaLateral || ''}A`,
      texto: `Constitui objeto da presente proposta a prestação, pela Arco forte, em caráter de exclusividade, dos serviços de:\nORÇAMENTO DE UMA ESTUFA. A ESTUFA terá medidas de ${formData.comprimentoTotal || ''} metros de comprimento ${formData.larguraTotal || ''} metros na largura CONFORME apresentado antes neste projeto.`,
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
        { componente: 'Colunas extremidades (postes/pilares)', especificacao: formData.colunasExtremidades },
        { componente: 'Colunas central', especificacao: formData.colunasCentral },
        { componente: 'Filme de cobertura', especificacao: formData.filmeCobertura },
        { componente: 'Encaixes', especificacao: 'GALVANIZADOS' },
        { componente: 'Fechamento lateral', especificacao: formData.fechamentoLateral },
        { componente: 'Reforços contraventos', especificacao: 'TUBO 2 POLEGADAS' },
        { componente: 'Porta de acesso', especificacao: formData.portaAcesso },
        { componente: 'Parafusos', especificacao: 'GALVANIZADOS' },
        { componente: 'Laterais', especificacao: formData.lateralTubo },
        { componente: 'Central', especificacao: formData.centralCalha },
        { componente: 'Molas aço galvanizado', especificacao: 'ZIG ZAG' },
        { componente: 'Travas internas', especificacao: formData.travasInternas },
        { componente: 'Travas externas', especificacao: formData.travasExternas },
        { componente: 'Travamento frontal', especificacao: 'TUBO RETANGULAR 50/30' },
      ]
    },
    caracteristicasArray: caracteristicasArray,
    revestimentos: {
      cobertura: formData.coberturaFilme,
      lateral: formData.fechamentoLateral,
      frontal: formData.fechamentoLateral,
      meiaLua: formData.fechamentoLateral
    },
    itensFormatados: itensFormatados,
    financeiro: {
      valorEstruturaStr: formatCurrency(formData.valorEstrutura ?? formData.valorTotal),
      freteStr: isNaN(Number(formData.frete)) ? formData.frete : formatCurrency(formData.frete),
      totalLiquidoStr: formatCurrency(formData.valorTotal),
    },
    pagamento: {
      finame: "PREÇO E CONDIÇÕES DE PAGAMENTO.\nCODIGO FINAME: 04213113",
      varianteSelecionada: formData.variantePagamento === 'A'
        ? "50% DE ENTRADA VIA PIX (ASSINATURA DO CONTRATO) \n50% NO CARREGAMENTO DA MERCADORIA\nCARTAO DE CRÉDITO ATÉ 18X COM TAXAS DA MÁQUINA\n50% DE ENTRADA RESTANTE 2X NO BOLETO BANCARIO (COM TAXA)\n50% ENTRADA RESTANTE 6X NO BOLETO (COM TAXA)\n50% ENTRADA RESTANTE 10X NO BOLETO (COM TAXA)\nSE O PAGAMENTO FOR NO CARTÃO E PAGO TODO NO FECHAMENTO DO CONTRATO.\nBOLETO MEDIANTE APROVAÇÃO BANCÁRIA)"
        : `${formatCurrency(formData.valorTotal)} A SER PAGO VIA PIX NA ASSINATURA DO CONTRATO.`
    },
    clausulasArray: clausulasArray,
    // Texto jurídico fixo (igual às propostas reais), não depende do que está
    // configurado em Configurações — evita divergir se o tópico estiver vazio/diferente.
    responsabilidadesPartesArray: [
      'RESPONSABILIDADES DA CONTRATANTE',
      'A– Executar a captação de águas pluviais a partir dos coletores. (Tubos de PVC)',
      'B - Fornecer local seguro e próximo a obra, para guardar os materiais antes e durante a montagem;',
      'C - Fornecer materiais de concretagem da estrutura (Areia, Brita, Cimento, Betoneira, andaimes Tábuas, Bloco de concreto ou canaletas se necessário etc.).',
      'D - O CONTRATANTE deverá proporcionar todas as facilidades indispensáveis à boa execução do contrato.',
      'E- Adimplir com as condições de preço e pagamento, conforme pactuado.',
      'F – Fazer o descarregamento da mercadoria.',
      'G - Conferir materiais entregues através do romaneio recebido, não sendo aceitas reclamações após a assinatura do canhoto da NF.',
      'H - Declividade do terreno: Para que se obtenha o escoamento de águas pluviais previsto em projeto e que se garanta a dimensão do pé direito requerido pelo cliente, é necessário que o terreno tenha declividade mínima de 1,5 %, caso o terreno esteja com declividade menor do que a solicitada a compensação será feita nos mourões NÃO garantindo a altura do pé direito previsto no projeto.',
      'RESPONSABILIDADES DA ARCO FORTE',
      'A - Cumprir o objeto do contrato nos prazos e condições estabelecidos.',
      'B - Disponibilizar para seus clientes e fornecedores, todos os documentos que comprovam sua total regularidade com os pagamentos de tributos municipais, estaduais, federais e com as obrigações trabalhistas;',
    ],
    garantiasArray: [
      '• Estrutura- 48 meses. Desde que não submetidas a cargas extras que não estão neste projeto tais como sombreamentos, irrigação e outros sistemas. E danos causados por má operação ou conservação pelo usuário, ou por terceiros, bem como oriundos da ação agressiva de agentes da natureza (raios, vendavais, tempestades, granizos etc.) não são cobertos pelas garantias, mesmo durante o processo de montagem. Os itens e componentes não fabricados pela Arco Forte serão garantidos pelos seus devidos fabricantes com suporte da Arco Forte.',
      '• Galvanização - 36 meses. Somente para serviços de galvanização a fogo.',
      '• Filmes - 30 meses. Contra defeitos de fabricação, proporcional ao tempo de uso;',
      '• Telas - 48 meses. Contra defeitos de fabricação, proporcional ao tempo de uso;',
      '•A garantia não inclui outras despesas tais como frete, gastos adicionais de qualquer espécie, plantas de qualquer espécie e/ou quaisquer outros objetos abrigados sobre as estufas.',
    ],
    exclusoesGarantiaArray: [
      'Excluem-se também da garantia',
      '• Recalque da estrutura da estufa agrícola causado por instabilidade do solo;',
      '• Topografia fora das especificações contidas no contrato;',
      '• Ataque de animais;',
      '• Estufas sem tirantes laterais.',
      '• Quando houver agentes químicos e/ou físicos extremos em contato com as estruturas interna/externa (altas temperaturas, elevada concentração de sais e/ou produtos químicos no solo e/ou na atmosfera).',
      '• Declividade do terreno: Para que se obtenha o escoamento de águas pluviais previsto em projeto e que se garanta a dimensão do pé direito requerido pelo cliente, é necessário que o terreno tenha declividade mínima de 1,5 %, caso o terreno esteja com declividade menor do que a solicitada a compensação será feita nos mourões NÃO garantindo a altura do pé direito previsto no projeto.',
      '• Condutores verticais: Nas saídas das águas pluviais das calhas, devem ser utilizados elementos de condução que NÃO resultem em estrangulamento no fluxo de água (curvas, reduções etc.), caso contrário poderá ocorrer o extravasamento da água na calha, com a possibilidade de causar rompimento do filme plástico, podendo ocorrer comprometimento da estrutura de forma parcial ou completa, ocasionando até mesmo a queda de toda a estrutura devido ao aumento da carga ocasionado pelo acúmulo de água. As calhas e condutores devem ser limpos, retirando folhas, galhos, areia, terra, insetos, ninhos de aves, etc. constantemente a fim de desobstruir o fluxo das águas, facilitando o escoamento da água quando ocorrerem as precipitações.',
    ],
  }
}
