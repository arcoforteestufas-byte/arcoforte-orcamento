-- Número de pedido customizável na proposta (opcional). Se ficar em branco,
-- o sistema usa o ID curto do orçamento como padrão.
ALTER TABLE public.orcamentos
ADD COLUMN IF NOT EXISTS numero_pedido TEXT;
