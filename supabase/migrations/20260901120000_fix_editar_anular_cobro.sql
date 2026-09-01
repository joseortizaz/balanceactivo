-- Corrige dos bugs en editar_cobro/anular_cobro (nunca funcionaron desde que
-- se crearon en 20260529185232 -- no son una regresion de trabajo reciente).
--
-- Bug 1: "column "estado" is of type estado_factura but expression is of
-- type text". El CASE que recalcula facturas.estado tenia 3 ramas con
-- literales de texto sin castear ('pagada' | 'parcial' | 'pendiente'). Un
-- CASE con solo literales de texto se tipa como `text` (no como `unknown`),
-- y Postgres NO castea automaticamente `text` a un enum en un UPDATE -- solo
-- castea literales `unknown`. Ademas 'parcial' nunca fue un valor valido de
-- estado_factura (ese es un valor de estado_cuota, para las cuotas
-- individuales; una factura en el resto del sistema se queda en 'pendiente'
-- hasta que se paga por completo, ver registrar_cobro). Se corrige con el
-- mismo patron de 2 ramas + cast explicito que ya usa registrar_cobro:
--   CASE WHEN monto_pagado >= total THEN 'pagada'::estado_factura
--        ELSE 'pendiente'::estado_factura END
-- y se excluyen tambien las facturas 'cerrada' del recalculo (antes solo se
-- excluia 'anulada'): una factura cerrada es un estado terminal para efectos
-- de cobro, igual que anulada.
--
-- Bug 2: el INSERT a logs_auditoria usaba columnas (entidad, entidad_id,
-- antes, despues) que no existen en esa tabla -- su esquema real es
-- (accion, tabla_afectada, registro_id, detalles), el mismo que usan
-- anular_factura/cerrar_factura y que lee la pagina de Auditoria. Ese INSERT
-- iba a fallar con "column does not exist" tan pronto se corrigiera el bug 1.

