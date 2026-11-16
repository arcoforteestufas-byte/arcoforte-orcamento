-- =====================================================================
-- Módulo de ENTREGAS (logística)
--  * transportadoras, veículos (próprios e terceiros) e motoristas
--  * viagens (caminhão + motorista + saída/retorno) com várias entregas (paradas)
--  * entregas "a programar" (solicitadas pelo vendedor a partir do lead ganho)
--  * localização ao vivo do caminhão pelo celular do motorista (link sem login)
-- Quem gerencia: Administrador e cargo "Logística". Todos os logados visualizam.
-- Pode ser rodado mais de uma vez sem estragar nada.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.ent_pode_gerenciar()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND perfil = 'admin')
      OR coalesce(auth.jwt() -> 'user_metadata' ->> 'cargo', '') IN ('Administrador', 'Logística')
$$;

-- ---------------------------------------------------------------------
-- Cadastros
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ent_transportadoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  documento TEXT,
  telefone TEXT,
  contato TEXT,
  email TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ent_veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa TEXT NOT NULL,
  descricao TEXT,                                   -- ex.: "Truck baú", "Carreta"
  proprio BOOLEAN NOT NULL DEFAULT true,            -- false = terceiro
  transportadora_id UUID REFERENCES public.ent_transportadoras(id) ON DELETE SET NULL,
  capacidade_kg NUMERIC(12,2),
  cor TEXT NOT NULL DEFAULT '#d97021',              -- cor do caminhão no mapa
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ent_motoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT,
  cnh TEXT,
  cnh_validade DATE,
  transportadora_id UUID REFERENCES public.ent_transportadoras(id) ON DELETE SET NULL, -- vazio = motorista próprio
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Viagens e entregas
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ent_viagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT,                                       -- ex.: "Rota Sul de Minas"
  veiculo_id UUID REFERENCES public.ent_veiculos(id) ON DELETE SET NULL,
  motorista_id UUID REFERENCES public.ent_motoristas(id) ON DELETE SET NULL,
  transportadora_id UUID REFERENCES public.ent_transportadoras(id) ON DELETE SET NULL,
  terceirizada BOOLEAN NOT NULL DEFAULT false,
  saida_prevista DATE NOT NULL,
  retorno_previsto DATE,
  saida_real TIMESTAMPTZ,
  retorno_real TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'planejada' CHECK (status IN ('planejada', 'em_rota', 'concluida', 'cancelada')),
  custo_frete NUMERIC(12,2),
  observacoes TEXT,
  -- link do motorista (sem login): /motorista/<token>
  token_motorista TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  ultima_lat DOUBLE PRECISION,
  ultima_lng DOUBLE PRECISION,
  ultima_posicao_em TIMESTAMPTZ,
  criado_por UUID DEFAULT auth.uid(),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ent_viagens_saida_idx ON public.ent_viagens (saida_prevista);

CREATE TABLE IF NOT EXISTS public.ent_entregas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id UUID REFERENCES public.ent_viagens(id) ON DELETE SET NULL,   -- vazio = a programar
  ordem INTEGER NOT NULL DEFAULT 0,                                      -- ordem da parada na viagem
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE SET NULL,
  destinatario TEXT NOT NULL,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  uf TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  chegada_prevista DATE,
  entregue_em TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'a_programar' CHECK (status IN ('a_programar', 'programada', 'em_rota', 'entregue', 'cancelada')),
  peso_kg NUMERIC(12,2),
  descricao_carga TEXT,
  observacoes TEXT,
  obs_motorista TEXT,
  solicitado_por UUID DEFAULT auth.uid(),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ent_entregas_viagem_idx ON public.ent_entregas (viagem_id, ordem);
CREATE INDEX IF NOT EXISTS ent_entregas_chegada_idx ON public.ent_entregas (chegada_prevista);
CREATE INDEX IF NOT EXISTS ent_entregas_lead_idx ON public.ent_entregas (lead_id);

