-- =====================================================================
-- CRM v9: funil de Follow-up dentro do funil de Vendas
-- - crm_funis.funil_pai_id: funil "filho" que aparece DENTRO do funil pai (aba Vendas | Follow-up).
-- - Cria o "Follow-up" em cada funil de vendas (permite_ganho), com as etapas:
--   Aguardando resposta · Vai decidir depois · Esperando algo para fechar · Ganho · Perdido.
-- - O Follow-up usa a mesma equipe do funil pai (crm_acessa_funil olha o pai).
-- - crm_alternar_followup(lead): vendedor (no próprio lead) ou admin move o lead
--   Vendas -> Follow-up e Follow-up -> Vendas (volta em Negociação), mantendo o responsável.
-- Pode ser rodado mais de uma vez sem estragar nada.
-- =====================================================================

ALTER TABLE public.crm_funis ADD COLUMN IF NOT EXISTS funil_pai_id UUID REFERENCES public.crm_funis(id) ON DELETE SET NULL;

-- acesso ao funil: o funil filho segue a equipe do funil pai
CREATE OR REPLACE FUNCTION public.crm_acessa_funil(p_funil UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH alvo AS (SELECT coalesce((SELECT funil_pai_id FROM public.crm_funis WHERE id = p_funil), p_funil) AS id)
  SELECT public.crm_is_admin()
      OR NOT EXISTS (SELECT 1 FROM public.crm_funil_usuarios u, alvo WHERE u.funil_id = alvo.id)
      OR EXISTS (SELECT 1 FROM public.crm_funil_usuarios u, alvo WHERE u.funil_id = alvo.id AND u.usuario_id = auth.uid())
$$;

-- cria o Follow-up em cada funil de vendas que ainda não tem
DO $$
DECLARE
  pai RECORD;
  novo UUID;
BEGIN
  FOR pai IN
    SELECT * FROM public.crm_funis f
     WHERE f.permite_ganho AND f.funil_pai_id IS NULL AND f.nome NOT ILIKE '%follow%'
       AND NOT EXISTS (SELECT 1 FROM public.crm_funis c WHERE c.funil_pai_id = f.id)
  LOOP
    INSERT INTO public.crm_funis (nome, ordem, cor, descricao, membros_veem_todos, membros_editam_todos, permite_ganho, funil_pai_id, ativo)
    VALUES ('Follow-up', pai.ordem, '#0ea5e9',
            'Leads quentes que receberam proposta mas não estão no momento de comprar',
            pai.membros_veem_todos, pai.membros_editam_todos, true, pai.id, true)
    RETURNING id INTO novo;
    INSERT INTO public.crm_etapas (funil_id, nome, cor, ordem, tipo, probabilidade) VALUES
      (novo, 'Aguardando resposta',        '#7dd3fc', 0, 'aberta', 30),
      (novo, 'Vai decidir depois',         '#38bdf8', 1, 'aberta', 35),
      (novo, 'Esperando algo para fechar', '#0284c7', 2, 'aberta', 40),
      (novo, 'Ganho',                      '#16a34a', 3, 'ganho', 100),
      (novo, 'Perdido',                    '#dc2626', 4, 'perdido', 0);
  END LOOP;
END $$;

-- move o lead entre o funil de vendas e o Follow-up dele
CREATE OR REPLACE FUNCTION public.crm_alternar_followup(p_lead UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  l public.crm_leads%ROWTYPE;
  f public.crm_funis%ROWTYPE;
  d public.crm_funis%ROWTYPE;
  v_etapa UUID;
  v_nome_etapa TEXT;
BEGIN
  SELECT * INTO l FROM public.crm_leads WHERE id = p_lead;
  IF NOT FOUND THEN RETURN 'Lead não encontrado.'; END IF;
  IF NOT public.crm_pode_editar_lead(l.funil_id, l.vendedor_id) THEN RETURN 'Sem permissão para mover este lead.'; END IF;
  IF l.status <> 'aberto' THEN RETURN 'Só lead em andamento pode mudar de funil.'; END IF;
  SELECT * INTO f FROM public.crm_funis WHERE id = l.funil_id;

  IF f.funil_pai_id IS NOT NULL THEN
    -- Follow-up -> Vendas: volta em Negociação (ou na última etapa em andamento)
    SELECT * INTO d FROM public.crm_funis WHERE id = f.funil_pai_id;
    SELECT id, nome INTO v_etapa, v_nome_etapa FROM public.crm_etapas
     WHERE funil_id = d.id AND tipo = 'aberta'
     ORDER BY (nome ILIKE '%negocia%') DESC, ordem DESC LIMIT 1;
  ELSE
    -- Vendas -> Follow-up: entra na primeira etapa
    SELECT * INTO d FROM public.crm_funis WHERE funil_pai_id = f.id AND ativo ORDER BY ordem LIMIT 1;
    IF NOT FOUND THEN RETURN 'Este funil não tem Follow-up.'; END IF;
    SELECT id, nome INTO v_etapa, v_nome_etapa FROM public.crm_etapas
     WHERE funil_id = d.id AND tipo = 'aberta' ORDER BY ordem LIMIT 1;
  END IF;
  IF v_etapa IS NULL THEN RETURN 'O funil de destino não tem etapa em andamento.'; END IF;

  UPDATE public.crm_leads SET
    funil_id = d.id, etapa_id = v_etapa,
    etapa_desde = now(), atualizado_em = now(), ordem = extract(epoch FROM now()) * 1000
  WHERE id = p_lead;

  INSERT INTO public.crm_lead_atividades (lead_id, tipo, descricao, usuario_id)
  VALUES (p_lead, 'etapa', format('Movido de "%s" para "%s" (%s)', f.nome, d.nome, v_nome_etapa), auth.uid());
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.crm_alternar_followup(UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.crm_alternar_followup(UUID) TO authenticated;
