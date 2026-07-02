
CREATE OR REPLACE FUNCTION public.crear_factura_api(
  _tenant uuid, _cliente_id uuid, _tipo_ncf tipo_ncf, _condicion condicion_pago,
  _fecha date, _tipo_descuento tipo_descuento, _descuento_valor numeric,
  _lineas jsonb, _cuotas jsonb DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _next bigint; _prefijo text; _ncf text; _factura_id uuid; _asiento_id uuid;
  _subtotal numeric(14,2) := 0; _itbis numeric(14,2) := 0; _total numeric(14,2) := 0;
  _desc_abs numeric(14,2);
  _line jsonb; _ls numeric; _li numeric;
  _cuenta_caja uuid; _cuenta_cxc uuid; _cuenta_ingresos uuid; _cuenta_itbis uuid;
  _cuota jsonb; _num integer := 0;
BEGIN
  PERFORM 1 FROM public.clientes WHERE id = _cliente_id AND tenant_id = _tenant;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cliente no pertenece al tenant'; END IF;

  UPDATE public.ncf_secuencias SET secuencia_actual = secuencia_actual + 1
    WHERE tenant_id = _tenant AND tipo = _tipo_ncf AND activo = true
    RETURNING secuencia_actual, prefijo INTO _next, _prefijo;
  IF _next IS NULL THEN RAISE EXCEPTION 'Secuencia NCF no configurada para %', _tipo_ncf; END IF;
  _ncf := _prefijo || lpad(_next::text, 8, '0');

  FOR _line IN SELECT * FROM jsonb_array_elements(_lineas) LOOP
    _ls := (_line->>'cantidad')::numeric * (_line->>'precio')::numeric;
    _li := _ls * ((_line->>'tasa_itbis')::numeric / 100.0);
    _subtotal := _subtotal + _ls; _itbis := _itbis + _li;
  END LOOP;
  _desc_abs := public.calcular_descuento_abs(_subtotal, _tipo_descuento, _descuento_valor);
  _total := _subtotal - _desc_abs + _itbis;

  INSERT INTO public.facturas (tenant_id, cliente_id, tipo_ncf, ncf, fecha, condicion_pago,
    subtotal, descuento, tipo_descuento, descuento_valor, itbis, total, estado)
  VALUES (_tenant, _cliente_id, _tipo_ncf, _ncf, _fecha, _condicion,
    _subtotal, _desc_abs, _tipo_descuento, _descuento_valor, _itbis, _total,
    CASE WHEN _condicion='contado' THEN 'pagada'::estado_factura ELSE 'pendiente'::estado_factura END)
  RETURNING id INTO _factura_id;

  FOR _line IN SELECT * FROM jsonb_array_elements(_lineas) LOOP
    _ls := (_line->>'cantidad')::numeric * (_line->>'precio')::numeric;
    _li := _ls * ((_line->>'tasa_itbis')::numeric / 100.0);
    INSERT INTO public.factura_lineas (tenant_id, factura_id, producto_id, descripcion, cantidad, precio, tasa_itbis, subtotal, itbis, total)
    VALUES (_tenant, _factura_id, NULLIF(_line->>'producto_id','')::uuid, _line->>'descripcion',
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

  SELECT id INTO _cuenta_caja FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='1.1.01.01';
  SELECT id INTO _cuenta_cxc FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='1.1.02.01';
  SELECT id INTO _cuenta_ingresos FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='4.1.01';
  SELECT id INTO _cuenta_itbis FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='2.1.02.01';

  INSERT INTO public.asientos_contables (tenant_id, fecha, concepto, origen, origen_id, total_debito, total_credito)
  VALUES (_tenant, _fecha, 'Factura ' || _ncf, 'factura', _factura_id, _total, _total)
  RETURNING id INTO _asiento_id;

  INSERT INTO public.asiento_lineas (tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
  VALUES (_tenant, _asiento_id, CASE WHEN _condicion='contado' THEN _cuenta_caja ELSE _cuenta_cxc END, _total, 0, 'Factura ' || _ncf);
  INSERT INTO public.asiento_lineas (tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
  VALUES (_tenant, _asiento_id, _cuenta_ingresos, 0, _subtotal - _desc_abs, 'Ingresos ' || _ncf);
  IF _itbis > 0 THEN
    INSERT INTO public.asiento_lineas (tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
    VALUES (_tenant, _asiento_id, _cuenta_itbis, 0, _itbis, 'ITBIS ' || _ncf);
  END IF;

  UPDATE public.facturas SET asiento_id = _asiento_id WHERE id = _factura_id;
  RETURN _factura_id;
END $$;

REVOKE ALL ON FUNCTION public.crear_factura_api(uuid,uuid,tipo_ncf,condicion_pago,date,tipo_descuento,numeric,jsonb,jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crear_factura_api(uuid,uuid,tipo_ncf,condicion_pago,date,tipo_descuento,numeric,jsonb,jsonb) TO service_role;

-- ============ registrar_cobro_api ============
CREATE OR REPLACE FUNCTION public.registrar_cobro_api(
  _tenant uuid, _factura_id uuid, _monto numeric, _metodo text,
  _fecha date, _banco_id uuid DEFAULT NULL, _nota text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cobro_id UUID; _asiento_id UUID;
  _cuenta_caja UUID; _cuenta_cxc UUID;
  _fact RECORD;
BEGIN
  SELECT * INTO _fact FROM public.facturas WHERE id = _factura_id AND tenant_id = _tenant;
  IF _fact IS NULL THEN RAISE EXCEPTION 'Factura no encontrada'; END IF;
  IF _banco_id IS NOT NULL THEN
    PERFORM 1 FROM public.bancos WHERE id = _banco_id AND tenant_id = _tenant;
    IF NOT FOUND THEN RAISE EXCEPTION 'Banco no válido'; END IF;
  END IF;
  SELECT id INTO _cuenta_caja FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='1.1.01.01';
  SELECT id INTO _cuenta_cxc FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='1.1.02.01';

  INSERT INTO public.asientos_contables (tenant_id, fecha, concepto, origen, origen_id, total_debito, total_credito)
  VALUES (_tenant, _fecha, 'Cobro Factura ' || _fact.ncf, 'cobro', _factura_id, _monto, _monto)
  RETURNING id INTO _asiento_id;
  INSERT INTO public.asiento_lineas (tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
  VALUES (_tenant, _asiento_id, _cuenta_caja, _monto, 0, 'Cobro ' || _fact.ncf);
  INSERT INTO public.asiento_lineas (tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
  VALUES (_tenant, _asiento_id, _cuenta_cxc, 0, _monto, 'Cancelacion CxC ' || _fact.ncf);

  INSERT INTO public.cobros (tenant_id, factura_id, fecha, monto, metodo, banco_id, asiento_id, nota)
  VALUES (_tenant, _factura_id, _fecha, _monto, _metodo, _banco_id, _asiento_id, _nota)
  RETURNING id INTO _cobro_id;

  UPDATE public.facturas
    SET monto_pagado = monto_pagado + _monto,
        estado = CASE WHEN monto_pagado + _monto >= total THEN 'pagada'::estado_factura ELSE estado END
    WHERE id = _factura_id;
  RETURN _cobro_id;
END $$;

REVOKE ALL ON FUNCTION public.registrar_cobro_api(uuid,uuid,numeric,text,date,uuid,text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_cobro_api(uuid,uuid,numeric,text,date,uuid,text) TO service_role;
