-- =====================================================================
-- CRM ArcoForte (fase 1): funis, etapas, leads, histórico e tarefas
-- Tudo configurável pelo administrador em Configurações → CRM.
-- Pode ser rodado mais de uma vez sem estragar nada.
-- =====================================================================

-- Admin = perfil 'admin' na tabela usuarios OU cargo 'Administrador' no login
CREATE OR REPLACE FUNCTION public.crm_is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND perfil = 'admin')
      OR coalesce(auth.jwt() -> 'user_metadata' ->> 'cargo', '') = 'Administrador'
$$;

-- ---------------------------------------------------------------------
-- Configuração geral (uma linha só)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  vendedor_ve_todos BOOLEAN NOT NULL DEFAULT false,      -- vendedor vê os leads dos outros?
  vendedor_edita_todos BOOLEAN NOT NULL DEFAULT false,   -- e pode mexer neles?
  motivo_perda_obrigatorio BOOLEAN NOT NULL DEFAULT true,
  dias_alerta_parado INTEGER NOT NULL DEFAULT 7,         -- cartão fica em alerta depois de X dias na mesma etapa
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.crm_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.crm_pode_ver(p_vendedor UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.crm_is_admin()
      OR p_vendedor = auth.uid()
      OR coalesce((SELECT vendedor_ve_todos FROM public.crm_config WHERE id = 1), false)
$$;

CREATE OR REPLACE FUNCTION public.crm_pode_editar(p_vendedor UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.crm_is_admin()
      OR p_vendedor = auth.uid()
      OR coalesce((SELECT vendedor_ve_todos AND vendedor_edita_todos FROM public.crm_config WHERE id = 1), false)
$$;

-- ---------------------------------------------------------------------
-- Funis, etapas e listas
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_funis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funil_id UUID NOT NULL REFERENCES public.crm_funis(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#64748b',
  ordem INTEGER NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'aberta' CHECK (tipo IN ('aberta', 'ganho', 'perdido')),
  probabilidade INTEGER NOT NULL DEFAULT 0 CHECK (probabilidade BETWEEN 0 AND 100),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_etapas_funil_idx ON public.crm_etapas (funil_id, ordem);

CREATE TABLE IF NOT EXISTS public.crm_motivos_perda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.crm_origens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------------
-- Leads (cartões)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funil_id UUID NOT NULL REFERENCES public.crm_funis(id),
  etapa_id UUID NOT NULL REFERENCES public.crm_etapas(id),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  contato_nome TEXT,
  telefone TEXT,
  email TEXT,
  cidade TEXT,
  uf TEXT,
  origem_id UUID REFERENCES public.crm_origens(id) ON DELETE SET NULL,
  cultura TEXT,
  area_m2 NUMERIC(12,2),
  valor_estimado NUMERIC(12,2) NOT NULL DEFAULT 0,
  vendedor_id UUID NOT NULL REFERENCES public.usuarios(id) DEFAULT auth.uid(),
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'ganho', 'perdido')),
  motivo_perda_id UUID REFERENCES public.crm_motivos_perda(id) ON DELETE SET NULL,
  motivo_perda_obs TEXT,
  orcamento_ganho_id UUID REFERENCES public.orcamentos(id) ON DELETE SET NULL,
  valor_fechado NUMERIC(12,2),
  ganho_em TIMESTAMPTZ,
  perdido_em TIMESTAMPTZ,
  etapa_desde TIMESTAMPTZ NOT NULL DEFAULT now(),
  proxima_acao_em DATE,
  observacoes TEXT,
  ordem DOUBLE PRECISION NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_leads_etapa_idx ON public.crm_leads (etapa_id, ordem);
CREATE INDEX IF NOT EXISTS crm_leads_vendedor_idx ON public.crm_leads (vendedor_id);
CREATE INDEX IF NOT EXISTS crm_leads_cliente_idx ON public.crm_leads (cliente_id);

CREATE TABLE IF NOT EXISTS public.crm_lead_atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'nota',  -- nota, ligacao, whatsapp, visita, email, etapa, orcamento, ganho, perdido, sistema
  descricao TEXT NOT NULL,
  usuario_id UUID REFERENCES public.usuarios(id) DEFAULT auth.uid(),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_atividades_lead_idx ON public.crm_lead_atividades (lead_id, criado_em DESC);

CREATE TABLE IF NOT EXISTS public.crm_lead_tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  vence_em DATE,
  concluida BOOLEAN NOT NULL DEFAULT false,
  concluida_em TIMESTAMPTZ,
  responsavel_id UUID REFERENCES public.usuarios(id) DEFAULT auth.uid(),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_tarefas_lead_idx ON public.crm_lead_tarefas (lead_id);

-- Orçamento passa a poder pertencer a um lead (um lead pode ter vários orçamentos)
ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS orcamentos_lead_idx ON public.orcamentos (lead_id);

-- ---------------------------------------------------------------------
-- Segurança (RLS)
-- ---------------------------------------------------------------------
ALTER TABLE public.crm_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_funis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_motivos_perda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_origens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_tarefas ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['crm_config','crm_funis','crm_etapas','crm_motivos_perda','crm_origens'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "crm leitura" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "crm admin gerencia" ON public.%I', t);
    EXECUTE format('CREATE POLICY "crm leitura" ON public.%I FOR SELECT USING (auth.uid() IS NOT NULL)', t);
    EXECUTE format('CREATE POLICY "crm admin gerencia" ON public.%I FOR ALL USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin())', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "crm leads leitura" ON public.crm_leads;
DROP POLICY IF EXISTS "crm leads inserir" ON public.crm_leads;
DROP POLICY IF EXISTS "crm leads atualizar" ON public.crm_leads;
DROP POLICY IF EXISTS "crm leads excluir" ON public.crm_leads;
CREATE POLICY "crm leads leitura" ON public.crm_leads
  FOR SELECT USING (public.crm_pode_ver(vendedor_id));
CREATE POLICY "crm leads inserir" ON public.crm_leads
  FOR INSERT WITH CHECK (vendedor_id = auth.uid() OR public.crm_is_admin());
CREATE POLICY "crm leads atualizar" ON public.crm_leads
  FOR UPDATE USING (public.crm_pode_editar(vendedor_id));
CREATE POLICY "crm leads excluir" ON public.crm_leads
  FOR DELETE USING (public.crm_is_admin());

DROP POLICY IF EXISTS "crm atividades leitura" ON public.crm_lead_atividades;
DROP POLICY IF EXISTS "crm atividades inserir" ON public.crm_lead_atividades;
DROP POLICY IF EXISTS "crm atividades excluir" ON public.crm_lead_atividades;
CREATE POLICY "crm atividades leitura" ON public.crm_lead_atividades
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.crm_leads l WHERE l.id = lead_id AND public.crm_pode_ver(l.vendedor_id)));
CREATE POLICY "crm atividades inserir" ON public.crm_lead_atividades
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.crm_leads l WHERE l.id = lead_id AND public.crm_pode_ver(l.vendedor_id)));
CREATE POLICY "crm atividades excluir" ON public.crm_lead_atividades
  FOR DELETE USING (public.crm_is_admin() OR usuario_id = auth.uid());

