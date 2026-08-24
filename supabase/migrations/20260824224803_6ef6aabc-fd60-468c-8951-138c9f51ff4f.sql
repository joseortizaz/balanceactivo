DROP FUNCTION IF EXISTS public.actualizar_gasto(uuid, date, uuid, text, public.tipo_ncf_compra, public.categoria_gasto_606, text, uuid, public.condicion_pago, date, numeric, numeric, numeric, numeric, uuid, text);

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
  _itbis numeric,
  _total numeric,
  _itbis_retenido numeric,
  _isr_retenido numeric,
  _cuenta_pago_id uuid,
  _notas text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant uuid; _user uuid; g RECORD; n RECORD;
  _sub numeric(14,2); _itb numeric(14,2); _tot numeric(14,2);
  _pagado numeric(14,2);
BEGIN
  _user := auth.uid();
  SELECT tenant_id INTO _tenant FROM public.profiles WHERE id = _user;
  IF _tenant IS NULL THEN RAISE EXCEPTION 'Sin tenant'; END IF;

  SELECT * INTO g FROM public.gastos WHERE id = _gasto_id AND tenant_id = _tenant;
  IF g IS NULL THEN RAISE EXCEPTION 'Gasto no encontrado'; END IF;
  IF g.estado = 'anulado' THEN RAISE EXCEPTION 'Gasto anulado no puede editarse'; END IF;

  _itb := round(COALESCE(_itbis, 0), 2);
  _tot := round(COALESCE(_total, 0), 2);
  IF _tot <= 0 THEN
    _sub := round(COALESCE(_subtotal, 0), 2);
    _tot := _sub + _itb;
  ELSE
    _sub := _tot - _itb;
  END IF;
  IF _sub < 0 THEN RAISE EXCEPTION 'El ITBIS no puede ser mayor que el total'; END IF;

  SELECT COALESCE(SUM(monto), 0) INTO _pagado FROM public.pagos_gasto WHERE gasto_id = _gasto_id;

  -- Borrar asiento del gasto (los asientos de pagos se conservan)
  IF g.asiento_id IS NOT NULL THEN
    DELETE FROM public.asiento_lineas WHERE asiento_id = g.asiento_id;
    DELETE FROM public.asientos_contables WHERE id = g.asiento_id;
  END IF;

  UPDATE public.gastos SET
    fecha = _fecha, proveedor_id = _proveedor_id, ncf = NULLIF(_ncf,''),
    tipo_ncf_compra = _tipo_ncf_compra, categoria = _categoria,
    concepto = _concepto, cuenta_gasto_id = _cuenta_gasto_id,
    condicion_pago = _condicion_pago, fecha_vencimiento = _fecha_vencimiento,
    subtotal = _sub, itbis = _itb, total = _tot,
    itbis_retenido = COALESCE(_itbis_retenido,0), isr_retenido = COALESCE(_isr_retenido,0),
    cuenta_pago_id = CASE WHEN _condicion_pago = 'contado' THEN _cuenta_pago_id ELSE NULL END,
    notas = _notas,
    asiento_id = NULL,
    estado = 'pendiente',
    monto_pagado = _pagado
  WHERE id = _gasto_id;

  -- Regenerar asiento del gasto
  PERFORM public.registrar_gasto(_gasto_id);

  -- Ajustar estado según pagos previamente registrados
  IF _pagado > 0 THEN
    UPDATE public.gastos
      SET monto_pagado = _pagado,
          estado = CASE WHEN _pagado >= _tot - COALESCE(_itbis_retenido,0) - COALESCE(_isr_retenido,0)
                        THEN 'pagado'::public.estado_gasto ELSE 'pendiente'::public.estado_gasto END
    WHERE id = _gasto_id;
  END IF;

  SELECT * INTO n FROM public.gastos WHERE id = _gasto_id;

  INSERT INTO public.logs_auditoria (tenant_id, user_id, accion, tabla_afectada, registro_id, detalles)
  VALUES (_tenant, _user, 'Edicion de Gasto', 'gastos', _gasto_id,
    jsonb_build_object(
      'antes', jsonb_build_object(
        'fecha', g.fecha, 'proveedor_id', g.proveedor_id, 'ncf', g.ncf,
        'tipo_ncf_compra', g.tipo_ncf_compra, 'categoria', g.categoria, 'concepto', g.concepto,
        'cuenta_gasto_id', g.cuenta_gasto_id, 'condicion_pago', g.condicion_pago,
        'fecha_vencimiento', g.fecha_vencimiento, 'subtotal', g.subtotal, 'itbis', g.itbis,
        'itbis_retenido', g.itbis_retenido, 'isr_retenido', g.isr_retenido, 'total', g.total,
        'estado', g.estado, 'monto_pagado', g.monto_pagado, 'notas', g.notas),
      'despues', jsonb_build_object(
        'fecha', n.fecha, 'proveedor_id', n.proveedor_id, 'ncf', n.ncf,
        'tipo_ncf_compra', n.tipo_ncf_compra, 'categoria', n.categoria, 'concepto', n.concepto,
        'cuenta_gasto_id', n.cuenta_gasto_id, 'condicion_pago', n.condicion_pago,
        'fecha_vencimiento', n.fecha_vencimiento, 'subtotal', n.subtotal, 'itbis', n.itbis,
        'itbis_retenido', n.itbis_retenido, 'isr_retenido', n.isr_retenido, 'total', n.total,
        'estado', n.estado, 'monto_pagado', n.monto_pagado, 'notas', n.notas)
    ));

  RETURN _gasto_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.actualizar_gasto(uuid, date, uuid, text, public.tipo_ncf_compra, public.categoria_gasto_606, text, uuid, public.condicion_pago, date, numeric, numeric, numeric, numeric, numeric, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.actualizar_gasto(uuid, date, uuid, text, public.tipo_ncf_compra, public.categoria_gasto_606, text, uuid, public.condicion_pago, date, numeric, numeric, numeric, numeric, numeric, uuid, text) TO authenticated;