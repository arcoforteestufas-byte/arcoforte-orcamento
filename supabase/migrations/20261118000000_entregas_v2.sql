-- =====================================================================
-- ENTREGAS (fase 2): cidade de origem, distâncias e rota por estrada
--  * ent_config: cidade de onde os caminhões saem (padrão Anápolis - GO)
--  * entregas: código IBGE da cidade e distância por estrada desde a origem
--  * viagens: distância total, tempo e o desenho da rota no mapa
-- Precisa da fase 1 (20261117000000_entregas.sql). Pode ser rodado mais de uma vez.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.ent_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  origem_nome TEXT NOT NULL DEFAULT 'Anápolis',
  origem_uf TEXT NOT NULL DEFAULT 'GO',
  origem_ibge INTEGER DEFAULT 5201108,
  origem_lat DOUBLE PRECISION NOT NULL DEFAULT -16.3281,
  origem_lng DOUBLE PRECISION NOT NULL DEFAULT -48.953,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.ent_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ent_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ent leitura" ON public.ent_config;
DROP POLICY IF EXISTS "ent gerencia" ON public.ent_config;
CREATE POLICY "ent leitura" ON public.ent_config FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ent gerencia" ON public.ent_config FOR ALL USING (public.ent_pode_gerenciar()) WITH CHECK (public.ent_pode_gerenciar());

ALTER TABLE public.ent_entregas ADD COLUMN IF NOT EXISTS cidade_ibge INTEGER;
ALTER TABLE public.ent_entregas ADD COLUMN IF NOT EXISTS distancia_km NUMERIC(10,1);       -- da origem até a entrega
ALTER TABLE public.ent_entregas ADD COLUMN IF NOT EXISTS distancia_estimada BOOLEAN NOT NULL DEFAULT false; -- true = linha reta × 1,3 (sem rota)

ALTER TABLE public.ent_viagens ADD COLUMN IF NOT EXISTS distancia_ida_km NUMERIC(10,1);    -- origem → última entrega
ALTER TABLE public.ent_viagens ADD COLUMN IF NOT EXISTS distancia_total_km NUMERIC(10,1);  -- com a volta para a origem
ALTER TABLE public.ent_viagens ADD COLUMN IF NOT EXISTS duracao_total_min INTEGER;
ALTER TABLE public.ent_viagens ADD COLUMN IF NOT EXISTS trechos JSONB;                    -- km de cada trecho, na ordem
ALTER TABLE public.ent_viagens ADD COLUMN IF NOT EXISTS rota JSONB;                       -- desenho da rota [[lat,lng],...]
