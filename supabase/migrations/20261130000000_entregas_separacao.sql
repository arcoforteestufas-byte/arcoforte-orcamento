-- =====================================================================
-- Entregas: separação e conferência da carga (galpão)
-- - Novo cargo "Expedição" (definido no cadastro de usuários): separa e confere.
--   Administrador e Logística também podem.
-- - Uma linha por entrega em ent_separacoes, com o andamento item a item:
--   itens = [{chave, separada, motivo, conferida}]
--   (chave = pedido|código|descrição do produto em ent_entregas.itens)
-- - Duas pessoas: quem conferiu não pode ser quem separou (regra no banco).
-- Não mexe em produtos. Pode ser rodado mais de uma vez sem estragar nada.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.ent_pode_separar()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.ent_pode_gerenciar()
      OR coalesce(auth.jwt() -> 'user_metadata' ->> 'cargo', '') = 'Expedição'
$$;

CREATE TABLE IF NOT EXISTS public.ent_separacoes (
  entrega_id UUID PRIMARY KEY REFERENCES public.ent_entregas(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'separando'
    CHECK (status IN ('separando', 'separada', 'conferindo', 'conferida')),
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  divergencia BOOLEAN NOT NULL DEFAULT false,
  obs TEXT,
  separado_por UUID,
  separado_por_nome TEXT,
  separacao_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  separado_em TIMESTAMPTZ,
  conferido_por UUID,
  conferido_por_nome TEXT,
  conferido_em TIMESTAMPTZ,
  devolucoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ent_separacoes_duas_pessoas CHECK (conferido_por IS NULL OR separado_por IS NULL OR conferido_por <> separado_por)
);

CREATE INDEX IF NOT EXISTS ent_separacoes_status_idx ON public.ent_separacoes (status);

ALTER TABLE public.ent_separacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ent separacoes leitura" ON public.ent_separacoes;
DROP POLICY IF EXISTS "ent separacoes grava" ON public.ent_separacoes;
CREATE POLICY "ent separacoes leitura" ON public.ent_separacoes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ent separacoes grava" ON public.ent_separacoes FOR ALL
  USING (public.ent_pode_separar()) WITH CHECK (public.ent_pode_separar());
