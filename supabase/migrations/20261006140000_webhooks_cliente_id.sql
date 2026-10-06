-- Todos los eventos de factura y cobro incluyen cliente_id (antes solo
-- factura.created). Solo se agregan campos al payload; no se quita nada.

CREATE OR REPLACE FUNCTION public.fn_wh_factura()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.emit_webhook(NEW.tenant_id, 'factura.created',
      jsonb_build_object('id', NEW.id, 'ncf', NEW.ncf, 'cliente_id', NEW.cliente_id,
        'fecha', NEW.fecha, 'total', NEW.total, 'estado', NEW.estado, 'condicion_pago', NEW.condicion_pago));
  ELSE
    PERFORM public.emit_webhook(NEW.tenant_id, 'factura.updated',
      jsonb_build_object('id', NEW.id, 'ncf', NEW.ncf, 'cliente_id', NEW.cliente_id,
        'total', NEW.total, 'estado', NEW.estado, 'monto_pagado', NEW.monto_pagado));
    IF OLD.estado <> 'pagada' AND NEW.estado = 'pagada' THEN
      PERFORM public.emit_webhook(NEW.tenant_id, 'factura.paid',
        jsonb_build_object('id', NEW.id, 'ncf', NEW.ncf, 'cliente_id', NEW.cliente_id,
          'total', NEW.total, 'monto_pagado', NEW.monto_pagado));
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.fn_wh_cobro()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.emit_webhook(NEW.tenant_id,
    CASE WHEN TG_OP = 'INSERT' THEN 'cobro.created' ELSE 'cobro.updated' END,
    jsonb_build_object('id', NEW.id, 'factura_id', NEW.factura_id,
      'cliente_id', (SELECT f.cliente_id FROM public.facturas f WHERE f.id = NEW.factura_id),
      'monto', NEW.monto, 'fecha', NEW.fecha, 'metodo', NEW.metodo,
      'banco_id', NEW.banco_id, 'estado', NEW.estado));
  RETURN NEW;
END $$;
