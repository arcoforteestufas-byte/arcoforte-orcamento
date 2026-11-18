-- =====================================================================
-- CRM v7: Ganho só no funil de vendas, com prazo de entrega
-- - crm_funis.permite_ganho: marca o(s) funil(is) de vendas. Só neles o lead pode ser Ganho.
--   (Configurações → CRM → editar funil → "Funil de vendas")
-- - crm_leads.prazo_entrega: data prometida ao cliente. Obrigatória para marcar Ganho.
-- - Trava no banco: mesmo por fora da tela, não deixa ganhar fora do funil de vendas
--   nem sem prazo de entrega.
-- Pode ser rodado mais de uma vez sem estragar nada.
-- =====================================================================

ALTER TABLE public.crm_funis ADD COLUMN IF NOT EXISTS permite_ganho BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS prazo_entrega DATE;
ALTER TABLE public.crm_config ADD COLUMN IF NOT EXISTS seed_v7 BOOLEAN NOT NULL DEFAULT false;

-- Primeira vez: marca como funil de vendas o que tem "venda" no nome;
-- se nenhum tiver, os funis que já têm etapa de Ganho. Depois disso, quem decide é o admin.
DO $$
BEGIN
  IF NOT coalesce((SELECT seed_v7 FROM public.crm_config WHERE id = 1), false) THEN
    UPDATE public.crm_funis SET permite_ganho = true WHERE nome ILIKE '%venda%';
    IF NOT EXISTS (SELECT 1 FROM public.crm_funis WHERE permite_ganho) THEN
      UPDATE public.crm_funis f SET permite_ganho = true
       WHERE EXISTS (SELECT 1 FROM public.crm_etapas e WHERE e.funil_id = f.id AND e.tipo = 'ganho');
    END IF;
    UPDATE public.crm_config SET seed_v7 = true WHERE id = 1;
  END IF;
END $$;

-- Trava: lead só vira Ganho no funil de vendas e com prazo de entrega
CREATE OR REPLACE FUNCTION public.crm_valida_ganho()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'ganho' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'ganho') THEN
    IF NOT coalesce((SELECT permite_ganho FROM public.crm_funis WHERE id = NEW.funil_id), false) THEN
      RAISE EXCEPTION 'Lead só pode ser marcado como Ganho no funil de vendas.';
    END IF;
    IF NEW.prazo_entrega IS NULL THEN
      RAISE EXCEPTION 'Defina o prazo de entrega do lead antes de marcar como Ganho.';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS crm_valida_ganho ON public.crm_leads;
CREATE TRIGGER crm_valida_ganho BEFORE INSERT OR UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_valida_ganho();
