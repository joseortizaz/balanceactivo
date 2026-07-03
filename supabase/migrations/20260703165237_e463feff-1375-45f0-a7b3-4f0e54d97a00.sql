
DROP POLICY IF EXISTS bancos_select ON public.bancos;
CREATE POLICY bancos_select ON public.bancos FOR SELECT TO authenticated
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'contador'::app_role)));

DROP POLICY IF EXISTS car_select ON public.cargos;
CREATE POLICY car_select ON public.cargos FOR SELECT TO authenticated
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'contador'::app_role)));

DROP POLICY IF EXISTS dep_select ON public.departamentos;
CREATE POLICY dep_select ON public.departamentos FOR SELECT TO authenticated
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'contador'::app_role)));

DROP POLICY IF EXISTS clientes_manage ON public.clientes;
CREATE POLICY clientes_write ON public.clientes FOR ALL TO authenticated
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'contador'::app_role)))
WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'contador'::app_role)));
