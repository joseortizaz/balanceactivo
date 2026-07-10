-- Prevent tenant spoofing via profiles INSERT/UPDATE and add WITH CHECK to tenants admin update.

DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
CREATE POLICY profiles_insert_self ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
  id = auth.uid()
  AND tenant_id IS NOT DISTINCT FROM public.current_tenant_id()
);

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND tenant_id IS NOT DISTINCT FROM public.current_tenant_id()
);

DROP POLICY IF EXISTS tenant_update_admin ON public.tenants;
CREATE POLICY tenant_update_admin ON public.tenants
FOR UPDATE TO authenticated
USING (
  id = public.current_tenant_id()
  AND public.has_role(auth.uid(), 'administrador'::public.app_role)
)
WITH CHECK (
  id = public.current_tenant_id()
  AND public.has_role(auth.uid(), 'administrador'::public.app_role)
);