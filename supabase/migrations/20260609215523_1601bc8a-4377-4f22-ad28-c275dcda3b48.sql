
-- Scope SELECT policies to authenticated role only
DROP POLICY IF EXISTS asientos_select ON public.asientos_contables;
CREATE POLICY asientos_select ON public.asientos_contables FOR SELECT TO authenticated
USING ((tenant_id = current_tenant_id()) AND (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'contador'::app_role)));

DROP POLICY IF EXISTS alineas_select ON public.asiento_lineas;
CREATE POLICY alineas_select ON public.asiento_lineas FOR SELECT TO authenticated
USING ((tenant_id = current_tenant_id()) AND (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'contador'::app_role)));

DROP POLICY IF EXISTS super_admin_select_all_alineas ON public.asiento_lineas;
CREATE POLICY super_admin_select_all_alineas ON public.asiento_lineas FOR SELECT TO authenticated
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS cuentas_select ON public.cuentas_contables;
CREATE POLICY cuentas_select ON public.cuentas_contables FOR SELECT TO authenticated
USING ((tenant_id = current_tenant_id()) AND (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'contador'::app_role)));

DROP POLICY IF EXISTS gastos_select ON public.gastos;
CREATE POLICY gastos_select ON public.gastos FOR SELECT TO authenticated
USING ((tenant_id = current_tenant_id()) AND (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'contador'::app_role)));

DROP POLICY IF EXISTS pgasto_select ON public.pagos_gasto;
CREATE POLICY pgasto_select ON public.pagos_gasto FOR SELECT TO authenticated
USING ((tenant_id = current_tenant_id()) AND (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'contador'::app_role)));

DROP POLICY IF EXISTS ncf_select ON public.ncf_secuencias;
CREATE POLICY ncf_select ON public.ncf_secuencias FOR SELECT TO authenticated
USING ((tenant_id = current_tenant_id()) AND (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'contador'::app_role)));

DROP POLICY IF EXISTS prov_select ON public.proveedores;
CREATE POLICY prov_select ON public.proveedores FOR SELECT TO authenticated
USING ((tenant_id = current_tenant_id()) AND (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'contador'::app_role)));

DROP POLICY IF EXISTS isr_select ON public.isr_escalas;
CREATE POLICY isr_select ON public.isr_escalas FOR SELECT TO authenticated
USING ((tenant_id = current_tenant_id()) AND (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'contador'::app_role)));

DROP POLICY IF EXISTS tss_select ON public.tss_tasas;
CREATE POLICY tss_select ON public.tss_tasas FOR SELECT TO authenticated
USING ((tenant_id = current_tenant_id()) AND (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'contador'::app_role)));

-- Restrict product deletion to admin/contador; keep insert/update for any tenant member
DROP POLICY IF EXISTS productos_manage ON public.productos;
CREATE POLICY productos_insert ON public.productos FOR INSERT TO authenticated
WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY productos_update ON public.productos FOR UPDATE TO authenticated
USING (tenant_id = current_tenant_id())
WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY productos_delete ON public.productos FOR DELETE TO authenticated
USING ((tenant_id = current_tenant_id()) AND (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'contador'::app_role)));
