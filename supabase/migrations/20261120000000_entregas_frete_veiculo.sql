-- =====================================================================
-- ENTREGAS (fase 4): valor de frete por veículo
--  Cada caminhão/carro pode ter seu próprio R$/km, R$/kg e mínimo.
--  Campo vazio = usa a tabela geral (ent_config).
-- Precisa da fase 3 (20261119000000_entregas_frete.sql). Pode ser rodado mais de uma vez.
-- =====================================================================

ALTER TABLE public.ent_veiculos ADD COLUMN IF NOT EXISTS frete_valor_km NUMERIC(10,2);
ALTER TABLE public.ent_veiculos ADD COLUMN IF NOT EXISTS frete_valor_kg NUMERIC(10,4);
ALTER TABLE public.ent_veiculos ADD COLUMN IF NOT EXISTS frete_minimo NUMERIC(12,2);
