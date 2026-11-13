-- =====================================================================
-- CRM ArcoForte (fase 2): Marketing → SDR → Vendedores
--  * acesso por funil (lista de usuários) e "próximo funil"
--  * campos personalizados do lead com pontuação (score quente/frio)
--  * enviar lead para outro funil (função crm_enviar_lead)
-- Precisa da fase 1 (20261113000000_crm.sql) já rodada.
-- Pode ser rodado mais de uma vez sem estragar nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Funis: cor, próximo funil e quem vê o quê (por funil)
-- ---------------------------------------------------------------------
ALTER TABLE public.crm_funis ADD COLUMN IF NOT EXISTS cor TEXT NOT NULL DEFAULT '#d97021';
ALTER TABLE public.crm_funis ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.crm_funis ADD COLUMN IF NOT EXISTS proximo_funil_id UUID REFERENCES public.crm_funis(id) ON DELETE SET NULL;

DO $$
BEGIN
  -- Na primeira vez, herda a configuração geral da fase 1
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'crm_funis' AND column_name = 'membros_veem_todos') THEN
    ALTER TABLE public.crm_funis ADD COLUMN membros_veem_todos BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE public.crm_funis ADD COLUMN membros_editam_todos BOOLEAN NOT NULL DEFAULT false;
    UPDATE public.crm_funis SET
      membros_veem_todos = coalesce((SELECT vendedor_ve_todos FROM public.crm_config WHERE id = 1), false),
      membros_editam_todos = coalesce((SELECT vendedor_ve_todos AND vendedor_edita_todos FROM public.crm_config WHERE id = 1), false);
  END IF;
END $$;

