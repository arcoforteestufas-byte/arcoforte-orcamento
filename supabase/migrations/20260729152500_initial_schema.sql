-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELAS

-- USUARIOS
CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    perfil TEXT NOT NULL CHECK (perfil IN ('admin', 'vendedor')),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CLIENTES
CREATE TABLE public.clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    documento TEXT,
    telefone TEXT,
    email TEXT,
    endereco TEXT,
    cidade_uf TEXT,
    observacoes TEXT,
    vendedor_id UUID NOT NULL REFERENCES public.usuarios(id),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PRODUTOS
CREATE TABLE public.produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo TEXT UNIQUE NOT NULL,
    descricao TEXT NOT NULL,
    unidade TEXT NOT NULL,
    preco_unitario NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    categoria TEXT,
    estoque NUMERIC,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- IMPORTACOES (HISTORICO)
CREATE TABLE public.importacoes_produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
    nome_arquivo TEXT NOT NULL,
    qtd_criados INTEGER DEFAULT 0,
    qtd_atualizados INTEGER DEFAULT 0,
    qtd_erros INTEGER DEFAULT 0
);

-- PARAMETROS ESTUFA
CREATE TABLE public.parametros_estufa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_tecnico TEXT UNIQUE NOT NULL,
    rotulo TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('numero', 'texto', 'selecao', 'booleano')),
    opcoes JSONB, -- Se for selecao, guarda as opcoes possiveis
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- GRUPOS COMPONENTES
CREATE TABLE public.grupos_componentes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true
);

-- POSICOES
CREATE TABLE public.posicoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grupo_id UUID NOT NULL REFERENCES public.grupos_componentes(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true
);

-- REGRAS CALCULO
CREATE TABLE public.regras_calculo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    posicao_id UUID NOT NULL REFERENCES public.posicoes(id) ON DELETE CASCADE,
    produto_codigo TEXT NOT NULL REFERENCES public.produtos(codigo),
    formula_quantidade TEXT NOT NULL,
    condicao_aplicabilidade TEXT,
    unidade_medida TEXT NOT NULL,
    regra_arredondamento TEXT NOT NULL CHECK (regra_arredondamento IN ('cima', 'baixo', 'nenhum')),
    margem_perda NUMERIC(5,2) DEFAULT 0.00,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- REGRAS CALCULO HISTORICO (VERSIONAMENTO)
