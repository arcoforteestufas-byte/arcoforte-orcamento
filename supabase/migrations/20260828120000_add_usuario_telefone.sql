-- Adiciona a coluna telefone em usuarios (usada nas propostas para mostrar o contato do vendedor)
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS telefone TEXT;
