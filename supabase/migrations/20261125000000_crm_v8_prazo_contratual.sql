-- =====================================================================
-- CRM v8: prazo de entrega contratual e cidade de entrega do frete
-- - orcamentos.frete_cidade / frete_uf / frete_cidade_ibge: cidade para onde o frete foi
--   calculado. É a cidade de entrega usada quando a venda vai para Entregas.
-- - Prazo de entrega do lead GANHO é contratual (multa se atrasar): depois do ganho,
--   só o administrador pode alterar.
-- Rode DEPOIS do 20261124000000_crm_v7_ganho_vendas.sql.
-- Pode ser rodado mais de uma vez sem estragar nada.
-- =====================================================================

ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS frete_cidade TEXT;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS frete_uf TEXT;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS frete_cidade_ibge INTEGER;

-- Trava: prazo de entrega de lead ganho só muda pelo administrador
CREATE OR REPLACE FUNCTION public.crm_trava_prazo_ganho()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'ganho' AND NEW.status = 'ganho'
     AND NEW.prazo_entrega IS DISTINCT FROM OLD.prazo_entrega
     AND NOT public.crm_is_admin() THEN
    RAISE EXCEPTION 'O prazo de entrega de uma venda fechada é contratual: só o administrador pode alterar.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS crm_trava_prazo_ganho ON public.crm_leads;
CREATE TRIGGER crm_trava_prazo_ganho BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_trava_prazo_ganho();
