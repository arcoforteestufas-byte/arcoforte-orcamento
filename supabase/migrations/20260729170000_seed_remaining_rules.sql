
-- Novos Produtos
INSERT INTO public.produtos (codigo, descricao, unidade, preco_unitario) VALUES
('3021', 'Poste 3,80x100x50 GALV', 'un', 0),
('3022', 'Poste 4,80x100x50 GALV', 'un', 0),
('3104', 'Poste 6,00x100x50 GALV', 'un', 0),
('3120', 'Poste Topo de Arco Simples GALV', 'un', 0),
('3023', 'Poste Topo de Arco Simples GALV', 'un', 0),
('3419', 'Poste Topo de Arco Duplo GALV', 'un', 0),
('3124', 'Poste Topo de Arco Duplo GALV', 'un', 0),
('3070', 'Poste Topo de Arco Duplo GALV', 'un', 0),
('3006', 'Arco Simples 8m', 'un', 0),
('3415', 'Arco Duplo 7m', 'un', 0),
('3108', 'Arco Duplo 8m', 'un', 0),
('3007', 'Arco Duplo 10m', 'un', 0),
('3098', 'Arco Lanternim 8m', 'un', 0),
('3014', 'Arco Lanternim 10m', 'un', 0),
('3012', 'Arco Frontal Simples 7m', 'un', 0),
('3013', 'Arco Frontal Simples 8m', 'un', 0),
('3109', 'Arco Frontal Duplo 8m', 'un', 0),
('3386', 'Arco Frontal Duplo 10m', 'un', 0),
('3165', 'Arco Frontal Lanternim 7m', 'un', 0),
('3110', 'Arco Frontal Lanternim 8m', 'un', 0),
('3043', 'Arco Frontal Lanternim 10m', 'un', 0),
('3407', 'Arco Duplo de Divisa', 'un', 0),
('3408', 'Arco Duplo de Divisa', 'un', 0),
('3409', 'Arco Duplo de Divisa', 'un', 0),
('3420', 'Arco Lanternim de Divisa', 'un', 0),
('3421', 'Arco Lanternim de Divisa', 'un', 0),
('3422', 'Arco Lanternim de Divisa', 'un', 0),
('3017', 'Dorsal 2 6m', 'un', 0),
('3031', 'Contravento 3,85m', 'un', 0),
('3032', 'Contravento 4,80m', 'un', 0),
('3027', 'Encaixe Central GALV', 'un', 0),
('3035', 'Lateral Perfil Simples 6m', 'un', 0),
('3034', 'Lateral Perfil Duplo 6m', 'un', 0),
('5200', 'Calha Maxx 6m', 'un', 0),
('5110', 'Calha Big Maxx 8m', 'un', 0),
('3042', 'Frontal 50x30', 'un', 0),
('3015', 'Frontal 50x30', 'un', 0),
('3016', 'Frontal 50x30', 'un', 0),
('5085', 'Perfil Aluminio Simples 6m', 'un', 0),
('3063', 'Kit Emenda Par', 'un', 0),
('3018', 'Espera de Arco GALV', 'un', 0),
('3019', 'Suporte Calha Lateral GALV', 'un', 0),
('3089', 'Suporte Entrada Agua Direito', 'un', 0),
('3085', 'Suporte Entrada Agua Esquerdo', 'un', 0),
('3093', 'Suporte Saida Agua Direito', 'un', 0),
('3094', 'Suporte Saida Agua Esquerdo', 'un', 0),
('3020', 'Suporte Calha Dupla Central', 'un', 0),
('3090', 'Suporte Entrada Agua Duplo', 'un', 0),
('3095', 'Suporte Saida Agua Duplo', 'un', 0),
('5024', 'PU Selante 400gr', 'un', 0),
('3049', 'Mola de Fixacao 25m', 'un', 0),
('5009', 'Cabo de Aco 3/16', 'un', 0),
('5309', 'Kit Suporte 25un', 'un', 0),
('5308', 'Kit Esticador', 'un', 0),
('3058', 'Chumbador', 'un', 0),
('3033', 'Kit Porta de Abrir 2,00x1,00', 'un', 0),
('3039', 'Kit Porta de Correr 1,20x2,00', 'un', 0),
('3073', 'Kit Porta de Correr 2,10x3,00', 'un', 0),
('5107', 'Kit Parafuso 3x5/16', 'un', 0),
('5114', 'Kit Parafuso 1x5/16', 'un', 0),
('3150', 'Anti-Camara Frontal', 'un', 0),
('3160', 'Anti-Camara Lateral', 'un', 0)
ON CONFLICT (codigo) DO NOTHING;

