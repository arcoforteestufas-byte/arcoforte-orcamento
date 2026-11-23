-- Usuário criado na tela de Usuários (auth.admin.createUser) não ganhava linha em public.usuarios.
-- clientes, orcamentos e crm_leads têm vendedor_id -> usuarios(id), então esse usuário não conseguia
-- cadastrar cliente/lead ("violates foreign key constraint clientes_vendedor_id_fkey").
-- Correção: gatilho que cria/atualiza a linha em public.usuarios sempre que um usuário é criado
-- ou tem os dados (nome/cargo) alterados, e preenchimento dos usuários que já existem sem a linha.

CREATE OR REPLACE FUNCTION public.sincronizar_usuario()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nome TEXT := coalesce(nullif(trim(NEW.raw_user_meta_data ->> 'nome'), ''), split_part(NEW.email, '@', 1), 'Usuário');
  v_cargo TEXT := NEW.raw_user_meta_data ->> 'cargo';
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.usuarios (id, nome, perfil)
    VALUES (NEW.id, v_nome, CASE WHEN v_cargo = 'Administrador' THEN 'admin' ELSE 'vendedor' END)
    ON CONFLICT (id) DO NOTHING;
  ELSE
    INSERT INTO public.usuarios (id, nome, perfil)
    VALUES (NEW.id, v_nome, CASE WHEN v_cargo = 'Administrador' THEN 'admin' ELSE 'vendedor' END)
    ON CONFLICT (id) DO UPDATE SET
      nome = EXCLUDED.nome,
      -- só mexe no perfil quando o cargo está preenchido
      perfil = CASE WHEN v_cargo IS NULL OR v_cargo = '' THEN public.usuarios.perfil ELSE EXCLUDED.perfil END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_sincronizar ON auth.users;
CREATE TRIGGER on_auth_user_sincronizar
  AFTER INSERT OR UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_usuario();

-- Usuários que já existem e ainda não têm linha em public.usuarios
INSERT INTO public.usuarios (id, nome, perfil)
SELECT u.id,
       coalesce(nullif(trim(u.raw_user_meta_data ->> 'nome'), ''), split_part(u.email, '@', 1), 'Usuário'),
       CASE WHEN u.raw_user_meta_data ->> 'cargo' = 'Administrador' THEN 'admin' ELSE 'vendedor' END
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.usuarios x WHERE x.id = u.id);
