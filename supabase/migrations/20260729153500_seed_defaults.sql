-- SEED OFICIAL - ARCOFORTE ORÇAMENTO (Baseado no escopo e matriz técnica)
-- NOTA: Preços zerados. Regras de áreas e telas como placeholders.

-- 1. PARÂMETROS DA ESTUFA
INSERT INTO public.parametros_estufa (nome_tecnico, rotulo, tipo, opcoes) VALUES
('n_modulos', 'Número de Módulos', 'numero', null),
('largura_modulo', 'Largura do Módulo (m)', 'selecao', '["7", "8", "10"]'),
('n_vaos', 'Número de Vãos', 'numero', null),
('vao', 'Tamanho do Vão (m)', 'selecao', '["3", "4"]'),
('pe_direito', 'Pé-Direito (m)', 'selecao', '["3", "4", "5"]'),
('tipo_arco', 'Tipo de Arco', 'selecao', '["simples", "duplo", "lanternim"]'),
('cobertura', 'Cobertura', 'booleano', null),
('fechamento_lateral', 'Fechamento Lateral', 'booleano', null),
('fixacao_inferior', 'Fixação Inferior', 'selecao', '["mureta", "enterrada"]'),
('calha_lateral', 'Calha Lateral', 'booleano', null),
('n_divisas', 'Número de Divisas', 'numero', null),
('portas_abrir', 'Qtd Portas (Abrir)', 'numero', null),
('portas_correr', 'Qtd Portas (Correr)', 'numero', null),
('travamentos_x', 'Travamentos em X (por linha)', 'numero', null),
('modelo_cabo', 'Modelo Cabo de Aço', 'selecao', '["padrão 3/16", "alternativo 1/4"]');

-- 2. GRUPOS DE COMPONENTES (IDs corrigidos para formato UUID válido usando dígitos hex)
INSERT INTO public.grupos_componentes (id, nome, ordem) VALUES
('10000000-0000-0000-0000-000000000001', '1. POSTES', 1),
('20000000-0000-0000-0000-000000000002', '2. ARCOS', 2),
('30000000-0000-0000-0000-000000000003', '3. DORSAL / CONTRAVENTO / ENCAIXE CENTRAL', 3),
('40000000-0000-0000-0000-000000000004', '4. LATERAL / CALHA', 4),
('50000000-0000-0000-0000-000000000005', '5. EMENDAS E SUPORTES', 5),
('60000000-0000-0000-0000-000000000006', '6. MOLA', 6),
('70000000-0000-0000-0000-000000000007', '7. CABOS DE AÇO', 7),
('80000000-0000-0000-0000-000000000008', '8. PORTAS', 8),
('90000000-0000-0000-0000-000000000009', '9. PARAFUSOS / DIVERSOS', 9),
('a0000000-0000-0000-0000-000000000010', '10. FECHAMENTO LATERAL - TELAS', 10),
('b0000000-0000-0000-0000-000000000011', '11. COBERTURA - FILMES', 11);

-- 3. PRODUTOS (Preços = 0)
INSERT INTO public.produtos (codigo, descricao, unidade, preco_unitario) VALUES
('3037', 'Poste Canto PD3', 'un', 0), ('3021', 'Poste Lateral PD3', 'un', 0), ('3022', 'Poste PD4', 'un', 0), ('3104', 'Poste PD5', 'un', 0),
('3120', 'Poste Topo Arco', 'un', 0), ('3005', 'Arco Simples 7m', 'un', 0), ('3006', 'Arco Simples 8m', 'un', 0),
('3415', 'Arco Duplo 7m', 'un', 0), ('3108', 'Arco Duplo 8m', 'un', 0), ('3007', 'Arco Duplo 10m', 'un', 0),
('3417', 'Arco Lanternim 7m', 'un', 0), ('3098', 'Arco Lanternim 8m', 'un', 0), ('3014', 'Arco Lanternim 10m', 'un', 0),
('3012', 'Arco Frontal Simples 7m', 'un', 0), ('3013', 'Arco Frontal Simples 8m', 'un', 0),
('3017', 'Dorsal 6m', 'un', 0), ('3031', 'Contravento 3,85m', 'un', 0), ('3032', 'Contravento 4,80m', 'un', 0), ('3027', 'Encaixe Central', 'un', 0),
('3035', 'Perfil Simples', 'm', 0), ('3034', 'Perfil Duplo', 'm', 0), ('5200', 'Calha Lateral 3m', 'm', 0), ('5110', 'Calha Lateral 4m', 'm', 0),
('3063', 'Emenda Lateral', 'un', 0), ('3018', 'Espera Arco', 'un', 0), ('3019', 'Suporte Calha Lateral', 'un', 0),
('3089', 'Suporte Entrada Dir', 'un', 0), ('3085', 'Suporte Entrada Esq', 'un', 0), ('3093', 'Suporte Saída Fundo', 'un', 0),
('5024', 'PU Selante', 'un', 0), ('5084', 'Perfil Fixação Duplo Maxx', 'm', 0), ('3049', 'Mola Rolo 25m', 'un', 0),
('5009', 'Cabo Aço 3/16', 'm', 0), ('5204', 'Cabo Aço 1/4', 'm', 0), ('5309', 'Kit Suporte Cabo', 'un', 0), ('5308', 'Esticador', 'un', 0), ('3058', 'Chumbador', 'un', 0),
('3033', 'Porta de Abrir', 'un', 0), ('3039', 'Porta Correr Pequena', 'un', 0), ('3073', 'Porta Correr Grande', 'un', 0),
('5107', 'Kit Parafuso 3x5/16', 'un', 0), ('5114', 'Kit Parafuso 1x5/16', 'un', 0),
('TELA-XXX', 'Tela Generica', 'm2', 0), ('FILME-XXX', 'Filme Generico', 'm2', 0);