-- Novas Posições
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000001-0000-0000-0000-0000000000c8', '10000000-0000-0000-0000-000000000001', 'Canto');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000001-0000-0000-0000-0000000000c9', '10000000-0000-0000-0000-000000000001', 'Lateral 1 e 2');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000001-0000-0000-0000-0000000000ca', '10000000-0000-0000-0000-000000000001', 'Interno Divisa Modular');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000001-0000-0000-0000-0000000000cb', '10000000-0000-0000-0000-000000000001', 'Frontal Divisa Modular');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000001-0000-0000-0000-0000000000cc', '10000000-0000-0000-0000-000000000001', 'Topo de Arco');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000001-0000-0000-0000-0000000000cd', '10000000-0000-0000-0000-000000000001', 'Divisa (largura)');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000002-0000-0000-0000-0000000000ce', '20000000-0000-0000-0000-000000000002', 'Arcos Internos');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000002-0000-0000-0000-0000000000cf', '20000000-0000-0000-0000-000000000002', 'Arcos Lanternim');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000002-0000-0000-0000-0000000000d0', '20000000-0000-0000-0000-000000000002', 'Frontal');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000002-0000-0000-0000-0000000000d1', '20000000-0000-0000-0000-000000000002', 'Divisa');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000003-0000-0000-0000-0000000000d2', '30000000-0000-0000-0000-000000000003', 'Topo (por modulo)');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000003-0000-0000-0000-0000000000d3', '30000000-0000-0000-0000-000000000003', 'Cabeceiras');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000003-0000-0000-0000-0000000000d4', '30000000-0000-0000-0000-000000000003', 'Arco Interno');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000004-0000-0000-0000-0000000000d5', '40000000-0000-0000-0000-000000000004', 'Lateral 1 e 2 (superior)');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000004-0000-0000-0000-0000000000d6', '40000000-0000-0000-0000-000000000004', 'Calha Lateral');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000004-0000-0000-0000-0000000000d7', '40000000-0000-0000-0000-000000000004', 'Calha Central');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000004-0000-0000-0000-0000000000d8', '40000000-0000-0000-0000-000000000004', 'Frente/Fundo (1 modulo)');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000004-0000-0000-0000-0000000000d9', '40000000-0000-0000-0000-000000000004', 'Frente/Fundo (2+ modulos)');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000004-0000-0000-0000-0000000000da', '40000000-0000-0000-0000-000000000004', 'Fixacao Inferior (Mureta)');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000005-0000-0000-0000-0000000000db', '50000000-0000-0000-0000-000000000005', 'Emenda Lateral');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000005-0000-0000-0000-0000000000dc', '50000000-0000-0000-0000-000000000005', 'Espera de Arco');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000005-0000-0000-0000-0000000000dd', '50000000-0000-0000-0000-000000000005', 'Suporte Calha Lateral');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000005-0000-0000-0000-0000000000de', '50000000-0000-0000-0000-000000000005', 'Suporte Entrada Agua D');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000005-0000-0000-0000-0000000000df', '50000000-0000-0000-0000-000000000005', 'Suporte Entrada Agua E');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000005-0000-0000-0000-0000000000e0', '50000000-0000-0000-0000-000000000005', 'Suporte Saida Agua D');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000005-0000-0000-0000-0000000000e1', '50000000-0000-0000-0000-000000000005', 'Suporte Saida Agua E');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000005-0000-0000-0000-0000000000e2', '50000000-0000-0000-0000-000000000005', 'Suporte Calha Dupla Central');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000005-0000-0000-0000-0000000000e3', '50000000-0000-0000-0000-000000000005', 'Suporte Entrada Duplo');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000005-0000-0000-0000-0000000000e4', '50000000-0000-0000-0000-000000000005', 'Suporte Saida Duplo');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000005-0000-0000-0000-0000000000e5', '50000000-0000-0000-0000-000000000005', 'PU Selante');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000006-0000-0000-0000-0000000000e6', '60000000-0000-0000-0000-000000000006', 'Lateral Superior');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000006-0000-0000-0000-0000000000e7', '60000000-0000-0000-0000-000000000006', 'Frontal Superior');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000006-0000-0000-0000-0000000000e8', '60000000-0000-0000-0000-000000000006', 'Postes de Canto');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000006-0000-0000-0000-0000000000e9', '60000000-0000-0000-0000-000000000006', 'Portas');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000006-0000-0000-0000-0000000000ea', '60000000-0000-0000-0000-000000000006', 'Arcos Frontais');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000007-0000-0000-0000-0000000000eb', '70000000-0000-0000-0000-000000000007', 'Internos');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000007-0000-0000-0000-0000000000ec', '70000000-0000-0000-0000-000000000007', 'Lateral 1 e 2');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000007-0000-0000-0000-0000000000ed', '70000000-0000-0000-0000-000000000007', 'Divisa Modular Frontal');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000007-0000-0000-0000-0000000000ee', '70000000-0000-0000-0000-000000000007', 'Topo de Arco');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000007-0000-0000-0000-0000000000ef', '70000000-0000-0000-0000-000000000007', 'Travamento em X');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000007-0000-0000-0000-0000000000f0', '70000000-0000-0000-0000-000000000007', 'Kit Suporte');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000007-0000-0000-0000-0000000000f1', '70000000-0000-0000-0000-000000000007', 'Kit Esticador');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000007-0000-0000-0000-0000000000f2', '70000000-0000-0000-0000-000000000007', 'Chumbador');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000008-0000-0000-0000-0000000000f3', '80000000-0000-0000-0000-000000000008', 'Cabeceira/Lateral');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000009-0000-0000-0000-0000000000f4', '90000000-0000-0000-0000-000000000009', 'Geral');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000009-0000-0000-0000-0000000000f5', '90000000-0000-0000-0000-000000000009', 'Frontal');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000009-0000-0000-0000-0000000000f6', '90000000-0000-0000-0000-000000000009', 'Lateral');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000010-0000-0000-0000-0000000000f7', 'a0000000-0000-0000-0000-000000000010', 'Lateral/Frontal');
INSERT INTO public.posicoes (id, grupo_id, nome) VALUES ('00000011-0000-0000-0000-0000000000f8', 'b0000000-0000-0000-0000-000000000011', 'Teto');
ON CONFLICT (id) DO NOTHING;

