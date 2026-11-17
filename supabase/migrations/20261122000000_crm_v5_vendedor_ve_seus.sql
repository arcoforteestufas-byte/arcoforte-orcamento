-- =====================================================================
-- CRM v5: vendedor vê só os próprios leads
-- - Usuário com cargo "Vendedor" enxerga apenas os leads em que ele é o responsável,
--   em qualquer funil (mesmo nos funis marcados "membros veem todos").
-- - O administrador pode liberar, por usuário, "ver os leads de todos" (e "editar").
--   Isso fica em Configurações → Usuários → editar usuário.
-- - Demais cargos continuam seguindo a regra de cada funil, como antes.
-- Pode ser rodado mais de uma vez sem estragar nada.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.crm_permissoes_usuario (
  usuario_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ver_todos BOOLEAN NOT NULL DEFAULT false,      -- vê os leads dos outros vendedores
  editar_todos BOOLEAN NOT NULL DEFAULT false,   -- e pode mexer neles
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_permissoes_usuario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm permissoes leitura" ON public.crm_permissoes_usuario;
DROP POLICY IF EXISTS "crm permissoes admin" ON public.crm_permissoes_usuario;
CREATE POLICY "crm permissoes leitura" ON public.crm_permissoes_usuario
  FOR SELECT USING (usuario_id = auth.uid() OR public.crm_is_admin());
CREATE POLICY "crm permissoes admin" ON public.crm_permissoes_usuario
  FOR ALL USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());

-- cargo "Vendedor" no login
CREATE OR REPLACE FUNCTION public.crm_eh_vendedor()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(auth.jwt() -> 'user_metadata' ->> 'cargo', '') = 'Vendedor'
$$;

-- liberações dadas pelo administrador para o usuário logado
CREATE OR REPLACE FUNCTION public.crm_libera_ver_todos()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT ver_todos FROM public.crm_permissoes_usuario WHERE usuario_id = auth.uid()), false)
$$;

CREATE OR REPLACE FUNCTION public.crm_libera_editar_todos()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT ver_todos AND editar_todos FROM public.crm_permissoes_usuario WHERE usuario_id = auth.uid()), false)
$$;

-- quem pode ver o lead
CREATE OR REPLACE FUNCTION public.crm_pode_ver_lead(p_funil UUID, p_vendedor UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.crm_is_admin()
      OR (public.crm_acessa_funil(p_funil) AND (
            p_vendedor = auth.uid()
         OR public.crm_libera_ver_todos()
         OR (NOT public.crm_eh_vendedor()
             AND coalesce((SELECT membros_veem_todos FROM public.crm_funis WHERE id = p_funil), false))))
$$;

-- quem pode editar o lead
CREATE OR REPLACE FUNCTION public.crm_pode_editar_lead(p_funil UUID, p_vendedor UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.crm_is_admin()
      OR (public.crm_acessa_funil(p_funil) AND (
            p_vendedor = auth.uid()
         OR public.crm_libera_editar_todos()
         OR (NOT public.crm_eh_vendedor()
             AND coalesce((SELECT membros_veem_todos AND membros_editam_todos FROM public.crm_funis WHERE id = p_funil), false))))
$$;
