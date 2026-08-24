DROP POLICY IF EXISTS roles_select_same_tenant ON public.user_roles;

CREATE POLICY roles_select_own
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY roles_select_admin_same_tenant
ON public.user_roles
FOR SELECT
TO authenticated
USING (tenant_id = public.current_tenant_id() AND public.has_role(auth.uid(), 'administrador'::app_role));