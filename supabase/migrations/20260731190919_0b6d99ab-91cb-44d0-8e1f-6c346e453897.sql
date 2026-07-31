-- cobros
DROP POLICY IF EXISTS cobros_delete ON public.cobros;
CREATE POLICY cobros_delete ON public.cobros FOR DELETE TO authenticated
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador')));

-- cotizaciones
DROP POLICY IF EXISTS cot_insert ON public.cotizaciones;
CREATE POLICY cot_insert ON public.cotizaciones FOR INSERT TO authenticated
WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador') OR has_role(auth.uid(),'agente_facturacion')));
DROP POLICY IF EXISTS cot_update ON public.cotizaciones;
CREATE POLICY cot_update ON public.cotizaciones FOR UPDATE TO authenticated
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador') OR has_role(auth.uid(),'agente_facturacion')))
WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador') OR has_role(auth.uid(),'agente_facturacion')));
DROP POLICY IF EXISTS cot_delete ON public.cotizaciones;
CREATE POLICY cot_delete ON public.cotizaciones FOR DELETE TO authenticated
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador')));

-- cotizacion_lineas
DROP POLICY IF EXISTS cotl_insert ON public.cotizacion_lineas;
CREATE POLICY cotl_insert ON public.cotizacion_lineas FOR INSERT TO authenticated
WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador') OR has_role(auth.uid(),'agente_facturacion')));
DROP POLICY IF EXISTS cotl_update ON public.cotizacion_lineas;
CREATE POLICY cotl_update ON public.cotizacion_lineas FOR UPDATE TO authenticated
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador') OR has_role(auth.uid(),'agente_facturacion')))
WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador') OR has_role(auth.uid(),'agente_facturacion')));
DROP POLICY IF EXISTS cotl_delete ON public.cotizacion_lineas;
CREATE POLICY cotl_delete ON public.cotizacion_lineas FOR DELETE TO authenticated
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador')));

-- factura_cuotas
DROP POLICY IF EXISTS cuotas_insert ON public.factura_cuotas;
CREATE POLICY cuotas_insert ON public.factura_cuotas FOR INSERT TO authenticated
WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador')));
DROP POLICY IF EXISTS cuotas_update ON public.factura_cuotas;
CREATE POLICY cuotas_update ON public.factura_cuotas FOR UPDATE TO authenticated
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador')))
WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador')));
DROP POLICY IF EXISTS cuotas_delete ON public.factura_cuotas;
CREATE POLICY cuotas_delete ON public.factura_cuotas FOR DELETE TO authenticated
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador')));

-- facturas_recurrentes
DROP POLICY IF EXISTS rec_insert ON public.facturas_recurrentes;
CREATE POLICY rec_insert ON public.facturas_recurrentes FOR INSERT TO authenticated
WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador') OR has_role(auth.uid(),'agente_facturacion')));
DROP POLICY IF EXISTS rec_update ON public.facturas_recurrentes;
CREATE POLICY rec_update ON public.facturas_recurrentes FOR UPDATE TO authenticated
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador') OR has_role(auth.uid(),'agente_facturacion')))
WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador') OR has_role(auth.uid(),'agente_facturacion')));
DROP POLICY IF EXISTS rec_delete ON public.facturas_recurrentes;
CREATE POLICY rec_delete ON public.facturas_recurrentes FOR DELETE TO authenticated
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador')));

-- factura_recurrente_lineas
DROP POLICY IF EXISTS recl_insert ON public.factura_recurrente_lineas;
CREATE POLICY recl_insert ON public.factura_recurrente_lineas FOR INSERT TO authenticated
WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador') OR has_role(auth.uid(),'agente_facturacion')));
DROP POLICY IF EXISTS recl_update ON public.factura_recurrente_lineas;
CREATE POLICY recl_update ON public.factura_recurrente_lineas FOR UPDATE TO authenticated
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador') OR has_role(auth.uid(),'agente_facturacion')))
WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador') OR has_role(auth.uid(),'agente_facturacion')));
DROP POLICY IF EXISTS recl_delete ON public.factura_recurrente_lineas;
CREATE POLICY recl_delete ON public.factura_recurrente_lineas FOR DELETE TO authenticated
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador')));