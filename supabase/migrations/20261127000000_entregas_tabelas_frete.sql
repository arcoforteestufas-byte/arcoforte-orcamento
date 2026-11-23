-- =====================================================================
-- Entregas: várias tabelas de frete
-- - A "Tabela geral" continua em ent_config (é a padrão).
-- - ent_tabelas_frete: tabelas extras com nome (ex.: "Carreta", "Região Norte", "Cliente revenda").
-- - ent_veiculos.tabela_frete_id: tabela que o veículo usa (vazio = tabela geral).
--   Os valores próprios do veículo (R$/km, R$/kg, mínimo), se preenchidos, continuam valendo por cima.
-- Pode ser rodado mais de uma vez sem estragar nada.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.ent_tabelas_frete (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  valor_km NUMERIC(10,2) NOT NULL DEFAULT 0,
  cobrar_volta BOOLEAN NOT NULL DEFAULT true,
  valor_kg NUMERIC(10,4) NOT NULL DEFAULT 0,
  minimo NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto_viagem NUMERIC(5,2) NOT NULL DEFAULT 0,
  observacao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ent_veiculos ADD COLUMN IF NOT EXISTS tabela_frete_id UUID
  REFERENCES public.ent_tabelas_frete(id) ON DELETE SET NULL;

ALTER TABLE public.ent_tabelas_frete ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ent leitura" ON public.ent_tabelas_frete;
DROP POLICY IF EXISTS "ent gerencia" ON public.ent_tabelas_frete;
CREATE POLICY "ent leitura" ON public.ent_tabelas_frete FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ent gerencia" ON public.ent_tabelas_frete FOR ALL
  USING (public.ent_pode_gerenciar()) WITH CHECK (public.ent_pode_gerenciar());
