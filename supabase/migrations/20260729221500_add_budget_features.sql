-- 1. ALTERAÇÃO NA TABELA PRODUTOS
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS peso_bruto_kg NUMERIC(10,3),
ADD COLUMN IF NOT EXISTS peso_liquido_kg NUMERIC(10,3);

-- 2. ALTERAÇÃO NA TABELA ORCAMENTOS
ALTER TABLE public.orcamentos
ADD COLUMN IF NOT EXISTS desconto NUMERIC(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS frete NUMERIC(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS outras_despesas NUMERIC(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS forma_pagamento TEXT,
ADD COLUMN IF NOT EXISTS tipo_frete TEXT,
ADD COLUMN IF NOT EXISTS endereco_entrega TEXT,
ADD COLUMN IF NOT EXISTS data_validade DATE,
ADD COLUMN IF NOT EXISTS descricao_proposta TEXT;

-- 3. ALTERAÇÃO NA TABELA ORCAMENTO_ITENS
ALTER TABLE public.orcamento_itens
ADD COLUMN IF NOT EXISTS peso_bruto_total NUMERIC(10,3),
ADD COLUMN IF NOT EXISTS peso_liquido_total NUMERIC(10,3);

-- 4. INSERÇÃO DO GRUPO: CORTINA LATERAL MÓVEL
DO $$ 
DECLARE
  v_grupo_id UUID;
BEGIN
  -- Verificar se já existe, para não duplicar
  SELECT id INTO v_grupo_id FROM public.grupos_componentes WHERE nome = 'Cortina Lateral Móvel';
  
  IF v_grupo_id IS NULL THEN
    INSERT INTO public.grupos_componentes (nome, ordem) 
    VALUES ('Cortina Lateral Móvel', 12)
    RETURNING id INTO v_grupo_id;
  END IF;

  -- 5. INSERÇÃO DAS POSIÇÕES PARA O GRUPO
  -- Tubo Cortina Móvel Lateral (cod 1254)
  IF NOT EXISTS (SELECT 1 FROM public.posicoes WHERE nome = 'Tubo Cortina Móvel Lateral' AND grupo_id = v_grupo_id) THEN
    INSERT INTO public.posicoes (grupo_id, nome) VALUES (v_grupo_id, 'Tubo Cortina Móvel Lateral');
  END IF;

  -- Protetor de Cortina até 4m de altura (cod 3155)
  IF NOT EXISTS (SELECT 1 FROM public.posicoes WHERE nome = 'Protetor de Cortina até 4m de altura' AND grupo_id = v_grupo_id) THEN
    INSERT INTO public.posicoes (grupo_id, nome) VALUES (v_grupo_id, 'Protetor de Cortina até 4m de altura');
  END IF;

  -- Manivela para Cortina Lateral (cod 3388)
  IF NOT EXISTS (SELECT 1 FROM public.posicoes WHERE nome = 'Manivela para Cortina Lateral' AND grupo_id = v_grupo_id) THEN
    INSERT INTO public.posicoes (grupo_id, nome) VALUES (v_grupo_id, 'Manivela para Cortina Lateral');
  END IF;

  -- Emenda de Tubo de Cortina Lateral (cod 3423)
  IF NOT EXISTS (SELECT 1 FROM public.posicoes WHERE nome = 'Emenda de Tubo de Cortina Lateral' AND grupo_id = v_grupo_id) THEN
    INSERT INTO public.posicoes (grupo_id, nome) VALUES (v_grupo_id, 'Emenda de Tubo de Cortina Lateral');
  END IF;

  -- Painel Protetor Cortina Móvel com Filme (cod 4151)
  IF NOT EXISTS (SELECT 1 FROM public.posicoes WHERE nome = 'Painel Protetor Cortina Móvel com Filme' AND grupo_id = v_grupo_id) THEN
    INSERT INTO public.posicoes (grupo_id, nome) VALUES (v_grupo_id, 'Painel Protetor Cortina Móvel com Filme');
  END IF;

END $$;

-- 6. INSERIR PRODUTOS SE AINDA NÃO EXISTIREM
INSERT INTO public.produtos (codigo, descricao, unidade, preco_unitario, categoria) VALUES
('1254', 'Tubo Cortina Móvel Lateral', 'm', 15.00, 'Tubos'),
('3155', 'Protetor de Cortina até 4m de altura', 'un', 45.00, 'Acessórios'),
('3388', 'Manivela para Cortina Lateral', 'un', 120.00, 'Acessórios'),
('3423', 'Emenda de Tubo de Cortina Lateral', 'un', 8.50, 'Acessórios'),
('4151', 'Painel Protetor Cortina Móvel com Filme', 'm', 12.00, 'Telas e Filmes')
ON CONFLICT (codigo) DO NOTHING;

-- 7. ATRIBUIR REGRAS VAZIAS (Fórmula '0') PARA AS POSIÇÕES
DO $$
DECLARE
  p_tubo UUID;
  p_protetor UUID;
  p_manivela UUID;
  p_emenda UUID;
  p_painel UUID;
BEGIN
  -- Obter IDs das posições recém-criadas
  SELECT id INTO p_tubo FROM public.posicoes WHERE nome = 'Tubo Cortina Móvel Lateral' LIMIT 1;
  SELECT id INTO p_protetor FROM public.posicoes WHERE nome = 'Protetor de Cortina até 4m de altura' LIMIT 1;
  SELECT id INTO p_manivela FROM public.posicoes WHERE nome = 'Manivela para Cortina Lateral' LIMIT 1;
  SELECT id INTO p_emenda FROM public.posicoes WHERE nome = 'Emenda de Tubo de Cortina Lateral' LIMIT 1;
  SELECT id INTO p_painel FROM public.posicoes WHERE nome = 'Painel Protetor Cortina Móvel com Filme' LIMIT 1;

  -- Criar a regra (0) se não existir
  IF p_tubo IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.regras_calculo WHERE posicao_id = p_tubo) THEN
    INSERT INTO public.regras_calculo (posicao_id, produto_codigo, formula_quantidade, unidade_medida, regra_arredondamento)
    VALUES (p_tubo, '1254', '0', 'm', 'nenhum');
  END IF;

  IF p_protetor IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.regras_calculo WHERE posicao_id = p_protetor) THEN
    INSERT INTO public.regras_calculo (posicao_id, produto_codigo, formula_quantidade, unidade_medida, regra_arredondamento)
    VALUES (p_protetor, '3155', '0', 'un', 'nenhum');
  END IF;

  IF p_manivela IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.regras_calculo WHERE posicao_id = p_manivela) THEN
    INSERT INTO public.regras_calculo (posicao_id, produto_codigo, formula_quantidade, unidade_medida, regra_arredondamento)
    VALUES (p_manivela, '3388', '0', 'un', 'nenhum');
  END IF;

  IF p_emenda IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.regras_calculo WHERE posicao_id = p_emenda) THEN
    INSERT INTO public.regras_calculo (posicao_id, produto_codigo, formula_quantidade, unidade_medida, regra_arredondamento)
    VALUES (p_emenda, '3423', '0', 'un', 'nenhum');
  END IF;

  IF p_painel IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.regras_calculo WHERE posicao_id = p_painel) THEN
    INSERT INTO public.regras_calculo (posicao_id, produto_codigo, formula_quantidade, unidade_medida, regra_arredondamento)
    VALUES (p_painel, '4151', '0', 'm', 'nenhum');
  END IF;
END $$;
