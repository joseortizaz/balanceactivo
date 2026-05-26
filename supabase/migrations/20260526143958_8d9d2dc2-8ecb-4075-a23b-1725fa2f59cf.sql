
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND tenant_id = public.current_tenant_id()
  )
$$;

ALTER FUNCTION public.calcular_descuento_abs(numeric, tipo_descuento, numeric) SET search_path = public;
ALTER FUNCTION public.touch_updated_at() SET search_path = public;

DROP POLICY IF EXISTS aus_select ON public.ausencias;
CREATE POLICY aus_select ON public.ausencias FOR SELECT TO authenticated
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador')));

DROP POLICY IF EXISTS emp_select ON public.empleados;
CREATE POLICY emp_select ON public.empleados FOR SELECT TO authenticated
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador')));

DROP POLICY IF EXISTS nomc_select ON public.nomina_conceptos;
CREATE POLICY nomc_select ON public.nomina_conceptos FOR SELECT TO authenticated
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador')));

DROP POLICY IF EXISTS nomd_select ON public.nomina_detalle;
CREATE POLICY nomd_select ON public.nomina_detalle FOR SELECT TO authenticated
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador')));

DROP POLICY IF EXISTS nom_select ON public.nominas;
CREATE POLICY nom_select ON public.nominas FOR SELECT TO authenticated
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador')));

DROP POLICY IF EXISTS prest_select ON public.prestamos_empleado;
CREATE POLICY prest_select ON public.prestamos_empleado FOR SELECT TO authenticated
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador')));

DROP POLICY IF EXISTS term_select ON public.terminaciones;
CREATE POLICY term_select ON public.terminaciones FOR SELECT TO authenticated
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador')));

DROP POLICY IF EXISTS susc_select_own ON public.suscripciones;
CREATE POLICY susc_select_own ON public.suscripciones FOR SELECT TO authenticated
USING (tenant_id = current_tenant_id() AND has_role(auth.uid(),'administrador'));
