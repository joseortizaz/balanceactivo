-- Inventario: stock en productos + movimientos + integración con facturas

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS stock numeric(14,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS controla_inventario boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS stock_minimo numeric(14,3) NOT NULL DEFAULT 0;

ALTER TABLE public.factura_lineas
  ADD COLUMN IF NOT EXISTS producto_id uuid;

ALTER TABLE public.cotizacion_lineas
  ADD COLUMN IF NOT EXISTS producto_id uuid;

-- Tipo de movimiento
DO $$ BEGIN
  CREATE TYPE tipo_movimiento_inventario AS ENUM ('entrada','salida','ajuste','venta','anulacion_venta');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.movimientos_inventario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  producto_id uuid NOT NULL,
  tipo tipo_movimiento_inventario NOT NULL,
  cantidad numeric(14,3) NOT NULL,
  stock_anterior numeric(14,3) NOT NULL,
  stock_nuevo numeric(14,3) NOT NULL,
  motivo text,
  factura_id uuid,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_mov_inv_producto ON public.movimientos_inventario(producto_id, created_at DESC);

ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;

CREATE POLICY mov_inv_select ON public.movimientos_inventario
  FOR SELECT TO authenticated USING (tenant_id = current_tenant_id());
CREATE POLICY mov_inv_insert ON public.movimientos_inventario
  FOR INSERT TO authenticated WITH CHECK (tenant_id = current_tenant_id());

-- Registrar movimiento manual (entrada / salida / ajuste)
CREATE OR REPLACE FUNCTION public.registrar_movimiento_inventario(
  _producto_id uuid, _tipo tipo_movimiento_inventario, _cantidad numeric, _motivo text, _fecha date DEFAULT CURRENT_DATE
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant uuid; _user uuid; _p RECORD; _delta numeric; _nuevo numeric; _id uuid;
BEGIN
  _user := auth.uid();
  SELECT tenant_id INTO _tenant FROM profiles WHERE id = _user;
  SELECT * INTO _p FROM productos WHERE id = _producto_id AND tenant_id = _tenant;
  IF _p IS NULL THEN RAISE EXCEPTION 'Producto no encontrado'; END IF;
  IF _cantidad <= 0 THEN RAISE EXCEPTION 'Cantidad debe ser mayor a 0'; END IF;

  _delta := CASE WHEN _tipo IN ('entrada','anulacion_venta') THEN _cantidad
                 WHEN _tipo IN ('salida','venta') THEN -_cantidad
                 WHEN _tipo = 'ajuste' THEN _cantidad - _p.stock
            END;
  _nuevo := _p.stock + _delta;

  INSERT INTO movimientos_inventario(tenant_id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, fecha, created_by)
  VALUES (_tenant, _producto_id, _tipo, ABS(_delta), _p.stock, _nuevo, _motivo, _fecha, _user)
  RETURNING id INTO _id;

  UPDATE productos SET stock = _nuevo WHERE id = _producto_id;
  RETURN _id;
END $$;

-- Trigger: al insertar línea de factura con producto_id, descontar stock
CREATE OR REPLACE FUNCTION public.fn_descontar_stock_factura()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p RECORD; _nuevo numeric;
BEGIN
  IF NEW.producto_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO _p FROM productos WHERE id = NEW.producto_id;
  IF _p IS NULL OR _p.controla_inventario = false THEN RETURN NEW; END IF;
  _nuevo := _p.stock - NEW.cantidad;
  INSERT INTO movimientos_inventario(tenant_id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, factura_id, fecha, created_by)
  VALUES (NEW.tenant_id, NEW.producto_id, 'venta', NEW.cantidad, _p.stock, _nuevo, 'Venta factura', NEW.factura_id, CURRENT_DATE, auth.uid());
  UPDATE productos SET stock = _nuevo WHERE id = NEW.producto_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_descontar_stock_factura ON public.factura_lineas;
CREATE TRIGGER trg_descontar_stock_factura
  AFTER INSERT ON public.factura_lineas
  FOR EACH ROW EXECUTE FUNCTION public.fn_descontar_stock_factura();

-- Reescribir crear_factura para aceptar producto_id en cada línea
CREATE OR REPLACE FUNCTION public.crear_factura(_cliente_id uuid, _tipo_ncf tipo_ncf, _condicion condicion_pago, _fecha date, _tipo_descuento tipo_descuento, _descuento_valor numeric, _lineas jsonb, _cuotas jsonb DEFAULT NULL::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  _tenant uuid; _user uuid; _next bigint; _prefijo text; _ncf text;
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
END $function$;

-- Actualizar también actualizar_factura para producto_id
CREATE OR REPLACE FUNCTION public.actualizar_factura(_factura_id uuid, _cliente_id uuid, _condicion condicion_pago, _fecha date, _tipo_descuento tipo_descuento, _descuento_valor numeric, _lineas jsonb, _cuotas jsonb DEFAULT NULL::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  _tenant uuid; _user uuid; _f RECORD; _asiento_id uuid;
  _subtotal numeric(14,2) := 0; _itbis numeric(14,2) := 0; _total numeric(14,2) := 0;
  _desc_abs numeric(14,2);
  _line jsonb; _ls numeric; _li numeric;
  _cuenta_caja uuid; _cuenta_cxc uuid; _cuenta_ingresos uuid; _cuenta_itbis uuid;
  _cuota jsonb; _num integer := 0;
  _old RECORD;
BEGIN
  _user := auth.uid();
  SELECT tenant_id INTO _tenant FROM public.profiles WHERE id = _user;
  IF _tenant IS NULL THEN RAISE EXCEPTION 'Sin tenant'; END IF;

  SELECT * INTO _f FROM public.facturas WHERE id = _factura_id AND tenant_id = _tenant;
  IF _f IS NULL THEN RAISE EXCEPTION 'Factura no encontrada'; END IF;
  IF _f.monto_pagado > 0 THEN RAISE EXCEPTION 'Factura con pagos no puede editarse'; END IF;
  IF (SELECT COUNT(*) FROM public.cobros WHERE factura_id = _factura_id) > 0 THEN
    RAISE EXCEPTION 'Factura con cobros registrados no puede editarse';
  END IF;

  FOR _line IN SELECT * FROM jsonb_array_elements(_lineas) LOOP
    _ls := (_line->>'cantidad')::numeric * (_line->>'precio')::numeric;
    _li := _ls * ((_line->>'tasa_itbis')::numeric / 100.0);
    _subtotal := _subtotal + _ls; _itbis := _itbis + _li;
  END LOOP;
  _desc_abs := public.calcular_descuento_abs(_subtotal, _tipo_descuento, _descuento_valor);
  _total := _subtotal - _desc_abs + _itbis;

  -- Revertir stock de líneas previas
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
    estado = CASE WHEN _condicion='contado' THEN 'pagada'::estado_factura ELSE 'pendiente'::estado_factura END,
    asiento_id = NULL
  WHERE id = _factura_id;

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
  RETURN _factura_id;
END $function$;