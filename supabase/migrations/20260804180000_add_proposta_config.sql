-- Migration para adicionar configuração de tópicos da proposta comercial
-- Execute este script no SQL Editor do Supabase

ALTER TABLE public.configuracoes
ADD COLUMN IF NOT EXISTS proposta_topicos JSONB;

-- Preencher com os dados iniciais exatos da ArcoForte
UPDATE public.configuracoes 
SET proposta_topicos = '[
  {
    "id": "ficha_tecnica",
    "titulo": "Ficha Técnica",
    "texto": "{{FICHA_TECNICA}}",
    "tipo": "dinamico",
    "ordem": 1,
    "ativo": true
  },
  {
    "id": "caracteristicas",
    "titulo": "Características da Estufa",
    "texto": "{{CARACTERISTICAS}}",
    "tipo": "dinamico",
    "ordem": 2,
    "ativo": true
  },
  {
    "id": "revestimentos",
    "titulo": "Revestimentos e Condições Comerciais",
    "texto": "I - REVESTIMENTOS\n• COBERTURAS: {{COBERTURA}}\n• LATERAL: {{LATERAL}}\n• FRONTAL: {{FRONTAL}}\n• MEIA LUA: {{MEIA_LUA}}\n\n{{TABELA_ITENS}}\n\nVALOR DO INVESTIMENTO: {{VALOR_TOTAL}}\n\n{{FINAME_E_PAGAMENTO}}\n\n{{CLAUSULAS}}",
    "tipo": "dinamico",
    "ordem": 3,
    "ativo": true
  },
  {
    "id": "responsabilidades",
    "titulo": "Responsabilidades das Partes",
    "texto": "### RESPONSABILIDADES DA CONTRATANTE\n\nA - Executar a captação de águas pluviais a partir dos coletores. (Tubos de PVC)\nB - Fornecer local seguro e próximo a obra, para guardar os materiais antes e durante a montagem;\nC - Fornecer materiais de concretagem da estrutura (Areia, Brita, Cimento, Betoneira, andaimes Tábuas, Bloco de concreto ou canaletas se necessário etc.).\nD - O CONTRATANTE deverá proporcionar todas as facilidades indispensáveis à boa execução do contrato.\nE - Adimplir com as condições de preço e pagamento, conforme pactuado.\nF - Fazer o descarregamento da mercadoria.\nG - Conferir materiais entregues através do romaneio recebido, não sendo aceitas reclamações após a assinatura do canhoto da NF.\nH - Declividade do terreno: Para que se obtenha o escoamento de águas pluviais previsto em projeto e que se garanta a dimensão do pé direito requerido pelo cliente, é necessário que o terreno tenha declividade mínima de 1,5 %, caso o terreno esteja com declividade menor do que a solicitada a compensação será feita nos mourões NÃO garantindo a altura do pé direito previsto no projeto.\n\n### RESPONSABILIDADES DA ARCO FORTE\n\nA - Cumprir o objeto do contrato nos prazos e condições estabelecidos.\nB - Disponibilizar para seus clientes e fornecedores, todos os documentos que comprovam sua total regularidade com os pagamentos de tributos municipais, estaduais, federais e com as obrigações trabalhistas;",
    "tipo": "texto",
    "ordem": 4,
    "ativo": true
  },
  {
    "id": "garantias",
    "titulo": "Garantias",
    "texto": "• Estrutura - 48 meses. Desde que não submetidas a cargas extras que não estão neste projeto tais como sombreamentos, irrigação e outros sistemas. E danos causados por má operação ou conservação pelo usuário, ou por terceiros, bem como oriundos da ação agressiva de agentes da natureza (raios, vendavais, tempestades, granizos etc.) não são cobertos pelas garantias, mesmo durante o processo de montagem. Os itens e componentes não fabricados pela Arco Forte serão garantidos pelos seus devidos fabricantes com suporte da Arco Forte.\n• Galvanização - 36 meses. Somente para serviços de galvanização a fogo.\n• Filmes - 30 meses. Contra defeitos de fabricação, proporcional ao tempo de uso;\n• Telas - 48 meses. Contra defeitos de fabricação, proporcional ao tempo de uso;\n• A garantia não inclui outras despesas tais como frete, gastos adicionais de qualquer espécie, plantas de qualquer espécie e/ou quaisquer outros objetos abrigados sobre as estufas.",
    "tipo": "texto",
    "ordem": 5,
    "ativo": true
  },
  {
    "id": "exclusoes",
    "titulo": "Excluem-se também da garantia",
    "texto": "• Recalque da estrutura da estufa agrícola causado por instabilidade do solo;\n• Topografia fora das especificações contidas no contrato;\n• Ataque de animais;\n• Estufas sem tirantes laterais.\n• Quando houver agentes químicos e/ou físicos extremos em contato com as estruturas interna/externa (altas temperaturas, elevada concentração de sais e/ou produtos químicos no solo e/ou na atmosfera).\n• Declividade do terreno: Para que se obtenha o escoamento de águas pluviais previsto em projeto e que se garanta a dimensão do pé direito requerido pelo cliente, é necessário que o terreno tenha declividade mínima de 1,5 %, caso o terreno esteja com declividade menor do que a solicitada a compensação será feita nos mourões NÃO garantindo a altura do pé direito previsto no projeto.\n• Condutores verticais: Nas saídas das águas pluviais das calhas, devem ser utilizados elementos de condução que NÃO resultem em estrangulamento no fluxo de água (curvas, reduções etc.), caso contrário poderá ocorrer o extravasamento da água na calha, com a possibilidade de causar rompimento do filme plástico, podendo ocorrer comprometimento da estrutura de forma parcial ou completa, ocasionando até mesmo a queda de toda a estrutura devido ao aumento da carga ocasionado pelo acúmulo de água. As calhas e condutores devem ser limpos, retirando folhas, galhos, areia, terra, insetos, ninhos de aves, etc. constantemente a fim de desobstruir o fluxo das águas, facilitando o escoamento da água quando ocorrerem as precipitações.",
    "tipo": "texto",
    "ordem": 6,
    "ativo": true
  }
]'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000000';