CREATE TABLE IF NOT EXISTS public.ent_posicoes (
  id BIGSERIAL PRIMARY KEY,
  viagem_id UUID NOT NULL REFERENCES public.ent_viagens(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  precisao DOUBLE PRECISION,
  velocidade DOUBLE PRECISION,
  registrado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ent_posicoes_viagem_idx ON public.ent_posicoes (viagem_id, registrado_em DESC);

-- ---------------------------------------------------------------------
-- RLS: todos os logados leem; Admin/Logística gerenciam.
-- Vendedor pode SOLICITAR entrega (fica "a programar", sem viagem).
-- ---------------------------------------------------------------------
ALTER TABLE public.ent_transportadoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ent_veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ent_motoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ent_viagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ent_entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ent_posicoes ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['ent_transportadoras','ent_veiculos','ent_motoristas','ent_viagens','ent_posicoes'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "ent leitura" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "ent gerencia" ON public.%I', t);
    EXECUTE format('CREATE POLICY "ent leitura" ON public.%I FOR SELECT USING (auth.uid() IS NOT NULL)', t);
    EXECUTE format('CREATE POLICY "ent gerencia" ON public.%I FOR ALL USING (public.ent_pode_gerenciar()) WITH CHECK (public.ent_pode_gerenciar())', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "ent entregas leitura" ON public.ent_entregas;
DROP POLICY IF EXISTS "ent entregas gerencia" ON public.ent_entregas;
DROP POLICY IF EXISTS "ent entregas solicitar" ON public.ent_entregas;
DROP POLICY IF EXISTS "ent entregas editar solicitacao" ON public.ent_entregas;
CREATE POLICY "ent entregas leitura" ON public.ent_entregas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ent entregas gerencia" ON public.ent_entregas FOR ALL
  USING (public.ent_pode_gerenciar()) WITH CHECK (public.ent_pode_gerenciar());
CREATE POLICY "ent entregas solicitar" ON public.ent_entregas FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND viagem_id IS NULL AND status = 'a_programar' AND solicitado_por = auth.uid());
-- quem solicitou pode corrigir enquanto ainda está "a programar"
CREATE POLICY "ent entregas editar solicitacao" ON public.ent_entregas FOR UPDATE
  USING (solicitado_por = auth.uid() AND status = 'a_programar' AND viagem_id IS NULL)
  WITH CHECK (solicitado_por = auth.uid() AND status = 'a_programar' AND viagem_id IS NULL);

-- ---------------------------------------------------------------------
-- Link do motorista (sem login). Só funciona com o código da viagem.
-- ---------------------------------------------------------------------

-- Roteiro da viagem para o celular do motorista
CREATE OR REPLACE FUNCTION public.ent_motorista_roteiro(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v public.ent_viagens%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 THEN RETURN NULL; END IF;
  SELECT * INTO v FROM public.ent_viagens WHERE token_motorista = p_token;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'id', v.id, 'titulo', v.titulo, 'status', v.status,
    'saida_prevista', v.saida_prevista, 'retorno_previsto', v.retorno_previsto,
    'veiculo', (SELECT jsonb_build_object('placa', placa, 'descricao', descricao) FROM public.ent_veiculos WHERE id = v.veiculo_id),
    'motorista', (SELECT nome FROM public.ent_motoristas WHERE id = v.motorista_id),
    'entregas', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', e.id, 'ordem', e.ordem, 'destinatario', e.destinatario, 'telefone', e.telefone,
        'endereco', e.endereco, 'cidade', e.cidade, 'uf', e.uf, 'lat', e.lat, 'lng', e.lng,
        'chegada_prevista', e.chegada_prevista, 'status', e.status, 'entregue_em', e.entregue_em,
        'descricao_carga', e.descricao_carga, 'peso_kg', e.peso_kg, 'observacoes', e.observacoes
      ) ORDER BY e.ordem, e.chegada_prevista)
      FROM public.ent_entregas e WHERE e.viagem_id = v.id AND e.status <> 'cancelada'), '[]'::jsonb)
  );
END $$;

-- Posição do caminhão (enviada pelo celular). Também marca a viagem como "em rota".
CREATE OR REPLACE FUNCTION public.ent_motorista_posicao(p_token TEXT, p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION,
                                                        p_precisao DOUBLE PRECISION DEFAULT NULL, p_velocidade DOUBLE PRECISION DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v public.ent_viagens%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 THEN RETURN 'Link inválido.'; END IF;
  SELECT * INTO v FROM public.ent_viagens WHERE token_motorista = p_token;
  IF NOT FOUND THEN RETURN 'Link inválido.'; END IF;
  IF v.status IN ('concluida', 'cancelada') THEN RETURN 'Esta viagem já foi encerrada.'; END IF;
  IF p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN RETURN 'Posição inválida.'; END IF;
  -- no máximo 1 posição a cada 10 segundos por viagem
  IF v.ultima_posicao_em IS NOT NULL AND v.ultima_posicao_em > now() - interval '10 seconds' THEN RETURN NULL; END IF;

  INSERT INTO public.ent_posicoes (viagem_id, lat, lng, precisao, velocidade) VALUES (v.id, p_lat, p_lng, p_precisao, p_velocidade);
  UPDATE public.ent_viagens SET
    ultima_lat = p_lat, ultima_lng = p_lng, ultima_posicao_em = now(),
    status = CASE WHEN status = 'planejada' THEN 'em_rota' ELSE status END,
    saida_real = coalesce(saida_real, now())
  WHERE id = v.id;
  UPDATE public.ent_entregas SET status = 'em_rota' WHERE viagem_id = v.id AND status = 'programada';
  RETURN NULL;
END $$;

-- Motorista marca uma parada como entregue
CREATE OR REPLACE FUNCTION public.ent_motorista_entregue(p_token TEXT, p_entrega UUID, p_obs TEXT DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_viagem UUID;
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 THEN RETURN 'Link inválido.'; END IF;
  SELECT id INTO v_viagem FROM public.ent_viagens WHERE token_motorista = p_token AND status NOT IN ('concluida', 'cancelada');
  IF v_viagem IS NULL THEN RETURN 'Link inválido ou viagem encerrada.'; END IF;
  UPDATE public.ent_entregas SET status = 'entregue', entregue_em = now(), atualizado_em = now(),
         obs_motorista = nullif(trim(coalesce(p_obs, '')), '')
   WHERE id = p_entrega AND viagem_id = v_viagem;
  IF NOT FOUND THEN RETURN 'Entrega não encontrada nesta viagem.'; END IF;
  RETURN NULL;
END $$;

REVOKE ALL ON FUNCTION public.ent_motorista_roteiro(TEXT) FROM public;
REVOKE ALL ON FUNCTION public.ent_motorista_posicao(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) FROM public;
REVOKE ALL ON FUNCTION public.ent_motorista_entregue(TEXT, UUID, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.ent_motorista_roteiro(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ent_motorista_posicao(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ent_motorista_entregue(TEXT, UUID, TEXT) TO anon, authenticated;
