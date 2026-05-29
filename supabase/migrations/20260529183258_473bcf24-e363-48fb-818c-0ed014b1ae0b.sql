
-- 1. Estado y trazabilidad en cobros
DO $$ BEGIN
  CREATE TYPE estado_cobro AS ENUM ('activo','anulado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.cobros
  ADD COLUMN IF NOT EXISTS estado estado_cobro NOT NULL DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS motivo_estado text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by uuid;

-- 2. Permitir UPDATE/DELETE en cobros y asientos (vía RPC SECURITY DEFINER bypasea, pero
--    habilitamos políticas explícitas para que admin/contador puedan operar también desde API).
DO $$ BEGIN
  CREATE POLICY cobros_update ON public.cobros
    FOR UPDATE TO authenticated
    USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)))
    WITH CHECK (tenant_id = current_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY asientos_delete ON public.asientos_contables
    FOR DELETE TO authenticated
    USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY alineas_delete ON public.asiento_lineas
    FOR DELETE TO authenticated
    USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Función para EDITAR un cobro ya registrado
CREATE OR REPLACE FUNCTION public.editar_cobro(
  _cobro_id   uuid,
  _monto      numeric,
  _fecha      date,
  _metodo     text,
  _banco_id   uuid DEFAULT NULL,
  _nota       text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant uuid; _user uuid;
  _cobro RECORD; _fact RECORD;
  _cuenta_caja uuid; _cuenta_cxc uuid;
  _nuevo_asiento uuid;
  _antes jsonb; _despues jsonb;
BEGIN
  _user := auth.uid();
  SELECT tenant_id INTO _tenant FROM public.profiles WHERE id = _user;

  SELECT * INTO _cobro FROM public.cobros WHERE id = _cobro_id AND tenant_id = _tenant;
  IF _cobro IS NULL THEN RAISE EXCEPTION 'Cobro no encontrado'; END IF;
  IF _cobro.estado = 'anulado' THEN RAISE EXCEPTION 'No se puede editar un cobro anulado'; END IF;

  SELECT * INTO _fact FROM public.facturas WHERE id = _cobro.factura_id;
  IF _fact.estado = 'anulada' THEN RAISE EXCEPTION 'La factura asociada está anulada'; END IF;

  IF _monto <= 0 THEN RAISE EXCEPTION 'Monto inválido'; END IF;
  IF _banco_id IS NOT NULL THEN
    PERFORM 1 FROM public.bancos WHERE id = _banco_id AND tenant_id = _tenant;
    IF NOT FOUND THEN RAISE EXCEPTION 'Banco no válido'; END IF;
  END IF;

  -- snapshot ANTES
  _antes := jsonb_build_object(
    'monto', _cobro.monto, 'fecha', _cobro.fecha, 'metodo', _cobro.metodo,
    'banco_id', _cobro.banco_id, 'nota', _cobro.nota, 'asiento_id', _cobro.asiento_id
  );

  -- 1. Revertir asiento anterior
  IF _cobro.asiento_id IS NOT NULL THEN
    DELETE FROM public.asiento_lineas WHERE asiento_id = _cobro.asiento_id;
    DELETE FROM public.asientos_contables WHERE id = _cobro.asiento_id;
  END IF;

  -- 2. Quitar monto anterior de la factura
  UPDATE public.facturas
    SET monto_pagado = GREATEST(monto_pagado - _cobro.monto, 0)
    WHERE id = _cobro.factura_id;

  -- 3. Crear nuevo asiento con valores nuevos
  SELECT id INTO _cuenta_caja FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='1.1.01.01';
  SELECT id INTO _cuenta_cxc  FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='1.1.02.01';

  INSERT INTO public.asientos_contables (tenant_id, fecha, concepto, origen, origen_id, total_debito, total_credito)
  VALUES (_tenant, _fecha, 'Cobro Factura ' || _fact.ncf || ' (editado)', 'cobro', _cobro.factura_id, _monto, _monto)
  RETURNING id INTO _nuevo_asiento;

  INSERT INTO public.asiento_lineas (tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
  VALUES (_tenant, _nuevo_asiento, _cuenta_caja, _monto, 0, 'Cobro ' || _fact.ncf);
  INSERT INTO public.asiento_lineas (tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
  VALUES (_tenant, _nuevo_asiento, _cuenta_cxc, 0, _monto, 'Cancelación CxC ' || _fact.ncf);

  -- 4. Actualizar cobro
  UPDATE public.cobros SET
    monto = _monto, fecha = _fecha, metodo = _metodo,
    banco_id = _banco_id, nota = _nota, asiento_id = _nuevo_asiento,
    updated_at = now(), updated_by = _user
  WHERE id = _cobro_id;

  -- 5. Re-sumar y recalcular estado
  UPDATE public.facturas
    SET monto_pagado = monto_pagado + _monto,
        estado = CASE
          WHEN monto_pagado + _monto >= total THEN 'pagada'::estado_factura
          ELSE 'pendiente'::estado_factura
        END
    WHERE id = _cobro.factura_id;

  -- 6. Auditoría
  _despues := jsonb_build_object(
    'monto', _monto, 'fecha', _fecha, 'metodo', _metodo,
    'banco_id', _banco_id, 'nota', _nota, 'asiento_id', _nuevo_asiento
  );
  INSERT INTO public.logs_auditoria (tenant_id, user_id, accion, tabla_afectada, registro_id, detalles)
  VALUES (_tenant, _user, 'Edición de Cobro', 'cobros', _cobro_id,
          jsonb_build_object('antes', _antes, 'despues', _despues));

  RETURN _cobro_id;
END $$;

-- 4. Función para ANULAR un cobro
CREATE OR REPLACE FUNCTION public.anular_cobro(
  _cobro_id uuid,
  _motivo   text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant uuid; _user uuid; _cobro RECORD; _fact RECORD;
BEGIN
  _user := auth.uid();
  SELECT tenant_id INTO _tenant FROM public.profiles WHERE id = _user;

  SELECT * INTO _cobro FROM public.cobros WHERE id = _cobro_id AND tenant_id = _tenant;
  IF _cobro IS NULL THEN RAISE EXCEPTION 'Cobro no encontrado'; END IF;
  IF _cobro.estado = 'anulado' THEN RAISE EXCEPTION 'El cobro ya está anulado'; END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN RAISE EXCEPTION 'Debes indicar el motivo de anulación'; END IF;

  SELECT * INTO _fact FROM public.facturas WHERE id = _cobro.factura_id;

  IF _cobro.asiento_id IS NOT NULL THEN
    DELETE FROM public.asiento_lineas WHERE asiento_id = _cobro.asiento_id;
    DELETE FROM public.asientos_contables WHERE id = _cobro.asiento_id;
  END IF;

  UPDATE public.facturas
    SET monto_pagado = GREATEST(monto_pagado - _cobro.monto, 0),
        estado = CASE
          WHEN GREATEST(monto_pagado - _cobro.monto, 0) >= total THEN 'pagada'::estado_factura
          ELSE 'pendiente'::estado_factura
        END
    WHERE id = _cobro.factura_id;

  UPDATE public.cobros SET
    estado = 'anulado', motivo_estado = _motivo, asiento_id = NULL,
    updated_at = now(), updated_by = _user
  WHERE id = _cobro_id;

  INSERT INTO public.logs_auditoria (tenant_id, user_id, accion, tabla_afectada, registro_id, detalles)
  VALUES (_tenant, _user, 'Anulación de Cobro', 'cobros', _cobro_id,
          jsonb_build_object('motivo', _motivo, 'monto_revertido', _cobro.monto, 'factura', _fact.ncf));

  RETURN _cobro_id;
END $$;
