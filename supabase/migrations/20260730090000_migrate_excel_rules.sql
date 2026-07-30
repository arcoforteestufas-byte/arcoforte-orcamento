-- Atualização das Regras de Cálculo com as fórmulas exatas do Excel
-- Adaptadas para as funções recém-adicionadas no engine (IF, AND, SUM, etc)

UPDATE public.regras_calculo
SET formula_quantidade = '(((n_vaos * vao)/3-1)*n_modulos)-(IF(n_divisas>0, n_divisas*n_modulos, 0))'
WHERE produto_codigo = '3005' AND condicao_aplicabilidade = 'tipo_arco == "simples" and largura_modulo == 7';

UPDATE public.regras_calculo
SET formula_quantidade = '(((n_vaos * vao)/3-1)*n_modulos)-(IF(n_divisas>0, n_divisas*n_modulos, 0))'
WHERE produto_codigo = '3417' AND condicao_aplicabilidade = 'tipo_arco == "lanternim" and largura_modulo == 7';

UPDATE public.regras_calculo
SET formula_quantidade = 'IF(n_modulos>0, (((n_vaos * vao) / 3) + 1) * (n_modulos + 1) - ((n_modulos+1)*2), 0) - (IF(n_divisas>0, n_divisas*n_modulos+n_divisas, 0))'
WHERE produto_codigo = '3021' AND condicao_aplicabilidade = 'pe_direito == 3';

UPDATE public.regras_calculo
SET formula_quantidade = 'SUM((n_modulos+1)*2)'
WHERE produto_codigo = '3037' AND condicao_aplicabilidade = 'pe_direito == 3';

-- Dorsal (Cálculo F23 e G23 do Excel)
UPDATE public.regras_calculo
SET formula_quantidade = 'IF(n_modulos==1, 0, IF(FLOOR((largura_modulo*n_modulos)/6, 0.5)>1, ROUNDUP(FLOOR((largura_modulo*n_modulos)/6, 0.5)-1, 0), 0)*2)'
WHERE produto_codigo = '3017';

-- Contravento
UPDATE public.regras_calculo
SET formula_quantidade = '4 * n_modulos'
WHERE produto_codigo = '3031';

-- Molas (Laterais, Frontais e Calhas)
UPDATE public.regras_calculo
SET formula_quantidade = '((((n_vaos * vao)*2)*2) + (((largura_modulo*n_modulos)*2)*2) + (IF(n_vaos>1, (n_vaos-1)*largura_modulo, 0)*2)) / 25'
WHERE produto_codigo = '3049';
