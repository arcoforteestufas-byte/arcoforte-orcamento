-- =====================================================================
-- Entregas: prazo final de entrega do contrato
-- - ent_entregas.prazo_entrega: data limite prevista em contrato (vem da venda / lead ganho).
-- - Entregas ligadas a um lead copiam o prazo do lead ao serem criadas ou religadas.
-- - Quando o prazo do lead muda (ex.: "Alterar prazo"), as entregas ainda não entregues acompanham.
-- - Entrega avulsa (sem lead) pode ter o prazo digitado na própria entrega.
-- Pode ser rodado mais de uma vez sem estragar nada.
-- =====================================================================

ALTER TABLE public.ent_entregas ADD COLUMN IF NOT EXISTS prazo_entrega DATE;

-- preenche as entregas que já existem com o prazo do lead
UPDATE public.ent_entregas e
   SET prazo_entrega = l.prazo_entrega
  FROM public.crm_leads l
 WHERE e.lead_id = l.id
   AND l.prazo_entrega IS NOT NULL
   AND e.prazo_entrega IS DISTINCT FROM l.prazo_entrega;

-- entrega criada/religada a um lead: pega o prazo do contrato
CREATE OR REPLACE FUNCTION public.ent_prazo_do_lead()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p DATE;
BEGIN
  IF NEW.lead_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.lead_id IS DISTINCT FROM OLD.lead_id) THEN
    SELECT prazo_entrega INTO p FROM public.crm_leads WHERE id = NEW.lead_id;
    IF p IS NOT NULL THEN NEW.prazo_entrega := p; END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ent_prazo_do_lead ON public.ent_entregas;
CREATE TRIGGER trg_ent_prazo_do_lead
  BEFORE INSERT OR UPDATE OF lead_id ON public.ent_entregas
  FOR EACH ROW EXECUTE FUNCTION public.ent_prazo_do_lead();

-- prazo do lead mudou: entregas ainda não entregues acompanham
CREATE OR REPLACE FUNCTION public.crm_prazo_para_entregas()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.prazo_entrega IS DISTINCT FROM OLD.prazo_entrega AND NEW.prazo_entrega IS NOT NULL THEN
    UPDATE public.ent_entregas
       SET prazo_entrega = NEW.prazo_entrega
     WHERE lead_id = NEW.id
       AND status NOT IN ('entregue', 'cancelada');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_crm_prazo_para_entregas ON public.crm_leads;
CREATE TRIGGER trg_crm_prazo_para_entregas
  AFTER UPDATE OF prazo_entrega ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_prazo_para_entregas();

NOTIFY pgrst, 'reload schema';