CREATE TABLE public.regras_calculo_historico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    regra_id UUID NOT NULL REFERENCES public.regras_calculo(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
    campo_alterado TEXT NOT NULL,
    valor_anterior TEXT,
    novo_valor TEXT,
    alterado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ORCAMENTOS
CREATE TABLE public.orcamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES public.clientes(id),
    vendedor_id UUID NOT NULL REFERENCES public.usuarios(id),
    status TEXT NOT NULL CHECK (status IN ('Rascunho', 'Enviado', 'Aprovado', 'Perdido')),
    parametros_utilizados JSONB NOT NULL,
    valor_total NUMERIC(12,2) DEFAULT 0.00,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ORCAMENTO ITENS
CREATE TABLE public.orcamento_itens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orcamento_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
    produto_codigo TEXT NOT NULL REFERENCES public.produtos(codigo),
    posicao_id UUID REFERENCES public.posicoes(id), -- Pode ser null se for item avulso
    descricao_customizada TEXT, -- Caso altere manualmente
    quantidade NUMERIC NOT NULL,
    unidade TEXT NOT NULL,
    preco_unitario NUMERIC(10,2) NOT NULL,
    valor_total NUMERIC(12,2) NOT NULL,
    origem TEXT NOT NULL CHECK (origem IN ('regra', 'manual')),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 3. ROW LEVEL SECURITY (RLS)

-- Habilitar RLS em todas as tabelas principais
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.importacoes_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametros_estufa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos_componentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_calculo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_itens ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND perfil = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- POLÍTICAS: USUARIOS
-- Admins veem todos. Vendedores veem apenas a si mesmos e a lista (leitura geral permitida para relacionamentos).
CREATE POLICY "Leitura de usuarios para todos logados" ON public.usuarios
    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Apenas admins inserem/atualizam usuarios" ON public.usuarios
    FOR ALL USING (public.is_admin());

-- POLÍTICAS: CLIENTES
-- Vendedores veem/editam apenas os seus. Admins veem/editam todos.
CREATE POLICY "Vendedores leem seus clientes, admins leem todos" ON public.clientes
    FOR SELECT USING (auth.uid() = vendedor_id OR public.is_admin());
CREATE POLICY "Vendedores inserem seus clientes, admins inserem todos" ON public.clientes
    FOR INSERT WITH CHECK (auth.uid() = vendedor_id OR public.is_admin());
CREATE POLICY "Vendedores atualizam seus clientes, admins atualizam todos" ON public.clientes
    FOR UPDATE USING (auth.uid() = vendedor_id OR public.is_admin());
CREATE POLICY "Apenas admins deletam clientes" ON public.clientes
    FOR DELETE USING (public.is_admin());

-- POLÍTICAS: PRODUTOS e IMPORTACOES
-- Todos leem, apenas admin gerencia
CREATE POLICY "Leitura de produtos livre para autenticados" ON public.produtos
    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Gerenciamento de produtos apenas para admin" ON public.produtos
    FOR ALL USING (public.is_admin());

CREATE POLICY "Leitura de importacoes apenas admin" ON public.importacoes_produtos
    FOR SELECT USING (public.is_admin());
CREATE POLICY "Gerenciamento de importacoes apenas admin" ON public.importacoes_produtos
    FOR ALL USING (public.is_admin());

-- POLÍTICAS: REGRAS E PARAMETROS
-- Todos leem (vendedores precisam para calcular), apenas admin gerencia
CREATE POLICY "Leitura de parametros livre para autenticados" ON public.parametros_estufa
    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Gerenciamento de parametros apenas admin" ON public.parametros_estufa
    FOR ALL USING (public.is_admin());

CREATE POLICY "Leitura de grupos livre para autenticados" ON public.grupos_componentes
    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Gerenciamento de grupos apenas admin" ON public.grupos_componentes
    FOR ALL USING (public.is_admin());

CREATE POLICY "Leitura de posicoes livre para autenticados" ON public.posicoes
    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Gerenciamento de posicoes apenas admin" ON public.posicoes
    FOR ALL USING (public.is_admin());

CREATE POLICY "Leitura de regras livre para autenticados" ON public.regras_calculo
    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Gerenciamento de regras apenas admin" ON public.regras_calculo
    FOR ALL USING (public.is_admin());

-- POLÍTICAS: ORCAMENTOS E ITENS
CREATE POLICY "Vendedores leem seus orcamentos, admins leem todos" ON public.orcamentos
    FOR SELECT USING (auth.uid() = vendedor_id OR public.is_admin());
CREATE POLICY "Vendedores inserem seus orcamentos, admins inserem todos" ON public.orcamentos
    FOR INSERT WITH CHECK (auth.uid() = vendedor_id OR public.is_admin());
CREATE POLICY "Vendedores atualizam seus orcamentos, admins atualizam todos" ON public.orcamentos
    FOR UPDATE USING (auth.uid() = vendedor_id OR public.is_admin());
CREATE POLICY "Apenas admins deletam orcamentos" ON public.orcamentos
    FOR DELETE USING (public.is_admin());

-- Para Itens do Orcamento, usamos a mesma lógica baseada no orcamento_id
CREATE POLICY "Leitura de itens baseada no orcamento" ON public.orcamento_itens
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orcamentos 
            WHERE id = orcamento_itens.orcamento_id 
            AND (vendedor_id = auth.uid() OR public.is_admin())
        )
    );
CREATE POLICY "Inserção/Atualização de itens baseada no orcamento" ON public.orcamento_itens
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.orcamentos 
            WHERE id = orcamento_itens.orcamento_id 
            AND (vendedor_id = auth.uid() OR public.is_admin())
        )
    );
