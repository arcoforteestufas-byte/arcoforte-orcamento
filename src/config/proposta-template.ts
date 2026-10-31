// Textos Fixos Jurídicos e Templates da Proposta Comercial

export const TEXTOS_PROPOSTA = {
  cabecalho: `Arco forte:
ARCOFORTE ESTRUTURAS AGRÍCOLAS
CNPJ: 35.582.236/0001-68
{{VENDEDOR_NOME}}
{{VENDEDOR_TELEFONE}}
Nº do Pedido: {{ORCAMENTO_ID}}
Data: {{DATA_EMISSAO}}
Validade: {{DATA_VALIDADE}}
Contratante:
Nome: {{CLIENTE_NOME}}
CONTATO: {{CLIENTE_CONTATO}}`,

  rodape: `ARCO FORTE ESTUFAS AGRÍCOLAS
AVENIDA PEDRO LUDOVICO, QD A LT 14 A JARDIM ANA CLAUDIA, ANÁPOLIS-GO CEP 75135866
CONTATO: RONILSON 992801691 ELIÉZER 992493471
INSTAGRAM @ARCOFORTE E-MAIL: ARCOFORTEESTUFAS@GMAIL.COM`,

  condicoesPagamento: {
    finame: "PREÇO E CONDIÇÕES DE PAGAMENTO.\nCODIGO FINAME: 04213113",
    varianteA: "50% DE ENTRADA VIA PIX (ASSINATURA DO CONTRATO) / 50% NO CARREGAMENTO DA MERCADORIA / CARTAO DE CRÉDITO ATÉ 18X COM TAXAS DA MÁQUINA / 50% DE ENTRADA RESTANTE 2X NO BOLETO BANCARIO (COM TAXA) / 50% ENTRADA RESTANTE 6X NO BOLETO (COM TAXA) / 50% ENTRADA RESTANTE 10X NO BOLETO (COM TAXA) / SE O PAGAMENTO FOR NO CARTÃO E PAGO TODO NO FECHAMENTO DO CONTRATO. / BOLETO MEDIANTE APROVAÇÃO BANCÁRIA)",
    varianteB: "R$ {{VALOR_TOTAL}} A SER PAGO VIA PIX NA ASSINATURA DO CONTRATO."
  },

  gerarAberturaFichaTecnica: (cultura: string, comprimento: number, largura: number, alturaLateral: number) => {
    return {
      titulo: `ORÇAMENTO DE UMA ESTUFA PARA ${cultura.toUpperCase()}`,
      subtitulo: `${largura}L X ${comprimento}C X ${alturaLateral}A`,
      texto: `Constitui objeto da presente proposta a prestação, pela Arco forte, em caráter de exclusividade, dos serviços de:\nORÇAMENTO DE UMA ESTUFA. A MESMA terá medidas de ${comprimento.toFixed(2).replace('.', ',')} metros de comprimento ${largura.toFixed(2).replace('.', ',')} metros na largura CONFORME apresentado antes neste projeto.`
    }
  },

  textoAbaixoMedidas: `NOSSAS ESTUFAS SÃO DE FACIL MONTAGEM, TUDO DE ENCAIXE.
AX NA MONTAGEM COM VÍDEOS E MANUAIS DE MONTAGEM.`,

  gerarCaracteristicas: (profundidadeFundacao: string, alturaArco: string, tipoLateral: string) => {
    return [
      `A – FUNDAÇÃO: Para cada poste será necessário escavar um buraco no solo de aproximadamente 25 cm de diâmetro com ${profundidadeFundacao} de profundidade onde serão concretados.`,
      `B – GALVANIZAÇÃO: postes, são fabricados em eucalipto tratado. Restante da estrutura: metalon, tubos, arcos são pré galvanizados e metalizados na costura, encaixes fabricados com solda mig e depois galvanizados conforme normas da ABNT.`,
      `C - PARTES METÁLICAS EM AÇO: Arcos galvanizados conforme normas. Os contraventos em tubos 2 polegadas. A barra dorsal será em tubo 2 polegadas, também galvanizados conforme normas. Também será utilizado encaixes galvanizados para apoio dos arcos nos pilares.`,
      `D - ARCOS, CONTRAVENTOS, DORSAL E METALON: Arcos calandrados de aproximadamente ${alturaArco} de altura em chapa 1,25mm.\nNa frente e no fundo, travessa 50x30 chapa 125mm, ${tipoLateral}, tubo de 2 polegadas galvanizados de 6 metros compondo a barra DORSAL para apoio dos arcos. E, tubos de 2 polegadas galvanizados de 4 a 5 metros fazendo o contraventamento que serão ligados no primeiro arco na parte cumeeira e no pé do segundo arco, fazendo a função de mão-francesa ou contraventamento.`,
      `E - FIXAÇÃO DOS REVESTIMENTOS SUPERIOR E INFERIOR.\n. SUPERIOR: A fixação dos revestimentos (filmes e telas) deverá ser feita com molas de aço 2,10mm, encaixadas em perfis de alumínio e demais peças já projetadas para esta fixação.\n. INFERIOR (TELA): Lateral será fixada no perfil duplo superior e na mureta com perfil simples e mola.`,
      `F - PARTES DE ALUMÍNIO DA ESTRUTURA: Perfis de alumínio com base simples e dupla;\nEntrudado liga 6063/6261) temperas T6/T5).`,
      `G - TRAVAMENTOS INTERNOS: A COBERTURA SERÁ TRAVADA COM TIRANTES EM CABO DE AÇO NOS POSTES E ESTICADORES INTERNOS, FAZENDO TRAÇÃO DE UM POSTE AO OUTRO.`,
      `H - TRAVAMENTOS EXTERNOS: ESTICADORES E CHUMBADORES E CABOS 3/16`
    ]
  },

  gerarClausulasFixas: (prazoEntrega: string) => {
    return [
      `1 - A Arco Forte irá realizar a entrega dos produtos no prazo de até ${prazoEntrega.toUpperCase()}DIAS UTEIS, a contar do efetivo pagamento da primeira parcela do valor ajustado.`,
      `2 - O prazo de vigência deste Contrato será até a entrega do produto e o pagamento integral correspondente.`,
      `3 - Acontecimentos extraordinários como por exemplo, incêndio, guerra, greves, falta de matéria –prima, ações militares, catástrofes naturais como inundações, relâmpagos não serão considerados como descumprimento de obrigação, possibilitando às partes a renegociação do prazo de entrega dos bens e conclusão do serviço.`
    ]
  },

  responsabilidadesPartes: `RESPONSABILIDADES DAS PARTES:

RESPONSABILIDADES DA CONTRATANTE

A– Executar a captação de águas pluviais a partir dos coletores. (Tubos de PVC)
B - Fornecer local seguro e próximo a obra, para guardar os materiais antes e durante a montagem;
C - Fornecer materiais de concretagem da estrutura (Areia, Brita, Cimento, Betoneira, andaimes Tábuas, Bloco de concreto ou canaletas se necessário etc.).
D - O CONTRATANTE deverá proporcionar todas as facilidades indispensáveis à boa execução do contrato.
E- Adimplir com as condições de preço e pagamento, conforme pactuado.
F – Fazer o descarregamento da mercadoria.
G - Conferir materiais entregues através do romaneio recebido, não sendo aceitas reclamações após a assinatura do canhoto da NF.
H - Declividade do terreno: Para que se obtenha o escoamento de águas pluviais previsto em projeto e que se garanta a dimensão do pé direito requerido pelo cliente, é necessário que o terreno tenha declividade mínima de 1,5 %, caso o terreno esteja com declividade menor do que a solicitada a compensação será feita nos mourões NÃO garantindo a altura do pé direito previsto no projeto.

RESPONSABILIDADES DA ARCO FORTE

A - Cumprir o objeto do contrato nos prazos e condições estabelecidos.
B - Disponibilizar para seus clientes e fornecedores, todos os documentos que comprovam sua total regularidade com os pagamentos de tributos municipais, estaduais, federais e com as obrigações trabalhistas;`,

  garantias: `GARANTIAS
• Estrutura- 48 meses. Desde que não submetidas a cargas extras que não estão neste projeto tais como sombreamentos, irrigação e outros sistemas. E danos causados por má operação ou conservação pelo usuário, ou por terceiros, bem como oriundos da ação agressiva de agentes da natureza (raios, vendavais, tempestades, granizos etc.) não são cobertos pelas garantias, mesmo durante o processo de montagem. Os itens e componentes não fabricados pela Arco Forte serão garantidos pelos seus devidos fabricantes com suporte da Arco Forte.
• Galvanização - 36 meses. Somente para serviços de galvanização a fogo.
• Filmes - 30 meses. Contra defeitos de fabricação, proporcional ao tempo de uso;
• Telas - 48 meses. Contra defeitos de fabricação, proporcional ao tempo de uso;
•A garantia não inclui outras despesas tais como frete, gastos adicionais de qualquer espécie, plantas de qualquer espécie e/ou quaisquer outros objetos abrigados sobre as estufas.

Excluem-se também da garantia
• Recalque da estrutura da estufa agrícola causado por instabilidade do solo;
• Topografia fora das especificações contidas no contrato;
• Ataque de animais;
• Estufas sem tirantes laterais.
• Quando houver agentes químicos e/ou físicos extremos em contato com as estruturas interna/externa (altas temperaturas, elevada concentração de sais e/ou produtos químicos no solo e/ou na atmosfera).
• Declividade do terreno: Para que se obtenha o escoamento de águas pluviais previsto em projeto e que se garanta a dimensão do pé direito requerido pelo cliente, é necessário que o terreno tenha declividade mínima de 1,5 %, caso o terreno esteja com declividade menor do que a solicitada a compensação será feita nos mourões NÃO garantindo a altura do pé direito previsto no projeto.
• Condutores verticais: Nas saídas das águas pluviais das calhas, devem ser utilizados elementos de condução que NÃO resultem em estrangulamento no fluxo de água (curvas, reduções etc.), caso contrário poderá ocorrer o extravasamento da água na calha, com a possibilidade de causar rompimento do filme plástico, podendo ocorrer comprometimento da estrutura de forma parcial ou completa, ocasionando até mesmo a queda de toda a estrutura devido ao aumento da carga ocasionado pelo acúmulo de água. As calhas e condutores devem ser limpos, retirando folhas, galhos, areia, terra, insetos, ninhos de aves, etc. constantemente a fim de desobstruir o fluxo das águas, facilitando o escoamento da água quando ocorrerem as precipitações.`,

  encerramento: `DEUS É FIEL`
}
