-- Catálogo de "Cultura / Uso da Estufa": cresce conforme os vendedores cadastram
-- novos valores direto no orçamento, e depois ficam disponíveis pra selecionar.
CREATE TABLE IF NOT EXISTS public.culturas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT UNIQUE NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.culturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de culturas livre para autenticados" ON public.culturas;
CREATE POLICY "Leitura de culturas livre para autenticados" ON public.culturas
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Autenticados podem cadastrar novas culturas" ON public.culturas;
CREATE POLICY "Autenticados podem cadastrar novas culturas" ON public.culturas
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Sem sugestões pré-cadastradas: a lista cresce só com o que os próprios
-- usuários registrarem pelo botão "+" no orçamento.
