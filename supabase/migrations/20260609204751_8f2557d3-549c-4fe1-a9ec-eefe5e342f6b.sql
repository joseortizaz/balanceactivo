
-- Helper: keep super_admin access on asientos_contables; recreate role-restricted SELECT policies

-- asientos_contables
DROP POLICY IF EXISTS asientos_select ON public.asientos_contables;
CREATE POLICY asientos_select ON public.asientos_contables FOR SELECT
USING (
  tenant_id = current_tenant_id()
  AND (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'contador'))
);

-- asiento_lineas
DROP POLICY IF EXISTS alineas_select ON public.asiento_lineas;
CREATE POLICY alineas_select ON public.asiento_lineas FOR SELECT
USING (
  tenant_id = current_tenant_id()
  AND (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'contador'))
);
CREATE POLICY super_admin_select_all_alineas ON public.asiento_lineas FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- cuentas_contables
DROP POLICY IF EXISTS cuentas_select ON public.cuentas_contables;
CREATE POLICY cuentas_select ON public.cuentas_contables FOR SELECT
USING (
  tenant_id = current_tenant_id()
  AND (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'contador'))
);

-- gastos
DROP POLICY IF EXISTS gastos_select ON public.gastos;
CREATE POLICY gastos_select ON public.gastos FOR SELECT
USING (
  tenant_id = current_tenant_id()
  AND (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'contador'))
);

-- pagos_gasto
DROP POLICY IF EXISTS pgasto_select ON public.pagos_gasto;
CREATE POLICY pgasto_select ON public.pagos_gasto FOR SELECT
USING (
  tenant_id = current_tenant_id()
  AND (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'contador'))
);

-- ncf_secuencias
DROP POLICY IF EXISTS ncf_select ON public.ncf_secuencias;
CREATE POLICY ncf_select ON public.ncf_secuencias FOR SELECT
USING (
  tenant_id = current_tenant_id()
  AND (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'contador'))
);

-- proveedores
DROP POLICY IF EXISTS prov_select ON public.proveedores;
CREATE POLICY prov_select ON public.proveedores FOR SELECT
USING (
  tenant_id = current_tenant_id()
  AND (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'contador'))
);

-- tss_tasas
DROP POLICY IF EXISTS tss_select ON public.tss_tasas;
CREATE POLICY tss_select ON public.tss_tasas FOR SELECT
USING (
  tenant_id = current_tenant_id()
  AND (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'contador'))
);

-- isr_escalas
DROP POLICY IF EXISTS isr_select ON public.isr_escalas;
CREATE POLICY isr_select ON public.isr_escalas FOR SELECT
USING (
  tenant_id = current_tenant_id()
  AND (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'contador'))
);
