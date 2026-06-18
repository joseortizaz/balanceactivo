
-- 1) Journal entries / lines: only administrador or contador can insert
DROP POLICY IF EXISTS asientos_insert ON public.asientos_contables;
CREATE POLICY asientos_insert ON public.asientos_contables
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (public.has_role(auth.uid(), 'administrador'::app_role)
         OR public.has_role(auth.uid(), 'contador'::app_role))
  );

DROP POLICY IF EXISTS alineas_insert ON public.asiento_lineas;
CREATE POLICY alineas_insert ON public.asiento_lineas
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (public.has_role(auth.uid(), 'administrador'::app_role)
         OR public.has_role(auth.uid(), 'contador'::app_role))
  );

-- 2) Cobros: restrict to billing roles
DROP POLICY IF EXISTS cobros_insert ON public.cobros;
CREATE POLICY cobros_insert ON public.cobros
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (public.has_role(auth.uid(), 'administrador'::app_role)
         OR public.has_role(auth.uid(), 'contador'::app_role)
         OR public.has_role(auth.uid(), 'agente_facturacion'::app_role))
  );

-- 3) Facturas / lineas: restrict insert + update to billing roles
DROP POLICY IF EXISTS fact_insert ON public.facturas;
CREATE POLICY fact_insert ON public.facturas
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (public.has_role(auth.uid(), 'administrador'::app_role)
         OR public.has_role(auth.uid(), 'contador'::app_role)
         OR public.has_role(auth.uid(), 'agente_facturacion'::app_role))
  );

DROP POLICY IF EXISTS fact_update ON public.facturas;
CREATE POLICY fact_update ON public.facturas
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (public.has_role(auth.uid(), 'administrador'::app_role)
         OR public.has_role(auth.uid(), 'contador'::app_role)
         OR public.has_role(auth.uid(), 'agente_facturacion'::app_role))
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (public.has_role(auth.uid(), 'administrador'::app_role)
         OR public.has_role(auth.uid(), 'contador'::app_role)
         OR public.has_role(auth.uid(), 'agente_facturacion'::app_role))
  );

DROP POLICY IF EXISTS flineas_insert ON public.factura_lineas;
CREATE POLICY flineas_insert ON public.factura_lineas
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (public.has_role(auth.uid(), 'administrador'::app_role)
         OR public.has_role(auth.uid(), 'contador'::app_role)
         OR public.has_role(auth.uid(), 'agente_facturacion'::app_role))
  );

-- 4) Audit log: no direct client inserts. SECURITY DEFINER functions bypass RLS.
DROP POLICY IF EXISTS logs_insert ON public.logs_auditoria;
-- Intentionally no INSERT policy: only SECURITY DEFINER functions (running as table owner) can write.

-- 5) Prevent privilege escalation via user_roles
DROP POLICY IF EXISTS roles_admin_manage ON public.user_roles;
CREATE POLICY roles_admin_insert ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.has_role(auth.uid(), 'administrador'::app_role)
    AND role IN ('administrador'::app_role, 'contador'::app_role, 'agente_facturacion'::app_role)
  );
CREATE POLICY roles_admin_update ON public.user_roles
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.has_role(auth.uid(), 'administrador'::app_role)
    AND role IN ('administrador'::app_role, 'contador'::app_role, 'agente_facturacion'::app_role)
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.has_role(auth.uid(), 'administrador'::app_role)
    AND role IN ('administrador'::app_role, 'contador'::app_role, 'agente_facturacion'::app_role)
  );
CREATE POLICY roles_admin_delete ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.has_role(auth.uid(), 'administrador'::app_role)
    AND role IN ('administrador'::app_role, 'contador'::app_role, 'agente_facturacion'::app_role)
    AND user_id <> auth.uid()
  );