-- 4. POSIÇÕES E REGRAS (IDs em formato UUID valido)
-- 1. POSTES
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('11111111-1111-1111-1111-000000000001', '10000000-0000-0000-0000-000000000001', 'Postes Canto');
INSERT INTO public.regras_calculo (posicao_id, produto_codigo, formula_quantidade, condicao_aplicabilidade, unidade_medida, regra_arredondamento) VALUES
('11111111-1111-1111-1111-000000000001', '3037', '4', 'pe_direito == 3', 'un', 'nenhum'),
('11111111-1111-1111-1111-000000000001', '3022', '4', 'pe_direito == 4', 'un', 'nenhum'),
('11111111-1111-1111-1111-000000000001', '3104', '4', 'pe_direito == 5', 'un', 'nenhum');

INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('11111111-1111-1111-1111-000000000002', '10000000-0000-0000-0000-000000000001', 'Postes Lateral 1/2');
INSERT INTO public.regras_calculo (posicao_id, produto_codigo, formula_quantidade, condicao_aplicabilidade, unidade_medida, regra_arredondamento) VALUES
('11111111-1111-1111-1111-000000000002', '3021', '((n_vaos + 1) - 2) * 2', 'pe_direito == 3', 'un', 'nenhum');

INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('11111111-1111-1111-1111-000000000003', '10000000-0000-0000-0000-000000000001', 'Postes Divisa Modular Interna');
INSERT INTO public.regras_calculo (posicao_id, produto_codigo, formula_quantidade, condicao_aplicabilidade, unidade_medida, regra_arredondamento) VALUES
('11111111-1111-1111-1111-000000000003', '3021', '((n_vaos + 1) - 2) * (n_modulos - 1)', 'n_modulos > 1', 'un', 'nenhum');

-- 2. ARCOS
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('22222222-2222-2222-2222-000000000001', '20000000-0000-0000-0000-000000000002', 'Arcos Simples Internos');
INSERT INTO public.regras_calculo (posicao_id, produto_codigo, formula_quantidade, condicao_aplicabilidade, unidade_medida, regra_arredondamento) VALUES
('22222222-2222-2222-2222-000000000001', '3005', '(n_vaos - 1) * n_modulos', 'tipo_arco == "simples" and largura_modulo == 7', 'un', 'nenhum');

INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('22222222-2222-2222-2222-000000000002', '20000000-0000-0000-0000-000000000002', 'Arcos Lanternim');
INSERT INTO public.regras_calculo (posicao_id, produto_codigo, formula_quantidade, condicao_aplicabilidade, unidade_medida, regra_arredondamento) VALUES
('22222222-2222-2222-2222-000000000002', '3417', '(n_vaos - 1) * n_modulos', 'tipo_arco == "lanternim" and largura_modulo == 7', 'un', 'nenhum');

-- 3. DORSAL E CONTRAVENTO
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('33333333-3333-3333-3333-000000000001', '30000000-0000-0000-0000-000000000003', 'Dorsal');
INSERT INTO public.regras_calculo (posicao_id, produto_codigo, formula_quantidade, condicao_aplicabilidade, unidade_medida, regra_arredondamento) VALUES
('33333333-3333-3333-3333-000000000001', '3017', '((n_vaos * vao) / 6) * n_modulos', 'tipo_arco != "lanternim"', 'un', 'cima');

INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('33333333-3333-3333-3333-000000000002', '30000000-0000-0000-0000-000000000003', 'Contravento');
INSERT INTO public.regras_calculo (posicao_id, produto_codigo, formula_quantidade, condicao_aplicabilidade, unidade_medida, regra_arredondamento) VALUES
('33333333-3333-3333-3333-000000000002', '3031', '4 * n_modulos', 'largura_modulo < 10', 'un', 'nenhum');

-- 6. MOLA
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('66666666-6666-6666-6666-000000000001', '60000000-0000-0000-0000-000000000006', 'Molas');
INSERT INTO public.regras_calculo (posicao_id, produto_codigo, formula_quantidade, condicao_aplicabilidade, unidade_medida, regra_arredondamento, margem_perda) VALUES
('66666666-6666-6666-6666-000000000001', '3049', '(((n_vaos*vao) * 4) + (largura_modulo * n_modulos * 4)) / 25', 'cobertura == true', 'un', 'cima', 10.00);

-- 9, 10, 11 PLACEHOLDERS 
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('99999999-9999-9999-9999-000000000001', '90000000-0000-0000-0000-000000000009', 'Parafusos (Pendente)');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-000000000001', 'a0000000-0000-0000-0000-000000000010', 'Telas (Pendente)');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'b0000000-0000-0000-0000-000000000011', 'Filmes (Pendente)');

INSERT INTO public.regras_calculo (posicao_id, produto_codigo, formula_quantidade, condicao_aplicabilidade, unidade_medida, regra_arredondamento) VALUES
('99999999-9999-9999-9999-000000000001', '5107', '0', 'false /* REVISAR REGRA */', 'un', 'nenhum'),
('aaaaaaaa-aaaa-aaaa-aaaa-000000000001', 'TELA-XXX', '0', 'false /* REVISAR REGRA */', 'm2', 'nenhum'),
('bbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'FILME-XXX', '0', 'false /* REVISAR REGRA */', 'm2', 'nenhum');
