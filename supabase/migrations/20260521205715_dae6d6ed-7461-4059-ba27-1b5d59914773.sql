
-- ACTUALIZAR COTIZACION (solo borrador)
CREATE OR REPLACE FUNCTION public.actualizar_cotizacion(
  _cotizacion_id uuid,
  _cliente_id uuid, _fecha date, _validez_dias integer,
  _tipo_descuento public.tipo_descuento, _descuento_valor numeric,
  _notas text, _lineas jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant uuid; _user uuid; _cot RECORD;
  _subtotal numeric(14,2) := 0; _itbis numeric(14,2) := 0; _desc_abs numeric(14,2);
  _line jsonb; _ls numeric; _li numeric;
BEGIN
  _user := auth.uid();
  SELECT tenant_id INTO _tenant FROM public.profiles WHERE id = _user;
  IF _tenant IS NULL THEN RAISE EXCEPTION 'Sin tenant'; END IF;

  SELECT * INTO _cot FROM public.cotizaciones WHERE id = _cotizacion_id AND tenant_id = _tenant;
  IF _cot IS NULL THEN RAISE EXCEPTION 'Cotización no encontrada'; END IF;
  IF _cot.estado <> 'borrador' THEN RAISE EXCEPTION 'Solo se pueden editar cotizaciones en borrador'; END IF;

  FOR _line IN SELECT * FROM jsonb_array_elements(_lineas) LOOP
    _ls := (_line->>'cantidad')::numeric * (_line->>'precio')::numeric;
    _li := _ls * ((_line->>'tasa_itbis')::numeric / 100.0);
    _subtotal := _subtotal + _ls;
    _itbis := _itbis + _li;
  END LOOP;
  _desc_abs := public.calcular_descuento_abs(_subtotal, _tipo_descuento, _descuento_valor);

  DELETE FROM public.cotizacion_lineas WHERE cotizacion_id = _cotizacion_id;

  UPDATE public.cotizaciones SET
    cliente_id = _cliente_id, fecha = _fecha, validez_dias = _validez_dias, notas = _notas,
    subtotal = _subtotal, tipo_descuento = _tipo_descuento, descuento_valor = _descuento_valor,
    descuento = _desc_abs, itbis = _itbis, total = _subtotal - _desc_abs + _itbis
  WHERE id = _cotizacion_id;

  FOR _line IN SELECT * FROM jsonb_array_elements(_lineas) LOOP
    _ls := (_line->>'cantidad')::numeric * (_line->>'precio')::numeric;
    _li := _ls * ((_line->>'tasa_itbis')::numeric / 100.0);
    INSERT INTO public.cotizacion_lineas(tenant_id, cotizacion_id, descripcion, cantidad, precio, tasa_itbis, subtotal, itbis, total)
    VALUES (_tenant, _cotizacion_id, _line->>'descripcion', (_line->>'cantidad')::numeric, (_line->>'precio')::numeric,
            (_line->>'tasa_itbis')::numeric, _ls, _li, _ls + _li);
  END LOOP;

  RETURN _cotizacion_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.actualizar_cotizacion(uuid, uuid, date, integer, public.tipo_descuento, numeric, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.actualizar_cotizacion(uuid, uuid, date, integer, public.tipo_descuento, numeric, text, jsonb) TO authenticated;

-- ACTUALIZAR FACTURA (solo pendiente sin pagos). Conserva el NCF.
CREATE OR REPLACE FUNCTION public.actualizar_factura(
  _factura_id uuid,
  _cliente_id uuid,
  _condicion public.condicion_pago,
  _fecha date,
  _tipo_descuento public.tipo_descuento,
  _descuento_valor numeric,
  _lineas jsonb,
  _cuotas jsonb DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant uuid; _user uuid; _f RECORD; _asiento_id uuid;
  _subtotal numeric(14,2) := 0; _itbis numeric(14,2) := 0; _total numeric(14,2) := 0;
  _desc_abs numeric(14,2);
  _line jsonb; _ls numeric; _li numeric;
  _cuenta_caja uuid; _cuenta_cxc uuid; _cuenta_ingresos uuid; _cuenta_itbis uuid;
  _cuota jsonb; _num integer := 0;
BEGIN
  _user := auth.uid();
  SELECT tenant_id INTO _tenant FROM public.profiles WHERE id = _user;
  IF _tenant IS NULL THEN RAISE EXCEPTION 'Sin tenant'; END IF;

  SELECT * INTO _f FROM public.facturas WHERE id = _factura_id AND tenant_id = _tenant;
  IF _f IS NULL THEN RAISE EXCEPTION 'Factura no encontrada'; END IF;
  IF _f.monto_pagado > 0 THEN RAISE EXCEPTION 'Factura con pagos no puede editarse'; END IF;
  IF _f.estado NOT IN ('pendiente','pagada') OR (SELECT COUNT(*) FROM public.cobros WHERE factura_id = _factura_id) > 0 THEN
    RAISE EXCEPTION 'Factura con cobros registrados no puede editarse';
  END IF;

  -- Calcular totales
  FOR _line IN SELECT * FROM jsonb_array_elements(_lineas) LOOP
    _ls := (_line->>'cantidad')::numeric * (_line->>'precio')::numeric;
    _li := _ls * ((_line->>'tasa_itbis')::numeric / 100.0);
    _subtotal := _subtotal + _ls; _itbis := _itbis + _li;
  END LOOP;
  _desc_abs := public.calcular_descuento_abs(_subtotal, _tipo_descuento, _descuento_valor);
  _total := _subtotal - _desc_abs + _itbis;

  -- Borrar líneas, cuotas y asiento previo
  DELETE FROM public.factura_lineas WHERE factura_id = _factura_id;
  DELETE FROM public.factura_cuotas WHERE factura_id = _factura_id;
  IF _f.asiento_id IS NOT NULL THEN
    DELETE FROM public.asiento_lineas WHERE asiento_id = _f.asiento_id;
    DELETE FROM public.asientos_contables WHERE id = _f.asiento_id;
  END IF;

  -- Actualizar factura (mantiene NCF y tipo_ncf)
  UPDATE public.facturas SET
    cliente_id = _cliente_id, condicion_pago = _condicion, fecha = _fecha,
    subtotal = _subtotal, descuento = _desc_abs, tipo_descuento = _tipo_descuento,
    descuento_valor = _descuento_valor, itbis = _itbis, total = _total,
    estado = CASE WHEN _condicion='contado' THEN 'pagada'::estado_factura ELSE 'pendiente'::estado_factura END,
    asiento_id = NULL
  WHERE id = _factura_id;

  -- Insertar líneas
  FOR _line IN SELECT * FROM jsonb_array_elements(_lineas) LOOP
    _ls := (_line->>'cantidad')::numeric * (_line->>'precio')::numeric;
    _li := _ls * ((_line->>'tasa_itbis')::numeric / 100.0);
    INSERT INTO public.factura_lineas (tenant_id, factura_id, descripcion, cantidad, precio, tasa_itbis, subtotal, itbis, total)
    VALUES (_tenant, _factura_id, _line->>'descripcion',
      (_line->>'cantidad')::numeric, (_line->>'precio')::numeric, (_line->>'tasa_itbis')::numeric,
      _ls, _li, _ls + _li);
  END LOOP;

  IF _condicion = 'credito' AND _cuotas IS NOT NULL AND jsonb_array_length(_cuotas) > 0 THEN
    FOR _cuota IN SELECT * FROM jsonb_array_elements(_cuotas) LOOP
      _num := _num + 1;
      INSERT INTO public.factura_cuotas(tenant_id, factura_id, numero_cuota, fecha_vencimiento, monto)
      VALUES (_tenant, _factura_id, _num, (_cuota->>'fecha')::date, (_cuota->>'monto')::numeric);
    END LOOP;
  END IF;

  -- Regenerar asiento
  SELECT id INTO _cuenta_caja FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='1.1.01.01';
  SELECT id INTO _cuenta_cxc FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='1.1.02.01';
  SELECT id INTO _cuenta_ingresos FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='4.1.01';
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

  INSERT INTO public.logs_auditoria (tenant_id, user_id, accion, tabla_afectada, registro_id, detalles)
  VALUES (_tenant, _user, 'Edicion de Factura', 'facturas', _factura_id, jsonb_build_object('ncf', _f.ncf, 'total', _total));

  RETURN _factura_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.actualizar_factura(uuid, uuid, public.condicion_pago, date, public.tipo_descuento, numeric, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.actualizar_factura(uuid, uuid, public.condicion_pago, date, public.tipo_descuento, numeric, jsonb, jsonb) TO authenticated;

-- ACTUALIZAR GASTO (solo pendiente sin pagos)
CREATE OR REPLACE FUNCTION public.actualizar_gasto(
  _gasto_id uuid,
  _fecha date,
  _proveedor_id uuid,
  _ncf text,
  _tipo_ncf_compra public.tipo_ncf_compra,
  _categoria public.categoria_gasto_606,
  _concepto text,
  _cuenta_gasto_id uuid,
  _condicion_pago public.condicion_pago,
  _fecha_vencimiento date,
  _subtotal numeric,
  _tasa_itbis numeric,
  _itbis_retenido numeric,
  _isr_retenido numeric,
  _cuenta_pago_id uuid,
  _notas text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant uuid; _user uuid; g RECORD;
  _itbis numeric(14,2); _total numeric(14,2);
BEGIN
  _user := auth.uid();
  SELECT tenant_id INTO _tenant FROM public.profiles WHERE id = _user;
  IF _tenant IS NULL THEN RAISE EXCEPTION 'Sin tenant'; END IF;

  SELECT * INTO g FROM public.gastos WHERE id = _gasto_id AND tenant_id = _tenant;
  IF g IS NULL THEN RAISE EXCEPTION 'Gasto no encontrado'; END IF;
  IF g.monto_pagado > 0 OR (SELECT COUNT(*) FROM public.pagos_gasto WHERE gasto_id = _gasto_id) > 0 THEN
    RAISE EXCEPTION 'Gasto con pagos no puede editarse';
  END IF;
  IF g.estado = 'anulado' THEN RAISE EXCEPTION 'Gasto anulado no puede editarse'; END IF;

  _itbis := round(_subtotal * _tasa_itbis / 100.0, 2);
  _total := _subtotal + _itbis;

  -- Borrar asiento previo
  IF g.asiento_id IS NOT NULL THEN
    DELETE FROM public.asiento_lineas WHERE asiento_id = g.asiento_id;
    DELETE FROM public.asientos_contables WHERE id = g.asiento_id;
  END IF;

  UPDATE public.gastos SET
    fecha = _fecha, proveedor_id = _proveedor_id, ncf = NULLIF(_ncf,''),
    tipo_ncf_compra = _tipo_ncf_compra, categoria = _categoria,
    concepto = _concepto, cuenta_gasto_id = _cuenta_gasto_id,
    condicion_pago = _condicion_pago, fecha_vencimiento = _fecha_vencimiento,
    subtotal = _subtotal, itbis = _itbis,
    itbis_retenido = COALESCE(_itbis_retenido,0), isr_retenido = COALESCE(_isr_retenido,0),
    total = _total,
    cuenta_pago_id = CASE WHEN _condicion_pago = 'contado' THEN _cuenta_pago_id ELSE NULL END,
    notas = _notas,
    asiento_id = NULL,
    estado = 'pendiente',
    monto_pagado = 0
  WHERE id = _gasto_id;

  -- Regenerar asiento
  PERFORM public.registrar_gasto(_gasto_id);

  INSERT INTO public.logs_auditoria (tenant_id, user_id, accion, tabla_afectada, registro_id, detalles)
  VALUES (_tenant, _user, 'Edicion de Gasto', 'gastos', _gasto_id, jsonb_build_object('total', _total));

  RETURN _gasto_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.actualizar_gasto(uuid, date, uuid, text, public.tipo_ncf_compra, public.categoria_gasto_606, text, uuid, public.condicion_pago, date, numeric, numeric, numeric, numeric, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.actualizar_gasto(uuid, date, uuid, text, public.tipo_ncf_compra, public.categoria_gasto_606, text, uuid, public.condicion_pago, date, numeric, numeric, numeric, numeric, uuid, text) TO authenticated;
