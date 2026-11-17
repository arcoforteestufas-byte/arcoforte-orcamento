-- =====================================================================
-- ENTREGAS (fase 3): tabela de frete para o cálculo no CRM e no orçamento
--  frete = km cobrados × R$/km + peso × R$/kg   (com desconto se aproveitar viagem já programada)
--  nunca menor que o frete mínimo
-- Precisa das fases 1 e 2 de entregas. Pode ser rodado mais de uma vez.
-- =====================================================================

ALTER TABLE public.ent_config ADD COLUMN IF NOT EXISTS frete_valor_km NUMERIC(10,2) NOT NULL DEFAULT 6.50;      -- R$ por km
ALTER TABLE public.ent_config ADD COLUMN IF NOT EXISTS frete_cobrar_volta BOOLEAN NOT NULL DEFAULT true;         -- cobra ida e volta
ALTER TABLE public.ent_config ADD COLUMN IF NOT EXISTS frete_valor_kg NUMERIC(10,4) NOT NULL DEFAULT 0;           -- R$ por kg de carga
ALTER TABLE public.ent_config ADD COLUMN IF NOT EXISTS frete_minimo NUMERIC(12,2) NOT NULL DEFAULT 0;             -- R$ mínimo
ALTER TABLE public.ent_config ADD COLUMN IF NOT EXISTS frete_desconto_viagem NUMERIC(5,2) NOT NULL DEFAULT 30;    -- % de desconto ao aproveitar viagem
ALTER TABLE public.ent_config ADD COLUMN IF NOT EXISTS frete_observacao TEXT;                                     -- texto padrão no orçamento
