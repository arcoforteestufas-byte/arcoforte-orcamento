-- Adiciona a coluna contato em clientes (nome da pessoa de contato, usado nas propostas)
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS contato TEXT;
