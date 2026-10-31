-- Modelo Word (.docx) usado como molde pra gerar a proposta comercial,
-- e o arquivo .docx já preenchido de cada proposta gerada.
ALTER TABLE public.configuracoes
ADD COLUMN IF NOT EXISTS modelo_word_url TEXT;

ALTER TABLE public.propostas
ADD COLUMN IF NOT EXISTS arquivo_docx_url TEXT;