-- Novas Regras
INSERT INTO public.regras_calculo (posicao_id, produto_codigo, formula_quantidade, condicao_aplicabilidade, unidade_medida, regra_arredondamento) VALUES
('00000001-0000-0000-0000-0000000000c8', '3021', '4', 'pe_direito == 3', 'un', 'nenhum'),
('00000001-0000-0000-0000-0000000000c8', '3022', '4', 'pe_direito == 4', 'un', 'nenhum'),
('00000001-0000-0000-0000-0000000000c8', '3104', '4', 'pe_direito == 5', 'un', 'nenhum'),
('00000001-0000-0000-0000-0000000000c9', '3021', '(n_vaos - 1) * 2', 'pe_direito == 3', 'un', 'nenhum'),
('00000001-0000-0000-0000-0000000000c9', '3022', '(n_vaos - 1) * 2', 'pe_direito == 4', 'un', 'nenhum'),
('00000001-0000-0000-0000-0000000000c9', '3104', '(n_vaos - 1) * 2', 'pe_direito == 5', 'un', 'nenhum'),
('00000001-0000-0000-0000-0000000000ca', '3021', '(n_vaos - 1) * (n_modulos - 1)', 'n_modulos > 1 and pe_direito == 3', 'un', 'nenhum'),
('00000001-0000-0000-0000-0000000000ca', '3022', '(n_vaos - 1) * (n_modulos - 1)', 'n_modulos > 1 and pe_direito == 4', 'un', 'nenhum'),
('00000001-0000-0000-0000-0000000000ca', '3104', '(n_vaos - 1) * (n_modulos - 1)', 'n_modulos > 1 and pe_direito == 5', 'un', 'nenhum'),
('00000001-0000-0000-0000-0000000000cb', '3021', '(n_modulos - 1) * 2', 'n_modulos > 1 and pe_direito == 3', 'un', 'nenhum'),
('00000001-0000-0000-0000-0000000000cb', '3022', '(n_modulos - 1) * 2', 'n_modulos > 1 and pe_direito == 4', 'un', 'nenhum'),
('00000001-0000-0000-0000-0000000000cb', '3104', '(n_modulos - 1) * 2', 'n_modulos > 1 and pe_direito == 5', 'un', 'nenhum'),
('00000001-0000-0000-0000-0000000000cc', '3120', '2', 'tipo_arco == ''simples'' and pe_direito == 3', 'un', 'nenhum'),
('00000001-0000-0000-0000-0000000000cc', '3104', '2', 'tipo_arco == ''simples'' and pe_direito == 4', 'un', 'nenhum'),
('00000001-0000-0000-0000-0000000000cc', '3023', '2', 'tipo_arco == ''simples'' and pe_direito == 5', 'un', 'nenhum'),
('00000001-0000-0000-0000-0000000000cc', '3419', '4', 'tipo_arco != ''simples'' and pe_direito == 3', 'un', 'nenhum'),
('00000001-0000-0000-0000-0000000000cc', '3124', '4', 'tipo_arco != ''simples'' and pe_direito == 4', 'un', 'nenhum'),
('00000001-0000-0000-0000-0000000000cc', '3070', '4', 'tipo_arco != ''simples'' and pe_direito == 5', 'un', 'nenhum'),
('00000001-0000-0000-0000-0000000000cd', '3021', 'n_divisas * (n_modulos + 1)', 'n_divisas > 0 and pe_direito == 3', 'un', 'nenhum'),
('00000001-0000-0000-0000-0000000000cd', '3022', 'n_divisas * (n_modulos + 1)', 'n_divisas > 0 and pe_direito == 4', 'un', 'nenhum'),
('00000001-0000-0000-0000-0000000000cd', '3104', 'n_divisas * (n_modulos + 1)', 'n_divisas > 0 and pe_direito == 5', 'un', 'nenhum'),
('00000002-0000-0000-0000-0000000000ce', '3006', '(n_vaos - 1) * n_modulos', 'tipo_arco == ''simples'' and largura_modulo == 8', 'un', 'nenhum'),
('00000002-0000-0000-0000-0000000000ce', '3415', '(n_vaos - 1) * n_modulos', 'tipo_arco == ''duplo'' and largura_modulo == 7', 'un', 'nenhum'),
('00000002-0000-0000-0000-0000000000ce', '3108', '(n_vaos - 1) * n_modulos', 'tipo_arco == ''duplo'' and largura_modulo == 8', 'un', 'nenhum'),
('00000002-0000-0000-0000-0000000000ce', '3007', '(n_vaos - 1) * n_modulos', 'tipo_arco == ''duplo'' and largura_modulo == 10', 'un', 'nenhum'),
('00000002-0000-0000-0000-0000000000cf', '3098', '(n_vaos - 1) * n_modulos', 'tipo_arco == ''lanternim'' and largura_modulo == 8', 'un', 'nenhum'),
('00000002-0000-0000-0000-0000000000cf', '3014', '(n_vaos - 1) * n_modulos', 'tipo_arco == ''lanternim'' and largura_modulo == 10', 'un', 'nenhum'),
('00000002-0000-0000-0000-0000000000d0', '3012', '2', 'tipo_arco == ''simples'' and largura_modulo == 7', 'un', 'nenhum'),
('00000002-0000-0000-0000-0000000000d0', '3013', '2', 'tipo_arco == ''simples'' and largura_modulo == 8', 'un', 'nenhum'),
('00000002-0000-0000-0000-0000000000d0', '3109', '2', 'tipo_arco == ''duplo'' and largura_modulo == 8', 'un', 'nenhum'),
('00000002-0000-0000-0000-0000000000d0', '3386', '2', 'tipo_arco == ''duplo'' and largura_modulo == 10', 'un', 'nenhum'),
('00000002-0000-0000-0000-0000000000d0', '3165', '2', 'tipo_arco == ''lanternim'' and largura_modulo == 7', 'un', 'nenhum'),
('00000002-0000-0000-0000-0000000000d0', '3110', '2', 'tipo_arco == ''lanternim'' and largura_modulo == 8', 'un', 'nenhum'),
('00000002-0000-0000-0000-0000000000d0', '3043', '2', 'tipo_arco == ''lanternim'' and largura_modulo == 10', 'un', 'nenhum'),
('00000002-0000-0000-0000-0000000000d1', '3407', 'n_divisas', 'tipo_arco == ''duplo'' and n_divisas > 0 and largura_modulo == 7', 'un', 'nenhum'),
('00000002-0000-0000-0000-0000000000d1', '3408', 'n_divisas', 'tipo_arco == ''duplo'' and n_divisas > 0 and largura_modulo == 8', 'un', 'nenhum'),
('00000002-0000-0000-0000-0000000000d1', '3409', 'n_divisas', 'tipo_arco == ''duplo'' and n_divisas > 0 and largura_modulo == 10', 'un', 'nenhum'),
('00000002-0000-0000-0000-0000000000d1', '3420', 'n_divisas', 'tipo_arco == ''lanternim'' and n_divisas > 0 and largura_modulo == 7', 'un', 'nenhum'),
('00000002-0000-0000-0000-0000000000d1', '3421', 'n_divisas', 'tipo_arco == ''lanternim'' and n_divisas > 0 and largura_modulo == 8', 'un', 'nenhum'),
('00000002-0000-0000-0000-0000000000d1', '3422', 'n_divisas', 'tipo_arco == ''lanternim'' and n_divisas > 0 and largura_modulo == 10', 'un', 'nenhum'),
('00000003-0000-0000-0000-0000000000d2', '3017', 'ceil((n_vaos * vao * n_modulos) / 6)', 'tipo_arco != ''lanternim''', 'un', 'nenhum'),
('00000003-0000-0000-0000-0000000000d3', '3031', '4 * n_modulos', 'largura_modulo == 7 or largura_modulo == 8', 'un', 'nenhum'),
('00000003-0000-0000-0000-0000000000d3', '3032', '4 * n_modulos', 'largura_modulo == 10', 'un', 'nenhum'),
('00000003-0000-0000-0000-0000000000d4', '3027', '(n_vaos - 1) * n_modulos', 'tipo_arco != ''lanternim''', 'un', 'nenhum'),
('00000004-0000-0000-0000-0000000000d5', '3035', 'ceil((n_vaos * vao) / 6)', 'cobertura == true and fechamento_lateral == false', 'un', 'nenhum'),
('00000004-0000-0000-0000-0000000000d5', '3034', 'ceil((n_vaos * vao) / 6)', 'fechamento_lateral == true', 'un', 'nenhum'),
('00000004-0000-0000-0000-0000000000d6', '5200', 'ceil((n_vaos * vao) / 6)', 'calha_lateral == true and vao == 3', 'un', 'nenhum'),
('00000004-0000-0000-0000-0000000000d6', '5110', 'ceil((n_vaos * vao) / 8)', 'calha_lateral == true and vao == 4', 'un', 'nenhum'),
('00000004-0000-0000-0000-0000000000d7', '5200', 'ceil((n_vaos * vao * (n_modulos - 1)) / 6)', 'n_modulos > 1 and vao == 3', 'un', 'nenhum'),
('00000004-0000-0000-0000-0000000000d7', '5110', 'ceil((n_vaos * vao * (n_modulos - 1)) / 8)', 'n_modulos > 1 and vao == 4', 'un', 'nenhum'),
('00000004-0000-0000-0000-0000000000d8', '3042', '2', 'n_modulos == 1 and largura_modulo == 7', 'un', 'nenhum'),
('00000004-0000-0000-0000-0000000000d8', '3015', '2', 'n_modulos == 1 and largura_modulo == 8', 'un', 'nenhum'),
('00000004-0000-0000-0000-0000000000d8', '3016', '2', 'n_modulos == 1 and largura_modulo == 10', 'un', 'nenhum'),
('00000004-0000-0000-0000-0000000000d9', '3035', 'ceil((n_modulos * largura_modulo) / 6) * 2', 'n_modulos > 1 and fechamento_lateral == false', 'un', 'nenhum'),
('00000004-0000-0000-0000-0000000000d9', '3034', 'ceil((n_modulos * largura_modulo) / 6) * 2', 'n_modulos > 1 and fechamento_lateral == true', 'un', 'nenhum'),
('00000004-0000-0000-0000-0000000000da', '5085', 'ceil(((n_vaos * vao) * 2 + (n_modulos * largura_modulo) * 2) / 6)', 'fixacao_inferior == ''mureta''', 'un', 'nenhum'),
('00000005-0000-0000-0000-0000000000db', '3063', 'max(0, ceil((n_vaos * vao) / 6) - 1) * (n_modulos == 1 ? 2 : 3)', 'fechamento_lateral == true', 'un', 'nenhum'),
('00000005-0000-0000-0000-0000000000dc', '3018', '2 * (n_vaos + 1)', 'calha_lateral == false', 'un', 'nenhum'),
('00000005-0000-0000-0000-0000000000dd', '3019', '(n_vaos - 1) * 2', 'calha_lateral == true', 'un', 'nenhum'),
('00000005-0000-0000-0000-0000000000de', '3089', '1', 'calha_lateral == true', 'un', 'nenhum'),
('00000005-0000-0000-0000-0000000000df', '3085', '1', 'calha_lateral == true', 'un', 'nenhum'),
('00000005-0000-0000-0000-0000000000e0', '3093', '1', 'calha_lateral == true', 'un', 'nenhum'),
('00000005-0000-0000-0000-0000000000e1', '3094', '1', 'calha_lateral == true', 'un', 'nenhum'),
('00000005-0000-0000-0000-0000000000e2', '3020', 'n_modulos - 1', 'n_modulos > 1', 'un', 'nenhum'),
('00000005-0000-0000-0000-0000000000e3', '3090', 'n_modulos - 1', 'n_modulos > 1', 'un', 'nenhum'),
('00000005-0000-0000-0000-0000000000e4', '3095', 'n_modulos - 1', 'n_modulos > 1', 'un', 'nenhum'),
('00000005-0000-0000-0000-0000000000e5', '5024', 'ceil(((n_vaos * vao) / (vao * 2) * n_modulos) / 2.5)', 'calha_lateral == true or n_modulos > 1', 'un', 'nenhum'),
('00000006-0000-0000-0000-0000000000e6', '3049', 'ceil((n_vaos * vao * (cobertura == true and fechamento_lateral == true ? 4 : 2)) / 25)', 'cobertura == true or fechamento_lateral == true', 'un', 'nenhum'),
('00000006-0000-0000-0000-0000000000e7', '3049', '(n_modulos * largura_modulo) * (cobertura == true and fechamento_lateral == true ? 4 : 2)', 'true', 'un', 'nenhum'),
('00000006-0000-0000-0000-0000000000e8', '3049', '(pe_direito * 4) * 2', 'true', 'un', 'nenhum'),
('00000006-0000-0000-0000-0000000000e9', '3049', '25 * portas_abrir + 25 * portas_correr', 'portas_abrir > 0 or portas_correr > 0', 'un', 'nenhum'),
('00000006-0000-0000-0000-0000000000ea', '3049', '(largura_modulo * 1.10) * 4', 'true', 'un', 'nenhum'),
('00000007-0000-0000-0000-0000000000eb', '5009', '(n_vaos - 1) * n_modulos', 'true', 'un', 'nenhum'),
('00000007-0000-0000-0000-0000000000ec', '5009', '(n_vaos + 1) * 2', 'true', 'un', 'nenhum'),
('00000007-0000-0000-0000-0000000000ed', '5009', '(n_modulos - 1) * 2', 'n_modulos > 1', 'un', 'nenhum'),
('00000007-0000-0000-0000-0000000000ee', '5009', '4', 'true', 'un', 'nenhum'),
('00000007-0000-0000-0000-0000000000ef', '5009', '(n_modulos + 1) * travamentos_x * 2', 'travamentos_x > 0', 'un', 'nenhum'),
('00000007-0000-0000-0000-0000000000f0', '5309', 'ceil((((n_vaos - 1) * n_modulos * 2) + ((n_vaos + 1) * 2) + ((n_modulos - 1) * 2) + 4) * 1.05 / 25)', 'true', 'un', 'nenhum'),
('00000007-0000-0000-0000-0000000000f1', '5308', 'ceil((((n_vaos - 1) * n_modulos) + ((n_vaos + 1) * 2) + ((n_modulos - 1) * 2) + 4 + ((n_modulos + 1) * travamentos_x * 2)) * 1.05)', 'true', 'un', 'nenhum'),
('00000007-0000-0000-0000-0000000000f2', '3058', 'ceil((((n_vaos + 1) * 2) + ((n_modulos - 1) * 2) + 4) * 1.05)', 'true', 'un', 'nenhum'),
('00000008-0000-0000-0000-0000000000f3', '3033', 'portas_abrir', 'portas_abrir > 0', 'un', 'nenhum'),
('00000008-0000-0000-0000-0000000000f3', '3039', 'portas_correr', 'portas_correr > 0', 'un', 'nenhum'),
('00000008-0000-0000-0000-0000000000f3', '3073', 'portas_correr', 'portas_correr > 0', 'un', 'nenhum');
