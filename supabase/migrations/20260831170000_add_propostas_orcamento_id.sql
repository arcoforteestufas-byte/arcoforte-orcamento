-- A tabela propostas nesse ambiente não tinha a coluna orcamento_id
-- (usada pra vincular a proposta ao orçamento que a gerou).
ALTER TABLE public.propostas
ADD COLUMN IF NOT EXISTS orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE SET NULL;
