-- =====================================================================
-- Entregas: produtos que vão na entrega (importados do pedido do Sensio)
-- - ent_entregas.itens: lista de produtos [{pedido, codigo, descricao, unidade, quantidade, peso_unit_kg, obs}]
-- - ent_entregas.pedido_erp: número(s) do pedido no Sensio (ex.: "8580" ou "8580, 8591")
-- - O roteiro do celular do motorista passa a mostrar os produtos de cada parada.
-- Não mexe em produtos (o peso é só lido da tabela produtos pelo código).
-- Pode ser rodado mais de uma vez sem estragar nada.
-- =====================================================================

ALTER TABLE public.ent_entregas ADD COLUMN IF NOT EXISTS itens JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.ent_entregas ADD COLUMN IF NOT EXISTS pedido_erp TEXT;

-- Roteiro da viagem para o celular do motorista (igual ao anterior + itens e pedido_erp)
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
        'descricao_carga', e.descricao_carga, 'peso_kg', e.peso_kg, 'observacoes', e.observacoes,
        'itens', e.itens, 'pedido_erp', e.pedido_erp
      ) ORDER BY e.ordem, e.chegada_prevista)
      FROM public.ent_entregas e WHERE e.viagem_id = v.id AND e.status <> 'cancelada'), '[]'::jsonb)
  );
END $$;
