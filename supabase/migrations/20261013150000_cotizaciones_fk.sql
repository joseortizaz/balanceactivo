-- Las cotizaciones no aparecían en el listado: la tabla `cotizaciones` no tiene
-- ninguna llave foránea, y el listado pide `clientes(razon_social)`. Sin la
-- relación PostgREST responde con error y la pantalla mostraba "Sin cotizaciones"
-- aunque los registros existían (y se guardaban bien).

ALTER TABLE public.cotizaciones
  ADD CONSTRAINT cotizaciones_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD CONSTRAINT cotizaciones_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id),
  ADD CONSTRAINT cotizaciones_factura_id_fkey FOREIGN KEY (factura_id) REFERENCES public.facturas(id) ON DELETE SET NULL;

-- Refrescar la caché de esquema de la API
NOTIFY pgrst, 'reload schema';
