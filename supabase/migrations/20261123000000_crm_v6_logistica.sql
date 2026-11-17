-- =====================================================================
-- CRM v6: acesso do cargo "Logística"
-- - Logística NÃO vê o funil (leads em andamento), orçamentos nem propostas em geral.
-- - Logística VÊ os leads GANHOS por completo (somente leitura): dados do lead,
--   cliente, orçamentos e itens, histórico e tarefas. Pode registrar notas no histórico.
-- Rode DEPOIS do 20261122000000_crm_v5_vendedor_ve_seus.sql.
-- Pode ser rodado mais de uma vez sem estragar nada.
-- =====================================================================

-- cargo "Logística" no login
CREATE OR REPLACE FUNCTION public.crm_eh_logistica()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(auth.jwt() -> 'user_metadata' ->> 'cargo', '') = 'Logística'
$$;

-- o lead é ganho e o usuário é da logística
CREATE OR REPLACE FUNCTION public.crm_logistica_ve_lead(p_lead UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.crm_eh_logistica()
     AND EXISTS (SELECT 1 FROM public.crm_leads WHERE id = p_lead AND status = 'ganho')
$$;

-- orçamento ligado a um lead ganho (para a logística)
CREATE OR REPLACE FUNCTION public.crm_logistica_ve_orcamento(p_orcamento UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.crm_eh_logistica()
     AND EXISTS (SELECT 1 FROM public.orcamentos o JOIN public.crm_leads l ON l.id = o.lead_id
                 WHERE o.id = p_orcamento AND l.status = 'ganho')
$$;

-- cliente de um lead ganho (para a logística)
CREATE OR REPLACE FUNCTION public.crm_logistica_ve_cliente(p_cliente UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.crm_eh_logistica()
     AND EXISTS (SELECT 1 FROM public.crm_leads WHERE cliente_id = p_cliente AND status = 'ganho')
$$;

-- Regras gerais do funil: logística fica de fora (não vê leads em andamento)
CREATE OR REPLACE FUNCTION public.crm_pode_ver_lead(p_funil UUID, p_vendedor UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.crm_is_admin()
      OR (NOT public.crm_eh_logistica() AND public.crm_acessa_funil(p_funil) AND (
            p_vendedor = auth.uid()
         OR public.crm_libera_ver_todos()
         OR (NOT public.crm_eh_vendedor()
             AND coalesce((SELECT membros_veem_todos FROM public.crm_funis WHERE id = p_funil), false))))
$$;

CREATE OR REPLACE FUNCTION public.crm_pode_editar_lead(p_funil UUID, p_vendedor UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.crm_is_admin()
      OR (NOT public.crm_eh_logistica() AND public.crm_acessa_funil(p_funil) AND (
            p_vendedor = auth.uid()
         OR public.crm_libera_editar_todos()
         OR (NOT public.crm_eh_vendedor()
             AND coalesce((SELECT membros_veem_todos AND membros_editam_todos FROM public.crm_funis WHERE id = p_funil), false))))
$$;

-- Leitura dos leads ganhos e de tudo que é deles (as políticas abaixo SOMAM às que já existem)
DROP POLICY IF EXISTS "logistica leads ganhos" ON public.crm_leads;
CREATE POLICY "logistica leads ganhos" ON public.crm_leads
  FOR SELECT USING (public.crm_eh_logistica() AND status = 'ganho');

DROP POLICY IF EXISTS "logistica atividades leitura" ON public.crm_lead_atividades;
DROP POLICY IF EXISTS "logistica atividades inserir" ON public.crm_lead_atividades;
CREATE POLICY "logistica atividades leitura" ON public.crm_lead_atividades
  FOR SELECT USING (public.crm_logistica_ve_lead(lead_id));
CREATE POLICY "logistica atividades inserir" ON public.crm_lead_atividades
  FOR INSERT WITH CHECK (public.crm_logistica_ve_lead(lead_id));

DROP POLICY IF EXISTS "logistica tarefas leitura" ON public.crm_lead_tarefas;
CREATE POLICY "logistica tarefas leitura" ON public.crm_lead_tarefas
  FOR SELECT USING (public.crm_logistica_ve_lead(lead_id));

DROP POLICY IF EXISTS "logistica orcamentos leads ganhos" ON public.orcamentos;
CREATE POLICY "logistica orcamentos leads ganhos" ON public.orcamentos
  FOR SELECT USING (lead_id IS NOT NULL AND public.crm_logistica_ve_lead(lead_id));

DROP POLICY IF EXISTS "logistica itens leads ganhos" ON public.orcamento_itens;
CREATE POLICY "logistica itens leads ganhos" ON public.orcamento_itens
  FOR SELECT USING (public.crm_logistica_ve_orcamento(orcamento_id));

DROP POLICY IF EXISTS "logistica clientes leads ganhos" ON public.clientes;
CREATE POLICY "logistica clientes leads ganhos" ON public.clientes
  FOR SELECT USING (public.crm_logistica_ve_cliente(id));
