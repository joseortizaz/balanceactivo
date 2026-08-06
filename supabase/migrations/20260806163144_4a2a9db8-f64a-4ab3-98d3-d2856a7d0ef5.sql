CREATE OR REPLACE FUNCTION public.anular_factura(_factura_id uuid, _motivo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tenant uuid; _user uuid; _f RECORD; _old RECORD;
  _rev_id uuid; _l RECORD;
BEGIN
  _user := auth.uid();
  SELECT tenant_id INTO _tenant FROM public.profiles WHERE id = _user;
  IF _tenant IS NULL THEN RAISE EXCEPTION 'Sin tenant'; END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN RAISE EXCEPTION 'Motivo requerido'; END IF;

  SELECT * INTO _f FROM public.facturas WHERE id = _factura_id AND tenant_id = _tenant;
  IF _f IS NULL THEN RAISE EXCEPTION 'Factura no encontrada'; END IF;
  IF _f.estado = 'anulada' THEN RAISE EXCEPTION 'Factura ya está anulada'; END IF;

  -- Restaurar stock
  FOR _old IN SELECT producto_id, cantidad FROM public.factura_lineas WHERE factura_id = _factura_id AND producto_id IS NOT NULL LOOP
    UPDATE public.productos SET stock = stock + _old.cantidad WHERE id = _old.producto_id AND controla_inventario = true;
    INSERT INTO public.movimientos_inventario(tenant_id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, factura_id, fecha, created_by)
    SELECT _tenant, p.id, 'anulacion_venta', _old.cantidad, p.stock - _old.cantidad, p.stock, 'Anulación factura: ' || _motivo, _factura_id, CURRENT_DATE, _user
    FROM public.productos p WHERE p.id = _old.producto_id AND p.controla_inventario = true;
  END LOOP;

  -- Asiento de reversión: se conserva el asiento original y se registra uno inverso
  IF _f.asiento_id IS NOT NULL THEN
    INSERT INTO public.asientos_contables (tenant_id, fecha, concepto, origen, origen_id, total_debito, total_credito)
    SELECT _tenant, CURRENT_DATE,
      'Anulación factura ' || _f.ncf || ' — ' || _motivo,
      'anulacion_factura', _factura_id, a.total_credito, a.total_debito
    FROM public.asientos_contables a WHERE a.id = _f.asiento_id
    RETURNING id INTO _rev_id;

    IF _rev_id IS NOT NULL THEN
      FOR _l IN SELECT cuenta_id, debito, credito, descripcion FROM public.asiento_lineas WHERE asiento_id = _f.asiento_id LOOP
        INSERT INTO public.asiento_lineas (tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
        VALUES (_tenant, _rev_id, _l.cuenta_id, _l.credito, _l.debito, 'Reversión: ' || COALESCE(_l.descripcion, ''));
      END LOOP;
    END IF;
  END IF;

  UPDATE public.facturas SET estado='anulada', motivo_estado=_motivo WHERE id=_factura_id;

  INSERT INTO public.logs_auditoria(tenant_id, user_id, accion, tabla_afectada, registro_id, detalles)
  VALUES (_tenant, _user, 'anular_factura', 'facturas', _factura_id,
    jsonb_build_object('ncf', _f.ncf, 'motivo', _motivo, 'monto_pagado', _f.monto_pagado, 'total', _f.total, 'asiento_reversion', _rev_id));
END $function$;