-- Feature: recordatorios de cobro por correo + vista de cuentas por cobrar
-- (estado: al día / en mora con días / saldado / anulado).

-- 1) Configuración por tenant: con cuántos días de anticipación se avisa de
--    una cuota próxima a vencer.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS dias_aviso_cuota integer NOT NULL DEFAULT 5;

-- 2) Trazabilidad de envíos por cuota, para no notificar dos veces:
--    - recordatorio_enviado_at: se marca cuando se envía el aviso "cuota
--      próxima a vencer" (una sola vez, N días antes del vencimiento).
--    - mora_notificado_at: se marca cuando se envía el aviso de mora (una
--      sola vez, al momento en que la cuota entra en mora por primera vez).
ALTER TABLE public.factura_cuotas
  ADD COLUMN IF NOT EXISTS recordatorio_enviado_at timestamptz,
  ADD COLUMN IF NOT EXISTS mora_notificado_at timestamptz;

-- 3) Vista de cuentas por cobrar: una fila por factura a crédito, con el
--    estado de cobro calculado dinámicamente (nunca depende de un campo que
--    haya que mantener actualizado con un batch job aparte).
--
-- proxima_fecha_vencimiento = la fecha de la cuota impaga más próxima si la
-- factura tiene plan de cuotas; si no tiene cuotas (crédito a pago único),
-- cae en facturas.fecha_vencimiento vía COALESCE.
--
-- security_invoker = true es importante: sin esto, una vista corre con los
-- privilegios de quien la CREÓ (el owner/migración), no de quien la
-- consulta, lo que podría saltarse el RLS de facturas/clientes/factura_cuotas
-- para usuarios normales. Con security_invoker, el RLS de las tablas base
-- se respeta exactamente igual que si se consultaran directamente.
CREATE OR REPLACE VIEW public.v_cuentas_por_cobrar
WITH (security_invoker = true) AS
SELECT
  f.id AS factura_id,
  f.tenant_id,
  f.cliente_id,
  c.razon_social AS cliente_nombre,
  c.email AS cliente_email,
  f.ncf,
  f.fecha,
  f.total,
  f.monto_pagado,
  GREATEST(0, f.total - f.monto_pagado) AS saldo_pendiente,
  f.estado AS estado_factura,
  f.condicion_pago,
  COALESCE(prox.proxima_fecha_vencimiento, f.fecha_vencimiento) AS proxima_fecha_vencimiento,
  CASE
    WHEN f.estado IN ('anulada', 'cerrada') THEN 0
    WHEN COALESCE(prox.proxima_fecha_vencimiento, f.fecha_vencimiento) IS NULL THEN 0
    ELSE GREATEST(0, (CURRENT_DATE - COALESCE(prox.proxima_fecha_vencimiento, f.fecha_vencimiento)))
  END AS dias_mora,
  CASE
    WHEN f.estado IN ('anulada', 'cerrada') THEN 'anulado'
    WHEN f.estado = 'pagada' OR (f.total - f.monto_pagado) <= 0.005 THEN 'saldado'
    WHEN COALESCE(prox.proxima_fecha_vencimiento, f.fecha_vencimiento) IS NOT NULL
         AND COALESCE(prox.proxima_fecha_vencimiento, f.fecha_vencimiento) < CURRENT_DATE THEN 'en_mora'
    ELSE 'al_dia'
  END AS estado_cobro
FROM public.facturas f
JOIN public.clientes c ON c.id = f.cliente_id
LEFT JOIN LATERAL (
  SELECT MIN(fc.fecha_vencimiento) AS proxima_fecha_vencimiento
  FROM public.factura_cuotas fc
  WHERE fc.factura_id = f.id AND fc.monto_pagado < fc.monto
) prox ON true
WHERE f.condicion_pago = 'credito';

COMMENT ON VIEW public.v_cuentas_por_cobrar IS
  'Estado de cobro por factura a crédito (al_dia / en_mora / saldado / anulado), calculado dinámicamente. Nota: cerrada se agrupa junto con anulada porque ninguna de las dos representa saldo que se siga cobrando activamente.';

GRANT SELECT ON public.v_cuentas_por_cobrar TO authenticated;