-- Usuários que trabalham em cada funil. Funil sem ninguém na lista = todos podem usar.
CREATE TABLE IF NOT EXISTS public.crm_funil_usuarios (
  funil_id UUID NOT NULL REFERENCES public.crm_funis(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  PRIMARY KEY (funil_id, usuario_id)
);

-- ---------------------------------------------------------------------
-- Campos personalizados + score
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_campos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto', 'numero', 'selecao', 'sim_nao', 'data')),
  -- selecao: [{"id":"..","rotulo":"Até 30 dias","pontos":30}]
  -- numero:  [{"min":0,"pontos":0},{"min":1500,"pontos":10}]  (vale a maior faixa alcançada)
  opcoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  pontos_sim INTEGER NOT NULL DEFAULT 0,          -- sim_nao: pontos quando "Sim"
  funis UUID[] NOT NULL DEFAULT '{}',             -- funis onde o campo aparece (vazio = todos)
  ajuda TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS campos JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.crm_config ADD COLUMN IF NOT EXISTS score_morno INTEGER NOT NULL DEFAULT 30;
ALTER TABLE public.crm_config ADD COLUMN IF NOT EXISTS score_quente INTEGER NOT NULL DEFAULT 60;
ALTER TABLE public.crm_config ADD COLUMN IF NOT EXISTS seed_v2 BOOLEAN NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------
-- Funções de permissão
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crm_acessa_funil(p_funil UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.crm_is_admin()
      OR NOT EXISTS (SELECT 1 FROM public.crm_funil_usuarios WHERE funil_id = p_funil)
      OR EXISTS (SELECT 1 FROM public.crm_funil_usuarios WHERE funil_id = p_funil AND usuario_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.crm_pode_ver_lead(p_funil UUID, p_vendedor UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.crm_is_admin()
      OR (public.crm_acessa_funil(p_funil) AND (
            p_vendedor = auth.uid()
         OR coalesce((SELECT membros_veem_todos FROM public.crm_funis WHERE id = p_funil), false)))
$$;

CREATE OR REPLACE FUNCTION public.crm_pode_editar_lead(p_funil UUID, p_vendedor UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.crm_is_admin()
      OR (public.crm_acessa_funil(p_funil) AND (
            p_vendedor = auth.uid()
         OR coalesce((SELECT membros_veem_todos AND membros_editam_todos FROM public.crm_funis WHERE id = p_funil), false)))
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
ALTER TABLE public.crm_funil_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_campos ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['crm_funil_usuarios','crm_campos'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "crm leitura" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "crm admin gerencia" ON public.%I', t);
    EXECUTE format('CREATE POLICY "crm leitura" ON public.%I FOR SELECT USING (auth.uid() IS NOT NULL)', t);
    EXECUTE format('CREATE POLICY "crm admin gerencia" ON public.%I FOR ALL USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin())', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "crm leads leitura" ON public.crm_leads;
DROP POLICY IF EXISTS "crm leads inserir" ON public.crm_leads;
DROP POLICY IF EXISTS "crm leads atualizar" ON public.crm_leads;
CREATE POLICY "crm leads leitura" ON public.crm_leads
  FOR SELECT USING (public.crm_pode_ver_lead(funil_id, vendedor_id));
CREATE POLICY "crm leads inserir" ON public.crm_leads
  FOR INSERT WITH CHECK ((vendedor_id = auth.uid() OR public.crm_is_admin()) AND public.crm_acessa_funil(funil_id));
CREATE POLICY "crm leads atualizar" ON public.crm_leads
  FOR UPDATE USING (public.crm_pode_editar_lead(funil_id, vendedor_id))
  WITH CHECK (public.crm_pode_editar_lead(funil_id, vendedor_id));

DROP POLICY IF EXISTS "crm atividades leitura" ON public.crm_lead_atividades;
DROP POLICY IF EXISTS "crm atividades inserir" ON public.crm_lead_atividades;
CREATE POLICY "crm atividades leitura" ON public.crm_lead_atividades
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.crm_leads l WHERE l.id = lead_id AND public.crm_pode_ver_lead(l.funil_id, l.vendedor_id)));
CREATE POLICY "crm atividades inserir" ON public.crm_lead_atividades
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.crm_leads l WHERE l.id = lead_id AND public.crm_pode_ver_lead(l.funil_id, l.vendedor_id)));

DROP POLICY IF EXISTS "crm tarefas todas" ON public.crm_lead_tarefas;
CREATE POLICY "crm tarefas todas" ON public.crm_lead_tarefas
  FOR ALL USING (EXISTS (SELECT 1 FROM public.crm_leads l WHERE l.id = lead_id AND public.crm_pode_ver_lead(l.funil_id, l.vendedor_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.crm_leads l WHERE l.id = lead_id AND public.crm_pode_ver_lead(l.funil_id, l.vendedor_id)));

-- ---------------------------------------------------------------------
-- Enviar lead para outro funil (ex.: SDR → Vendedores).
-- Roda como dono do banco porque, depois de enviado, quem enviou pode
-- deixar de enxergar o lead. Quem chama precisa poder editar o lead.
-- Se mudar o vendedor, o cadastro do cliente passa para ele também
-- (senão o novo vendedor não consegue fazer o orçamento).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crm_enviar_lead(p_lead UUID, p_funil UUID, p_vendedor UUID DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  l public.crm_leads%ROWTYPE;
  v_etapa UUID;
  v_funil_de TEXT;
  v_funil_para TEXT;
  v_vendedor UUID;
  v_nome_vendedor TEXT;
BEGIN
  SELECT * INTO l FROM public.crm_leads WHERE id = p_lead;
  IF NOT FOUND THEN RETURN 'Lead não encontrado.'; END IF;
  IF NOT public.crm_pode_editar_lead(l.funil_id, l.vendedor_id) THEN RETURN 'Sem permissão para enviar este lead.'; END IF;

  SELECT id INTO v_etapa FROM public.crm_etapas
   WHERE funil_id = p_funil AND tipo = 'aberta' ORDER BY ordem LIMIT 1;
  IF v_etapa IS NULL THEN RETURN 'O funil de destino não tem etapa em andamento.'; END IF;

  v_vendedor := coalesce(p_vendedor, l.vendedor_id);
  SELECT nome INTO v_funil_de FROM public.crm_funis WHERE id = l.funil_id;
  SELECT nome INTO v_funil_para FROM public.crm_funis WHERE id = p_funil;
  SELECT nome INTO v_nome_vendedor FROM public.usuarios WHERE id = v_vendedor;

  UPDATE public.crm_leads SET
    funil_id = p_funil, etapa_id = v_etapa, vendedor_id = v_vendedor,
    status = 'aberto', ganho_em = NULL, perdido_em = NULL, motivo_perda_id = NULL, motivo_perda_obs = NULL,
    orcamento_ganho_id = NULL, valor_fechado = NULL,
    etapa_desde = now(), atualizado_em = now(), ordem = extract(epoch FROM now()) * 1000
  WHERE id = p_lead;

  IF v_vendedor IS DISTINCT FROM l.vendedor_id AND l.cliente_id IS NOT NULL THEN
    UPDATE public.clientes SET vendedor_id = v_vendedor WHERE id = l.cliente_id;
  END IF;

  INSERT INTO public.crm_lead_atividades (lead_id, tipo, descricao, usuario_id)
  VALUES (p_lead, 'etapa',
          format('Enviado do funil "%s" para "%s"%s', v_funil_de, v_funil_para,
                 CASE WHEN v_vendedor IS DISTINCT FROM l.vendedor_id THEN format(' — responsável: %s', v_nome_vendedor) ELSE '' END),
          auth.uid());
  RETURN NULL;
END $$;

REVOKE ALL ON FUNCTION public.crm_enviar_lead(UUID, UUID, UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.crm_enviar_lead(UUID, UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------
-- Dados iniciais da fase 2 (só uma vez)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  f_mkt UUID; f_sdr UUID; f_vendas UUID;
BEGIN
  IF coalesce((SELECT seed_v2 FROM public.crm_config WHERE id = 1), false) THEN RETURN; END IF;

  SELECT id INTO f_vendas FROM public.crm_funis ORDER BY ordem, criado_em LIMIT 1;

  INSERT INTO public.crm_funis (nome, ordem, cor, descricao, membros_veem_todos, membros_editam_todos)
  VALUES ('Marketing', 0, '#8b5cf6', 'Leads que chegam pelas campanhas, site e redes sociais', true, true)
  RETURNING id INTO f_mkt;
  INSERT INTO public.crm_etapas (funil_id, nome, cor, ordem, tipo, probabilidade) VALUES
    (f_mkt, 'Novo contato',       '#a78bfa', 0, 'aberta', 2),
    (f_mkt, 'Em nutrição',        '#8b5cf6', 1, 'aberta', 5),
    (f_mkt, 'Qualificado (MQL)',  '#7c3aed', 2, 'aberta', 10),
    (f_mkt, 'Descartado',         '#dc2626', 3, 'perdido', 0);

  INSERT INTO public.crm_funis (nome, ordem, cor, descricao, membros_veem_todos, membros_editam_todos)
  VALUES ('SDR', 1, '#0ea5e9', 'Pré-venda: levantar as informações antes de passar ao vendedor', true, true)
  RETURNING id INTO f_sdr;
  INSERT INTO public.crm_etapas (funil_id, nome, cor, ordem, tipo, probabilidade) VALUES
    (f_sdr, 'Para contatar',       '#7dd3fc', 0, 'aberta', 10),
    (f_sdr, 'Tentando contato',    '#38bdf8', 1, 'aberta', 12),
    (f_sdr, 'Em conversa',         '#0ea5e9', 2, 'aberta', 15),
    (f_sdr, 'Levantamento feito',  '#0284c7', 3, 'aberta', 20),
    (f_sdr, 'Descartado',          '#dc2626', 4, 'perdido', 0);

  UPDATE public.crm_funis SET proximo_funil_id = f_sdr WHERE id = f_mkt;
  IF f_vendas IS NOT NULL THEN
    UPDATE public.crm_funis SET proximo_funil_id = f_vendas WHERE id = f_sdr;
    UPDATE public.crm_funis SET ordem = 2 WHERE id = f_vendas;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.crm_campos) THEN
    INSERT INTO public.crm_campos (nome, tipo, opcoes, pontos_sim, ajuda, ordem) VALUES
      ('Prazo para comprar', 'selecao',
        '[{"id":"p1","rotulo":"Imediato (até 30 dias)","pontos":30},{"id":"p2","rotulo":"Até 3 meses","pontos":20},{"id":"p3","rotulo":"Até 6 meses","pontos":10},{"id":"p4","rotulo":"Sem prazo definido","pontos":0}]',
        0, 'Quando o cliente pretende fechar a compra', 0),
      ('Recurso para a obra', 'selecao',
        '[{"id":"r1","rotulo":"Recurso próprio / à vista","pontos":25},{"id":"r2","rotulo":"Financiamento aprovado","pontos":25},{"id":"r3","rotulo":"Financiamento em análise","pontos":15},{"id":"r4","rotulo":"Ainda vai buscar","pontos":5},{"id":"r5","rotulo":"Não sabe","pontos":0}]',
        0, 'Como a estufa vai ser paga', 1),
      ('Área / terreno preparado?', 'sim_nao', '[]', 15, 'O local da estufa já está definido e pronto', 2),
      ('Tamanho desejado (m²)', 'numero',
        '[{"min":0,"pontos":0},{"min":500,"pontos":5},{"min":1500,"pontos":10},{"min":5000,"pontos":20}]',
        0, 'Área aproximada da estufa', 3),
      ('Falou com quem decide?', 'sim_nao', '[]', 10, 'A conversa foi com o dono / quem assina', 4),
      ('Já trabalha com cultivo protegido?', 'sim_nao', '[]', 5, NULL, 5);
  END IF;

  UPDATE public.crm_config SET seed_v2 = true WHERE id = 1;
END $$;
