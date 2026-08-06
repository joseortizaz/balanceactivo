
-- 1) Sincronizar contadores con el máximo NCF realmente emitido
UPDATE public.ncf_secuencias s
SET secuencia_actual = GREATEST(s.secuencia_actual, sub.maxnum)
FROM (
  SELECT f.tenant_id, f.tipo_ncf, MAX(NULLIF(regexp_replace(f.ncf, '\D', '', 'g'), '')::bigint) AS maxnum
  FROM public.facturas f GROUP BY f.tenant_id, f.tipo_ncf
) sub
WHERE s.tenant_id = sub.tenant_id AND s.tipo = sub.tipo_ncf AND sub.maxnum IS NOT NULL;

-- 2) Helper: obtiene el siguiente NCF libre de forma atómica
CREATE OR REPLACE FUNCTION public.siguiente_ncf_libre(_tenant uuid, _tipo tipo_ncf)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _next bigint; _prefijo text; _ncf text; _i int := 0;
BEGIN
  LOOP
    _i := _i + 1;
    IF _i > 10000 THEN RAISE EXCEPTION 'No se pudo asignar un NCF libre'; END IF;
    UPDATE public.ncf_secuencias SET secuencia_actual = secuencia_actual + 1
      WHERE tenant_id = _tenant AND tipo = _tipo AND activo = true
      RETURNING secuencia_actual, prefijo INTO _next, _prefijo;
    IF _next IS NULL THEN RAISE EXCEPTION 'Secuencia NCF no configurada para %', _tipo; END IF;
    _ncf := _prefijo || lpad(_next::text, 8, '0');
    IF NOT EXISTS (SELECT 1 FROM public.facturas f WHERE f.tenant_id = _tenant AND f.ncf = _ncf) THEN
      RETURN _ncf;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.siguiente_ncf_libre(uuid, tipo_ncf) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.siguiente_ncf_libre(uuid, tipo_ncf) TO authenticated, service_role;

-- 3) crear_factura usa el helper
CREATE OR REPLACE FUNCTION public.crear_factura(_cliente_id uuid, _tipo_ncf tipo_ncf, _condicion condicion_pago, _fecha date, _tipo_descuento tipo_descuento, _descuento_valor numeric, _lineas jsonb, _cuotas jsonb DEFAULT NULL::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _tenant uuid; _user uuid; _ncf text;
  _factura_id uuid; _asiento_id uuid;
  _subtotal numeric(14,2) := 0; _itbis numeric(14,2) := 0; _total numeric(14,2) := 0;
  _desc_abs numeric(14,2);
  _line jsonb; _ls numeric; _li numeric;
  _cuenta_caja uuid; _cuenta_cxc uuid; _cuenta_ingresos uuid; _cuenta_itbis uuid;
  _cuota jsonb; _num integer := 0;
BEGIN
  _user := auth.uid();
  IF _user IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT tenant_id INTO _tenant FROM public.profiles WHERE id = _user;
  IF _tenant IS NULL THEN RAISE EXCEPTION 'Sin tenant'; END IF;

  _ncf := public.siguiente_ncf_libre(_tenant, _tipo_ncf);

  FOR _line IN SELECT * FROM jsonb_array_elements(_lineas) LOOP
    _ls := (_line->>'cantidad')::numeric * (_line->>'precio')::numeric;
    _li := _ls * ((_line->>'tasa_itbis')::numeric / 100.0);
    _subtotal := _subtotal + _ls; _itbis := _itbis + _li;
  END LOOP;

  _desc_abs := public.calcular_descuento_abs(_subtotal, _tipo_descuento, _descuento_valor);
  _total := _subtotal - _desc_abs + _itbis;

  INSERT INTO public.facturas (tenant_id, cliente_id, tipo_ncf, ncf, fecha, condicion_pago,
    subtotal, descuento, tipo_descuento, descuento_valor, itbis, total, estado, created_by)
  VALUES (_tenant, _cliente_id, _tipo_ncf, _ncf, _fecha, _condicion,
    _subtotal, _desc_abs, _tipo_descuento, _descuento_valor, _itbis, _total,
    CASE WHEN _condicion='contado' THEN 'pagada'::estado_factura ELSE 'pendiente'::estado_factura END, _user)
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

  INSERT INTO public.logs_auditoria (tenant_id, user_id, accion, tabla_afectada, registro_id, detalles)
  VALUES (_tenant, _user, 'Creacion de Factura', 'facturas', _factura_id, jsonb_build_object('ncf', _ncf, 'total', _total));

  RETURN _factura_id;
END;
$fn$;
