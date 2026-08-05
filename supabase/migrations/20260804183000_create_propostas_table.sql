-- Criação da tabela propostas para acompanhamento
CREATE TABLE IF NOT EXISTS public.propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  vendedor_nome TEXT,
  valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  texto_conteudo TEXT NOT NULL,
  dados_json JSONB,
  status TEXT NOT NULL DEFAULT 'Gerada', -- Gerada, Enviada, Aprovada, Rejeitada
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Permitir leitura de propostas para usuários autenticados" 
ON public.propostas FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir inserção de propostas para usuários autenticados" 
ON public.propostas FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de propostas para usuários autenticados" 
ON public.propostas FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);
