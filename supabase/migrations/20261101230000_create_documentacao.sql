-- Migration para persistência da Documentação e Histórico de Versões no Supabase
-- Executar no SQL Editor do Supabase (https://supabase.com/dashboard/project/ejjhxtkhjloogdqktmnh/sql)

-- 1. TABELA PRINCIPAL DE DOCUMENTAÇÃO (Manual Humano e Manual Técnico)
CREATE TABLE IF NOT EXISTS public.documentacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL, -- 'humano' ou 'tecnico'
    titulo TEXT NOT NULL,
    conteudo_markdown TEXT NOT NULL,
    versao TEXT NOT NULL DEFAULT '1.0',
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    atualizado_por UUID REFERENCES public.usuarios(id)
);

-- 2. TABELA DE HISTÓRICO DE VERSÕES DOS MANUAIS
CREATE TABLE IF NOT EXISTS public.documentacao_versoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    documentacao_slug TEXT NOT NULL, -- 'humano' ou 'tecnico'
    versao TEXT NOT NULL,
    conteudo_markdown TEXT NOT NULL,
    alterado_por UUID REFERENCES public.usuarios(id),
    alterado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    resumo_alteracao TEXT
);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.documentacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentacao_versoes ENABLE ROW LEVEL SECURITY;

-- Políticas para public.documentacao
DROP POLICY IF EXISTS "Leitura de documentacao para todos autenticados" ON public.documentacao;
CREATE POLICY "Leitura de documentacao para todos autenticados" ON public.documentacao
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Gerenciamento de documentacao apenas admin" ON public.documentacao;
CREATE POLICY "Gerenciamento de documentacao apenas admin" ON public.documentacao
    FOR ALL USING (public.is_admin());

-- Políticas para public.documentacao_versoes
DROP POLICY IF EXISTS "Leitura de versoes para todos autenticados" ON public.documentacao_versoes;
CREATE POLICY "Leitura de versoes para todos autenticados" ON public.documentacao_versoes
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Insercao de versoes apenas admin" ON public.documentacao_versoes;
CREATE POLICY "Insercao de versoes apenas admin" ON public.documentacao_versoes
    FOR ALL USING (public.is_admin());

-- Políticas para public.regras_calculo_historico (assegura que usuários possam ler e gravar histórico de regras)
ALTER TABLE public.regras_calculo_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de historico de regras para todos autenticados" ON public.regras_calculo_historico;
CREATE POLICY "Leitura de historico de regras para todos autenticados" ON public.regras_calculo_historico
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Insercao de historico de regras para admin" ON public.regras_calculo_historico;
CREATE POLICY "Insercao de historico de regras para admin" ON public.regras_calculo_historico
    FOR INSERT WITH CHECK (public.is_admin());