CREATE OR REPLACE FUNCTION public.editar_cobro(
  _cobro_id uuid, _monto numeric, _fecha date, _metodo text, _banco_id uuid, _nota text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cobro public.cobros%ROWTYPE;
  _fact public.facturas%ROWTYPE;
  _tenant uuid; _user uuid := auth.uid();
  _antes jsonb; _despues jsonb;
  _cuenta_caja uuid; _cuenta_cxc uuid; _nuevo_asiento uuid;
BEGIN
  SELECT * INTO _cobro FROM public.cobros WHERE id = _cobro_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cobro no encontrado'; END IF;
  IF _cobro.estado = 'anulado' THEN RAISE EXCEPTION 'No se puede editar un cobro anulado'; END IF;
  SELECT * INTO _fact FROM public.facturas WHERE id = _cobro.factura_id;
  IF _fact.estado = 'anulada' THEN RAISE EXCEPTION 'La factura asociada esta anulada'; END IF;
  IF _fact.estado = 'cerrada' THEN RAISE EXCEPTION 'La factura asociada esta cerrada'; END IF;
  _tenant := _cobro.tenant_id;
  _antes := jsonb_build_object('monto',_cobro.monto,'fecha',_cobro.fecha,'metodo',_cobro.metodo,
    'banco_id',_cobro.banco_id,'nota',_cobro.nota,'asiento_id',_cobro.asiento_id);

  IF _cobro.asiento_id IS NOT NULL THEN
    UPDATE public.cobros SET asiento_id = NULL WHERE id = _cobro_id;
    DELETE FROM public.asiento_lineas WHERE asiento_id = _cobro.asiento_id;
    DELETE FROM public.asientos_contables WHERE id = _cobro.asiento_id;
  END IF;

  UPDATE public.facturas SET monto_pagado = COALESCE(monto_pagado,0) - _cobro.monto + _monto
  WHERE id = _cobro.factura_id;

  SELECT id INTO _cuenta_caja FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='1101' LIMIT 1;
  SELECT id INTO _cuenta_cxc  FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='1102' LIMIT 1;
  IF _cuenta_caja IS NOT NULL AND _cuenta_cxc IS NOT NULL THEN
    INSERT INTO public.asientos_contables (tenant_id,fecha,concepto,origen,origen_id,total_debito,total_credito)
    VALUES (_tenant,_fecha,'Cobro factura '||_fact.ncf,'cobro',_cobro_id,_monto,_monto)
    RETURNING id INTO _nuevo_asiento;
    INSERT INTO public.asiento_lineas (tenant_id,asiento_id,cuenta_id,debito,credito,descripcion)
    VALUES (_tenant,_nuevo_asiento,_cuenta_caja,_monto,0,'Cobro '||_fact.ncf);
    INSERT INTO public.asiento_lineas (tenant_id,asiento_id,cuenta_id,debito,credito,descripcion)
    VALUES (_tenant,_nuevo_asiento,_cuenta_cxc,0,_monto,'Cancelacion CxC '||_fact.ncf);
  END IF;

  UPDATE public.cobros SET monto=_monto, fecha=_fecha, metodo=_metodo,
    banco_id=_banco_id, nota=_nota, asiento_id=_nuevo_asiento,
    updated_at=now(), updated_by=_user
  WHERE id=_cobro_id;

  UPDATE public.facturas SET estado = CASE
    WHEN COALESCE(monto_pagado,0) >= total THEN 'pagada'::estado_factura
    ELSE 'pendiente'::estado_factura END
  WHERE id=_cobro.factura_id AND estado NOT IN ('anulada','cerrada');

  _despues := jsonb_build_object('monto',_monto,'fecha',_fecha,'metodo',_metodo,
    'banco_id',_banco_id,'nota',_nota,'asiento_id',_nuevo_asiento);
  INSERT INTO public.logs_auditoria (tenant_id,user_id,accion,tabla_afectada,registro_id,detalles)
  VALUES (_tenant,_user,'editar_cobro','cobros',_cobro_id,
    jsonb_build_object('antes',_antes,'despues',_despues));
END; $$;

CREATE OR REPLACE FUNCTION public.anular_cobro(_cobro_id uuid, _motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cobro public.cobros%ROWTYPE;
  _user uuid := auth.uid();
  _antes jsonb; _asiento_old uuid;
BEGIN
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN
    RAISE EXCEPTION 'Debe indicar un motivo de anulacion';
  END IF;
  SELECT * INTO _cobro FROM public.cobros WHERE id = _cobro_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cobro no encontrado'; END IF;
  IF _cobro.estado = 'anulado' THEN RAISE EXCEPTION 'El cobro ya esta anulado'; END IF;

  _antes := to_jsonb(_cobro);
  _asiento_old := _cobro.asiento_id;

  UPDATE public.cobros SET estado='anulado', motivo_estado=_motivo, asiento_id=NULL,
    updated_at=now(), updated_by=_user
  WHERE id=_cobro_id;

  IF _asiento_old IS NOT NULL THEN
    DELETE FROM public.asiento_lineas WHERE asiento_id = _asiento_old;
    DELETE FROM public.asientos_contables WHERE id = _asiento_old;
  END IF;

  UPDATE public.facturas
  SET monto_pagado = GREATEST(COALESCE(monto_pagado,0) - _cobro.monto, 0)
  WHERE id = _cobro.factura_id;

  UPDATE public.facturas SET estado = CASE
    WHEN COALESCE(monto_pagado,0) >= total THEN 'pagada'::estado_factura
    ELSE 'pendiente'::estado_factura END
  WHERE id=_cobro.factura_id AND estado NOT IN ('anulada','cerrada');

  INSERT INTO public.logs_auditoria (tenant_id,user_id,accion,tabla_afectada,registro_id,detalles)
  VALUES (_cobro.tenant_id,_user,'anular_cobro','cobros',_cobro_id,
    jsonb_build_object('antes',_antes,'motivo',_motivo));
END; $$;
