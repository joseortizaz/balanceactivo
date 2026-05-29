-- Add 'cerrada' estado y motivo_estado
ALTER TYPE estado_factura ADD VALUE IF NOT EXISTS 'cerrada';

ALTER TABLE public.facturas
  ADD COLUMN IF NOT EXISTS motivo_estado text;

-- Permitir editar facturas con pagos (registrando en auditoría)
CREATE OR REPLACE FUNCTION public.actualizar_factura(
  _factura_id uuid, _cliente_id uuid, _condicion condicion_pago, _fecha date,
  _tipo_descuento tipo_descuento, _descuento_valor numeric, _lineas jsonb, _cuotas jsonb DEFAULT NULL::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _tenant uuid; _user uuid; _f RECORD; _asiento_id uuid;
  _subtotal numeric(14,2) := 0; _itbis numeric(14,2) := 0; _total numeric(14,2) := 0;
  _desc_abs numeric(14,2);
  _line jsonb; _ls numeric; _li numeric;
  _cuenta_caja uuid; _cuenta_cxc uuid; _cuenta_ingresos uuid; _cuenta_itbis uuid;
  _cuota jsonb; _num integer := 0;
  _old RECORD;
  _had_payments boolean;
BEGIN
  _user := auth.uid();
  SELECT tenant_id INTO _tenant FROM public.profiles WHERE id = _user;
  IF _tenant IS NULL THEN RAISE EXCEPTION 'Sin tenant'; END IF;

  SELECT * INTO _f FROM public.facturas WHERE id = _factura_id AND tenant_id = _tenant;
  IF _f IS NULL THEN RAISE EXCEPTION 'Factura no encontrada'; END IF;
  IF _f.estado IN ('anulada','cerrada') THEN
    RAISE EXCEPTION 'Factura % no puede editarse', _f.estado;
  END IF;

  _had_payments := (_f.monto_pagado > 0) OR EXISTS(SELECT 1 FROM public.cobros WHERE factura_id = _factura_id);

  FOR _line IN SELECT * FROM jsonb_array_elements(_lineas) LOOP
    _ls := (_line->>'cantidad')::numeric * (_line->>'precio')::numeric;
    _li := _ls * ((_line->>'tasa_itbis')::numeric / 100.0);
    _subtotal := _subtotal + _ls; _itbis := _itbis + _li;
  END LOOP;
  _desc_abs := public.calcular_descuento_abs(_subtotal, _tipo_descuento, _descuento_valor);
  _total := _subtotal - _desc_abs + _itbis;

  -- Revertir stock
  FOR _old IN SELECT producto_id, cantidad FROM public.factura_lineas WHERE factura_id = _factura_id AND producto_id IS NOT NULL LOOP
    UPDATE public.productos SET stock = stock + _old.cantidad WHERE id = _old.producto_id AND controla_inventario = true;
    INSERT INTO public.movimientos_inventario(tenant_id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, factura_id, fecha, created_by)
    SELECT _tenant, p.id, 'anulacion_venta', _old.cantidad, p.stock - _old.cantidad, p.stock, 'Edición de factura', _factura_id, CURRENT_DATE, _user
    FROM public.productos p WHERE p.id = _old.producto_id AND p.controla_inventario = true;
  END LOOP;

  DELETE FROM public.factura_lineas WHERE factura_id = _factura_id;
  DELETE FROM public.factura_cuotas WHERE factura_id = _factura_id;
  IF _f.asiento_id IS NOT NULL THEN
    DELETE FROM public.asiento_lineas WHERE asiento_id = _f.asiento_id;
    DELETE FROM public.asientos_contables WHERE id = _f.asiento_id;
  END IF;

  UPDATE public.facturas SET
    cliente_id = _cliente_id, condicion_pago = _condicion, fecha = _fecha,
    subtotal = _subtotal, descuento = _desc_abs, tipo_descuento = _tipo_descuento,
    descuento_valor = _descuento_valor, itbis = _itbis, total = _total,
    estado = CASE
      WHEN _f.monto_pagado >= _total AND _total > 0 THEN 'pagada'::estado_factura
      WHEN _condicion='contado' AND _f.monto_pagado=0 THEN 'pagada'::estado_factura
      ELSE 'pendiente'::estado_factura END,
    asiento_id = NULL
  WHERE id = _factura_id;

  -- Reinsertar líneas
  FOR _line IN SELECT * FROM jsonb_array_elements(_lineas) LOOP
    _ls := (_line->>'cantidad')::numeric * (_line->>'precio')::numeric;
    _li := _ls * ((_line->>'tasa_itbis')::numeric / 100.0);
    INSERT INTO public.factura_lineas(tenant_id, factura_id, producto_id, descripcion, cantidad, precio, tasa_itbis, subtotal, itbis)
    VALUES (_tenant, _factura_id, NULLIF(_line->>'producto_id','')::uuid, _line->>'descripcion',
            (_line->>'cantidad')::numeric, (_line->>'precio')::numeric, (_line->>'tasa_itbis')::numeric, _ls, _li);
  END LOOP;

  IF _condicion = 'credito' AND _cuotas IS NOT NULL THEN
    FOR _cuota IN SELECT * FROM jsonb_array_elements(_cuotas) LOOP
      _num := _num + 1;
      INSERT INTO public.factura_cuotas(tenant_id, factura_id, numero_cuota, fecha_vencimiento, monto)
      VALUES (_tenant, _factura_id, _num, (_cuota->>'fecha')::date, (_cuota->>'monto')::numeric);
    END LOOP;
  END IF;

  SELECT id INTO _cuenta_caja FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='1.1.01.01';
  SELECT id INTO _cuenta_cxc FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='1.1.02.01';
  SELECT id INTO _cuenta_ingresos FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='4.1.01.01';
  SELECT id INTO _cuenta_itbis FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='2.1.02.01';

  INSERT INTO public.asientos_contables (tenant_id, fecha, concepto, origen, origen_id, total_debito, total_credito)
  VALUES (_tenant, _fecha, 'Factura ' || _f.ncf || ' (editada)', 'factura', _factura_id, _total, _total)
  RETURNING id INTO _asiento_id;

  INSERT INTO public.asiento_lineas (tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
  VALUES (_tenant, _asiento_id, CASE WHEN _condicion='contado' THEN _cuenta_caja ELSE _cuenta_cxc END, _total, 0, 'Factura ' || _f.ncf);
  INSERT INTO public.asiento_lineas (tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
  VALUES (_tenant, _asiento_id, _cuenta_ingresos, 0, _subtotal - _desc_abs, 'Ingresos ' || _f.ncf);
  IF _itbis > 0 THEN
    INSERT INTO public.asiento_lineas (tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
    VALUES (_tenant, _asiento_id, _cuenta_itbis, 0, _itbis, 'ITBIS ' || _f.ncf);
  END IF;

  UPDATE public.facturas SET asiento_id = _asiento_id WHERE id = _factura_id;

  INSERT INTO public.logs_auditoria(tenant_id, user_id, accion, tabla_afectada, registro_id, detalles)
  VALUES (_tenant, _user, 'editar_factura', 'facturas', _factura_id,
    jsonb_build_object('ncf', _f.ncf, 'tenia_pagos', _had_payments, 'total_anterior', _f.total, 'total_nuevo', _total));

  RETURN _factura_id;
END $function$;

-- Anular factura (con motivo)
CREATE OR REPLACE FUNCTION public.anular_factura(_factura_id uuid, _motivo text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _tenant uuid; _user uuid; _f RECORD; _old RECORD;
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

  IF _f.asiento_id IS NOT NULL THEN
    DELETE FROM public.asiento_lineas WHERE asiento_id = _f.asiento_id;
    DELETE FROM public.asientos_contables WHERE id = _f.asiento_id;
  END IF;

  UPDATE public.facturas SET estado='anulada', motivo_estado=_motivo, asiento_id=NULL WHERE id=_factura_id;

  INSERT INTO public.logs_auditoria(tenant_id, user_id, accion, tabla_afectada, registro_id, detalles)
  VALUES (_tenant, _user, 'anular_factura', 'facturas', _factura_id,
    jsonb_build_object('ncf', _f.ncf, 'motivo', _motivo, 'monto_pagado', _f.monto_pagado, 'total', _f.total));
END $$;

-- Cerrar factura sin completar el pago (con motivo)
CREATE OR REPLACE FUNCTION public.cerrar_factura(_factura_id uuid, _motivo text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _tenant uuid; _user uuid; _f RECORD;
BEGIN
  _user := auth.uid();
  SELECT tenant_id INTO _tenant FROM public.profiles WHERE id = _user;
  IF _tenant IS NULL THEN RAISE EXCEPTION 'Sin tenant'; END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN RAISE EXCEPTION 'Motivo requerido'; END IF;

  SELECT * INTO _f FROM public.facturas WHERE id = _factura_id AND tenant_id = _tenant;
  IF _f IS NULL THEN RAISE EXCEPTION 'Factura no encontrada'; END IF;
  IF _f.estado IN ('cerrada','anulada','pagada') THEN
    RAISE EXCEPTION 'Factura % no puede cerrarse', _f.estado;
  END IF;

  UPDATE public.facturas SET estado='cerrada', motivo_estado=_motivo WHERE id=_factura_id;

  INSERT INTO public.logs_auditoria(tenant_id, user_id, accion, tabla_afectada, registro_id, detalles)
  VALUES (_tenant, _user, 'cerrar_factura', 'facturas', _factura_id,
    jsonb_build_object('ncf', _f.ncf, 'motivo', _motivo, 'monto_pagado', _f.monto_pagado, 'total', _f.total, 'saldo_pendiente', _f.total - _f.monto_pagado));
END $$;