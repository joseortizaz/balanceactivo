-- cobros UPDATE: mirror role check in WITH CHECK
DROP POLICY IF EXISTS cobros_update ON public.cobros;
CREATE POLICY cobros_update ON public.cobros
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (public.has_role(auth.uid(), 'administrador'::app_role) OR public.has_role(auth.uid(), 'contador'::app_role))
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (public.has_role(auth.uid(), 'administrador'::app_role) OR public.has_role(auth.uid(), 'contador'::app_role))
  );

-- movimientos_inventario INSERT: require role
DROP POLICY IF EXISTS mov_inv_insert ON public.movimientos_inventario;
CREATE POLICY mov_inv_insert ON public.movimientos_inventario
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (public.has_role(auth.uid(), 'administrador'::app_role) OR public.has_role(auth.uid(), 'contador'::app_role))
  );

-- productos INSERT: require any of the three valid roles
DROP POLICY IF EXISTS productos_insert ON public.productos;
CREATE POLICY productos_insert ON public.productos
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (
      public.has_role(auth.uid(), 'administrador'::app_role)
      OR public.has_role(auth.uid(), 'contador'::app_role)
      OR public.has_role(auth.uid(), 'agente_facturacion'::app_role)
    )
  );
