-- Endurece has_role(): antes comprobaba si el usuario tiene ese rol en
-- CUALQUIER tenant. Hoy no es explotable porque profiles fuerza un tenant
-- por usuario, pero es un supuesto implícito, no una garantía de esquema.
-- Si en el futuro un usuario pertenece a más de un tenant (razonable en un
-- SaaS B2B), todas las políticas que usan has_role() se volverían
-- inseguras en silencio. Se corrige acá, en un solo lugar, sin tocar
-- ninguna política (todas siguen llamando has_role(auth.uid(), 'rol')).
--
-- is_super_admin() NO se toca: ese rol es correctamente global (no está
-- atado a un tenant específico).

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND tenant_id = public.current_tenant_id()
  )
$$;
