-- =====================================================================
-- CRM v9: registro das alterações do prazo de entrega contratual
-- - crm_prazo_alteracoes: cada mudança de prazo de venda fechada, com motivo,
--   quem pediu (cliente ou empresa) e anexo opcional (ex.: print do "ok" do cliente).
--   Serve de prova numa discussão de multa por atraso.
-- - Bucket privado "contratos" para os anexos (só abre por link temporário do sistema).
-- Rode DEPOIS do 20261125000000_crm_v8_prazo_contratual.sql.
-- Pode ser rodado mais de uma vez sem estragar nada.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.crm_prazo_alteracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  prazo_anterior DATE,
  prazo_novo DATE NOT NULL,
  pedido_por TEXT NOT NULL DEFAULT 'cliente' CHECK (pedido_por IN ('cliente', 'empresa')),
  motivo TEXT NOT NULL,
  anexo_caminho TEXT,
  anexo_nome TEXT,
  criado_por UUID DEFAULT auth.uid(),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_prazo_alteracoes_lead_idx ON public.crm_prazo_alteracoes (lead_id, criado_em DESC);

ALTER TABLE public.crm_prazo_alteracoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prazo alt leitura" ON public.crm_prazo_alteracoes;
DROP POLICY IF EXISTS "prazo alt admin" ON public.crm_prazo_alteracoes;
-- vê quem vê o lead (as regras de crm_leads já valem dentro do EXISTS)
CREATE POLICY "prazo alt leitura" ON public.crm_prazo_alteracoes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.crm_leads l WHERE l.id = lead_id));
-- só o administrador registra (o prazo de venda fechada é contratual)
CREATE POLICY "prazo alt admin" ON public.crm_prazo_alteracoes FOR INSERT
  WITH CHECK (public.crm_is_admin());

-- Bucket privado para os anexos (o sistema envia e gera o link com a chave de serviço)
INSERT INTO storage.buckets (id, name, public)
VALUES ('contratos', 'contratos', false)
ON CONFLICT (id) DO NOTHING;