DROP POLICY IF EXISTS "crm tarefas todas" ON public.crm_lead_tarefas;
CREATE POLICY "crm tarefas todas" ON public.crm_lead_tarefas
  FOR ALL USING (EXISTS (SELECT 1 FROM public.crm_leads l WHERE l.id = lead_id AND public.crm_pode_ver(l.vendedor_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.crm_leads l WHERE l.id = lead_id AND public.crm_pode_ver(l.vendedor_id)));

-- ---------------------------------------------------------------------
-- Dados iniciais (só se ainda não existir nenhum funil)
-- ---------------------------------------------------------------------
DO $$
DECLARE f UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.crm_funis) THEN
    INSERT INTO public.crm_funis (nome, ordem) VALUES ('Vendas de Estufas', 0) RETURNING id INTO f;
    INSERT INTO public.crm_etapas (funil_id, nome, cor, ordem, tipo, probabilidade) VALUES
      (f, 'Novo lead',            '#64748b', 0, 'aberta', 5),
      (f, 'Primeiro contato',     '#0ea5e9', 1, 'aberta', 10),
      (f, 'Visita / levantamento','#8b5cf6', 2, 'aberta', 25),
      (f, 'Orçamento enviado',    '#f59e0b', 3, 'aberta', 40),
      (f, 'Negociação',           '#d97021', 4, 'aberta', 70),
      (f, 'Ganho',                '#16a34a', 5, 'ganho', 100),
      (f, 'Perdido',              '#dc2626', 6, 'perdido', 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.crm_motivos_perda) THEN
    INSERT INTO public.crm_motivos_perda (nome, ordem) VALUES
      ('Preço', 0), ('Prazo de entrega', 1), ('Fechou com concorrente', 2),
      ('Desistiu do projeto', 3), ('Sem crédito / financiamento negado', 4), ('Sem retorno do cliente', 5);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.crm_origens) THEN
    INSERT INTO public.crm_origens (nome, ordem) VALUES
      ('Indicação', 0), ('Instagram', 1), ('Site', 2), ('WhatsApp', 3),
      ('Feira / evento', 4), ('Vendedor externo', 5), ('Cliente antigo', 6);
  END IF;
END $$;
