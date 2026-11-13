-- =====================================================================
-- CRM ArcoForte (fase 3): responsável por lead entre as equipes
--  * rodízio automático por funil (ex.: leads chegando no SDR alternam entre as SDRs)
--  * "Assumir lead" na fila compartilhada
--  * envio para outro funil exige responsável quando o atual não trabalha lá
-- Precisa das fases 1 e 2 já rodadas. Pode ser rodado mais de uma vez.
-- =====================================================================

ALTER TABLE public.crm_funis ADD COLUMN IF NOT EXISTS distribuicao_automatica BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.crm_funis ADD COLUMN IF NOT EXISTS ultimo_distribuido UUID REFERENCES public.usuarios(id) ON DELETE SET NULL;

-- Próximo usuário do rodízio de um funil (avança o ponteiro). NULL se o funil não tem lista de usuários.
CREATE OR REPLACE FUNCTION public.crm_proximo_rodizio(p_funil UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ultimo UUID;
  v_ultimo_nome TEXT;
  v_prox UUID;
BEGIN
  SELECT ultimo_distribuido INTO v_ultimo FROM public.crm_funis WHERE id = p_funil FOR UPDATE;
  SELECT nome INTO v_ultimo_nome FROM public.usuarios WHERE id = v_ultimo;

  -- quem vem depois do último (ordem alfabética); se não houver, volta ao primeiro
  SELECT u.id INTO v_prox
    FROM public.crm_funil_usuarios fu JOIN public.usuarios u ON u.id = fu.usuario_id
   WHERE fu.funil_id = p_funil
     AND v_ultimo_nome IS NOT NULL
     AND (u.nome, u.id::text) > (v_ultimo_nome, v_ultimo::text)
   ORDER BY u.nome, u.id::text LIMIT 1;
  IF v_prox IS NULL THEN
    SELECT u.id INTO v_prox
      FROM public.crm_funil_usuarios fu JOIN public.usuarios u ON u.id = fu.usuario_id
     WHERE fu.funil_id = p_funil
     ORDER BY u.nome, u.id::text LIMIT 1;
  END IF;

  IF v_prox IS NOT NULL THEN
    UPDATE public.crm_funis SET ultimo_distribuido = v_prox WHERE id = p_funil;
  END IF;
  RETURN v_prox;
END $$;
REVOKE ALL ON FUNCTION public.crm_proximo_rodizio(UUID) FROM public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Enviar lead para outro funil (substitui a versão da fase 2)
--  p_vendedor informado  → vai para essa pessoa
--  p_vendedor vazio      → rodízio (se ligado no destino) ou mantém o atual,
--                          desde que o atual trabalhe no funil de destino
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crm_enviar_lead(p_lead UUID, p_funil UUID, p_vendedor UUID DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  l public.crm_leads%ROWTYPE;
  f public.crm_funis%ROWTYPE;
  v_etapa UUID;
  v_funil_de TEXT;
  v_vendedor UUID;
  v_nome_vendedor TEXT;
  v_tem_lista BOOLEAN;
  v_rodizio BOOLEAN := false;
BEGIN
  SELECT * INTO l FROM public.crm_leads WHERE id = p_lead;
  IF NOT FOUND THEN RETURN 'Lead não encontrado.'; END IF;
  IF NOT public.crm_pode_editar_lead(l.funil_id, l.vendedor_id) THEN RETURN 'Sem permissão para enviar este lead.'; END IF;

  SELECT * INTO f FROM public.crm_funis WHERE id = p_funil;
  IF NOT FOUND THEN RETURN 'Funil de destino não encontrado.'; END IF;

  SELECT id INTO v_etapa FROM public.crm_etapas
   WHERE funil_id = p_funil AND tipo = 'aberta' ORDER BY ordem LIMIT 1;
  IF v_etapa IS NULL THEN RETURN 'O funil de destino não tem etapa em andamento.'; END IF;

  v_tem_lista := EXISTS (SELECT 1 FROM public.crm_funil_usuarios WHERE funil_id = p_funil);

  IF p_vendedor IS NOT NULL THEN
    IF v_tem_lista AND NOT EXISTS (SELECT 1 FROM public.crm_funil_usuarios WHERE funil_id = p_funil AND usuario_id = p_vendedor) THEN
      RETURN 'Essa pessoa não trabalha no funil de destino.';
    END IF;
    v_vendedor := p_vendedor;
  ELSIF f.distribuicao_automatica AND v_tem_lista THEN
    v_vendedor := public.crm_proximo_rodizio(p_funil);
    v_rodizio := true;
  ELSE
    -- mantém o responsável atual, mas só se ele trabalha no destino (senão o lead some para a equipe)
    IF v_tem_lista AND NOT EXISTS (SELECT 1 FROM public.crm_funil_usuarios WHERE funil_id = p_funil AND usuario_id = l.vendedor_id) THEN
      RETURN 'Escolha o responsável no funil de destino: o responsável atual não trabalha nele.';
    END IF;
    v_vendedor := l.vendedor_id;
  END IF;

  SELECT nome INTO v_funil_de FROM public.crm_funis WHERE id = l.funil_id;
  SELECT nome INTO v_nome_vendedor FROM public.usuarios WHERE id = v_vendedor;

  UPDATE public.crm_leads SET
    funil_id = p_funil, etapa_id = v_etapa, vendedor_id = v_vendedor,
    status = 'aberto', ganho_em = NULL, perdido_em = NULL, motivo_perda_id = NULL, motivo_perda_obs = NULL,
    orcamento_ganho_id = NULL, valor_fechado = NULL,
    etapa_desde = now(), atualizado_em = now(), ordem = extract(epoch FROM now()) * 1000
  WHERE id = p_lead;

  -- o cadastro do cliente acompanha o responsável (senão ele não consegue orçar)
  IF v_vendedor IS DISTINCT FROM l.vendedor_id AND l.cliente_id IS NOT NULL THEN
    UPDATE public.clientes SET vendedor_id = v_vendedor WHERE id = l.cliente_id;
  END IF;

  INSERT INTO public.crm_lead_atividades (lead_id, tipo, descricao, usuario_id)
  VALUES (p_lead, 'etapa',
          format('Enviado do funil "%s" para "%s"%s', v_funil_de, f.nome,
                 CASE WHEN v_vendedor IS DISTINCT FROM l.vendedor_id
                      THEN format(' — responsável: %s%s', v_nome_vendedor, CASE WHEN v_rodizio THEN ' (rodízio)' ELSE '' END)
                      ELSE '' END),
          auth.uid());
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.crm_enviar_lead(UUID, UUID, UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.crm_enviar_lead(UUID, UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------
-- Assumir lead (fila compartilhada): quem trabalha no funil e enxerga o lead
-- vira o responsável. O cadastro do cliente passa junto.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crm_assumir_lead(p_lead UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  l public.crm_leads%ROWTYPE;
  v_nome TEXT;
  v_anterior TEXT;
BEGIN
  SELECT * INTO l FROM public.crm_leads WHERE id = p_lead;
  IF NOT FOUND THEN RETURN 'Lead não encontrado.'; END IF;
  IF l.vendedor_id = auth.uid() THEN RETURN NULL; END IF;
  IF NOT public.crm_pode_ver_lead(l.funil_id, l.vendedor_id) THEN RETURN 'Sem permissão para este lead.'; END IF;
  IF NOT public.crm_is_admin() AND NOT EXISTS (SELECT 1 FROM public.crm_funil_usuarios WHERE funil_id = l.funil_id AND usuario_id = auth.uid())
     AND EXISTS (SELECT 1 FROM public.crm_funil_usuarios WHERE funil_id = l.funil_id) THEN
    RETURN 'Você não trabalha neste funil.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid()) THEN
    RETURN 'Seu usuário não está no cadastro de usuários do sistema.';
  END IF;

  SELECT nome INTO v_nome FROM public.usuarios WHERE id = auth.uid();
  SELECT nome INTO v_anterior FROM public.usuarios WHERE id = l.vendedor_id;

  UPDATE public.crm_leads SET vendedor_id = auth.uid(), atualizado_em = now() WHERE id = p_lead;
  IF l.cliente_id IS NOT NULL THEN
    UPDATE public.clientes SET vendedor_id = auth.uid() WHERE id = l.cliente_id;
  END IF;

  INSERT INTO public.crm_lead_atividades (lead_id, tipo, descricao, usuario_id)
  VALUES (p_lead, 'sistema', format('%s assumiu o lead (antes: %s)', v_nome, coalesce(v_anterior, '—')), auth.uid());
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.crm_assumir_lead(UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.crm_assumir_lead(UUID) TO authenticated;
