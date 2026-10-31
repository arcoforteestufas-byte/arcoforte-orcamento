-- Suporte a cliente PJ (CNPJ) x PF (CPF) no cadastro de clientes:
-- tipo_documento define qual conjunto de campos é relevante.
-- - CNPJ: nome = razão social; contato/contato_telefone = quem negocia na empresa
-- - CPF: nome = nome da pessoa; nome_fantasia = nome do negócio informal (sem CNPJ)
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS tipo_documento TEXT CHECK (tipo_documento IN ('CNPJ', 'CPF')),
ADD COLUMN IF NOT EXISTS nome_fantasia TEXT,
ADD COLUMN IF NOT EXISTS contato_telefone TEXT;
