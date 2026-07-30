-- Adiciona a coluna alterado_por para auditoria de substituicoes manuais
ALTER TABLE public.orcamento_itens 
ADD COLUMN alterado_por UUID REFERENCES public.usuarios(id);
