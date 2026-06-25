
-- cobros: add DELETE policy for admin/contador
CREATE POLICY cobros_delete ON public.cobros FOR DELETE
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)));

-- cotizaciones: replace ALL policy with role-restricted INSERT/UPDATE/DELETE (admin, contador, agente_facturacion)
DROP POLICY IF EXISTS cot_manage ON public.cotizaciones;
CREATE POLICY cot_insert ON public.cotizaciones FOR INSERT
WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role) OR has_role(auth.uid(),'agente_facturacion'::app_role)));
CREATE POLICY cot_update ON public.cotizaciones FOR UPDATE
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role) OR has_role(auth.uid(),'agente_facturacion'::app_role)))
WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role) OR has_role(auth.uid(),'agente_facturacion'::app_role)));
CREATE POLICY cot_delete ON public.cotizaciones FOR DELETE
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)));

DROP POLICY IF EXISTS cotl_manage ON public.cotizacion_lineas;
CREATE POLICY cotl_insert ON public.cotizacion_lineas FOR INSERT
WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role) OR has_role(auth.uid(),'agente_facturacion'::app_role)));
CREATE POLICY cotl_update ON public.cotizacion_lineas FOR UPDATE
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role) OR has_role(auth.uid(),'agente_facturacion'::app_role)))
WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role) OR has_role(auth.uid(),'agente_facturacion'::app_role)));
CREATE POLICY cotl_delete ON public.cotizacion_lineas FOR DELETE
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)));

-- factura_cuotas: restrict writes to admin/contador
DROP POLICY IF EXISTS cuotas_manage ON public.factura_cuotas;
CREATE POLICY cuotas_insert ON public.factura_cuotas FOR INSERT
WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)));
CREATE POLICY cuotas_update ON public.factura_cuotas FOR UPDATE
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)))
WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)));
CREATE POLICY cuotas_delete ON public.factura_cuotas FOR DELETE
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)));

-- facturas_recurrentes and lines: restrict writes to admin/contador/agente_facturacion
DROP POLICY IF EXISTS rec_manage ON public.facturas_recurrentes;
CREATE POLICY rec_insert ON public.facturas_recurrentes FOR INSERT
WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role) OR has_role(auth.uid(),'agente_facturacion'::app_role)));
CREATE POLICY rec_update ON public.facturas_recurrentes FOR UPDATE
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role) OR has_role(auth.uid(),'agente_facturacion'::app_role)))
WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role) OR has_role(auth.uid(),'agente_facturacion'::app_role)));
CREATE POLICY rec_delete ON public.facturas_recurrentes FOR DELETE
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)));

DROP POLICY IF EXISTS recl_manage ON public.factura_recurrente_lineas;
CREATE POLICY recl_insert ON public.factura_recurrente_lineas FOR INSERT
WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role) OR has_role(auth.uid(),'agente_facturacion'::app_role)));
CREATE POLICY recl_update ON public.factura_recurrente_lineas FOR UPDATE
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role) OR has_role(auth.uid(),'agente_facturacion'::app_role)))
WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role) OR has_role(auth.uid(),'agente_facturacion'::app_role)));
CREATE POLICY recl_delete ON public.factura_recurrente_lineas FOR DELETE
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)));
