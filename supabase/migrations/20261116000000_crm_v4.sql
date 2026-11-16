-- =====================================================================
-- CRM ArcoForte (fase 4): integridade dos leads
--  * corrige leads com etapa de outro funil (ficavam invisíveis no quadro)
--  * trava no banco: a etapa do lead sempre pertence ao funil do lead
--  * registro de leads excluídos (para saber quem excluiu e quando)
-- Precisa das fases 1, 2 e 3 já rodadas. Pode ser rodado mais de uma vez.
-- =====================================================================

-- 1) Corrige os leads que estão com etapa de outro funil:
--    vão para a primeira etapa "em andamento" do funil em que estão
UPDATE public.crm_leads l
   SET etapa_id = (SELECT e2.id FROM public.crm_etapas e2
                    WHERE e2.funil_id = l.funil_id AND e2.tipo = 'aberta'
                    ORDER BY e2.ordem LIMIT 1),
       status = 'aberto', ganho_em = NULL, perdido_em = NULL,
       etapa_desde = now(), atualizado_em = now()
 WHERE NOT EXISTS (SELECT 1 FROM public.crm_etapas e WHERE e.id = l.etapa_id AND e.funil_id = l.funil_id)
   AND EXISTS (SELECT 1 FROM public.crm_etapas e2 WHERE e2.funil_id = l.funil_id AND e2.tipo = 'aberta');

-- 2) Trava: a etapa precisa ser do mesmo funil do lead
CREATE OR REPLACE FUNCTION public.crm_valida_etapa_lead()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.crm_etapas WHERE id = NEW.etapa_id AND funil_id = NEW.funil_id) THEN
    RAISE EXCEPTION 'Etapa não pertence ao funil do lead. Atualize a tela e tente de novo.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS crm_leads_valida_etapa ON public.crm_leads;
CREATE TRIGGER crm_leads_valida_etapa
  BEFORE INSERT OR UPDATE OF etapa_id, funil_id ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_valida_etapa_lead();

-- 3) Registro de leads excluídos
CREATE TABLE IF NOT EXISTS public.crm_leads_excluidos (
  id UUID PRIMARY KEY,
  titulo TEXT,
  funil TEXT,
  etapa TEXT,
  dados JSONB,
  excluido_por UUID,
  excluido_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_leads_excluidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm excluidos admin" ON public.crm_leads_excluidos;
CREATE POLICY "crm excluidos admin" ON public.crm_leads_excluidos FOR SELECT USING (public.crm_is_admin());

CREATE OR REPLACE FUNCTION public.crm_registra_exclusao_lead()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.crm_leads_excluidos (id, titulo, funil, etapa, dados, excluido_por)
  VALUES (OLD.id, OLD.titulo,
          (SELECT nome FROM public.crm_funis WHERE id = OLD.funil_id),
          (SELECT nome FROM public.crm_etapas WHERE id = OLD.etapa_id),
          to_jsonb(OLD), auth.uid())
  ON CONFLICT (id) DO NOTHING;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS crm_leads_registra_exclusao ON public.crm_leads;
CREATE TRIGGER crm_leads_registra_exclusao
  AFTER DELETE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_registra_exclusao_lead();
