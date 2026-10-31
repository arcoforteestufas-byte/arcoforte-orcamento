-- Guarda, por vendedor, a última quantidade de dias de validade usada numa
-- proposta, pra pré-preencher automaticamente nas próximas.
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS dias_validade_padrao INTEGER;
