-- Campos usados na geração da Proposta Comercial que ainda não existiam em orcamentos
ALTER TABLE public.orcamentos
ADD COLUMN IF NOT EXISTS cultura TEXT,
ADD COLUMN IF NOT EXISTS prazo_entrega TEXT;
