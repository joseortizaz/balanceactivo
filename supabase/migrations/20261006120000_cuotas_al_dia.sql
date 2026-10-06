-- Cuotas al día: aplica los cobros a factura_cuotas, interruptor de
-- recordatorios por tenant y webhook cobro.updated.
--
-- Regla de aplicación de pagos (acordada con la dirección de Ceapsi):
--   inicial    = max(total - suma(cuotas), 0)
--   disponible = max(monto_pagado - inicial, 0)
-- Los pagos cubren primero el inicial y luego las cuotas, de la más antigua
-- a la más nueva.

-- 1) Recalculo de cuotas de una factura ------------------------------------
CREATE OR REPLACE FUNCTION public.recalcular_cuotas_factura(_factura_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _f record;
  _suma numeric;
  _disp numeric;
  _hoy date := (now() AT TIME ZONE 'America/Santo_Domingo')::date;
BEGIN
  SELECT id, total, COALESCE(monto_pagado,0) AS monto_pagado, estado
    INTO _f FROM public.facturas WHERE id = _factura_id;
  IF NOT FOUND OR _f.estado = 'anulada' THEN RETURN; END IF;

  IF _f.estado = 'pagada' THEN
    UPDATE public.factura_cuotas
       SET monto_pagado = monto, estado = 'pagada'::estado_cuota
     WHERE factura_id = _factura_id
       AND (monto_pagado IS DISTINCT FROM monto OR estado IS DISTINCT FROM 'pagada'::estado_cuota);
    RETURN;
  END IF;

  SELECT COALESCE(SUM(monto),0) INTO _suma FROM public.factura_cuotas WHERE factura_id = _factura_id;
  IF _suma = 0 THEN RETURN; END IF;
  _disp := GREATEST(_f.monto_pagado - GREATEST(_f.total - _suma, 0), 0);

  WITH base AS (
    SELECT id, monto, fecha_vencimiento,
           LEAST(monto, GREATEST(_disp - (SUM(monto) OVER (ORDER BY numero_cuota, id) - monto), 0)) AS pag
      FROM public.factura_cuotas
     WHERE factura_id = _factura_id
  ), calc AS (
    SELECT id, pag,
           CASE
             WHEN pag >= monto - 0.01 THEN 'pagada'
             WHEN fecha_vencimiento < _hoy THEN 'vencida'
             WHEN pag > 0 THEN 'parcial'
             ELSE 'pendiente'
           END::estado_cuota AS est
      FROM base
  )
  UPDATE public.factura_cuotas fc
     SET monto_pagado = calc.pag, estado = calc.est
    FROM calc
   WHERE fc.id = calc.id
     AND (fc.monto_pagado IS DISTINCT FROM calc.pag OR fc.estado IS DISTINCT FROM calc.est);
END $$;

REVOKE ALL ON FUNCTION public.recalcular_cuotas_factura(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalcular_cuotas_factura(uuid) TO service_role;

-- 2) Triggers ----------------------------------------------------------------
-- Todos los flujos de cobro (registrar_cobro, registrar_cobro_api, editar_cobro,
-- anular_cobro) terminan modificando facturas.monto_pagado.
CREATE OR REPLACE FUNCTION public.fn_recalc_cuotas_por_factura()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recalcular_cuotas_factura(NEW.id);
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_recalc_cuotas_factura ON public.facturas;
CREATE TRIGGER trg_recalc_cuotas_factura
  AFTER UPDATE OF monto_pagado, total, estado ON public.facturas
  FOR EACH ROW
  WHEN (OLD.monto_pagado IS DISTINCT FROM NEW.monto_pagado
     OR OLD.total IS DISTINCT FROM NEW.total
     OR OLD.estado IS DISTINCT FROM NEW.estado)
  EXECUTE FUNCTION public.fn_recalc_cuotas_por_factura();

-- Cuotas recién creadas/recreadas (crear_factura, crear_factura_api,
-- actualizar_factura). La función solo hace UPDATE sobre factura_cuotas, así
-- que no entra en bucle.
CREATE OR REPLACE FUNCTION public.fn_recalc_cuotas_por_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  FOR _id IN SELECT DISTINCT factura_id FROM nuevas LOOP
    PERFORM public.recalcular_cuotas_factura(_id);
  END LOOP;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_recalc_cuotas_insert ON public.factura_cuotas;
CREATE TRIGGER trg_recalc_cuotas_insert
  AFTER INSERT ON public.factura_cuotas
  REFERENCING NEW TABLE AS nuevas
  FOR EACH STATEMENT EXECUTE FUNCTION public.fn_recalc_cuotas_por_insert();

-- 3) Cron diario: pasa a 'vencida' las cuotas impagas cuya fecha ya pasó ------
CREATE OR REPLACE FUNCTION public.marcar_cuotas_vencidas()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  UPDATE public.factura_cuotas fc
     SET estado = 'vencida'::estado_cuota
    FROM public.facturas f
   WHERE f.id = fc.factura_id
     AND f.estado <> 'anulada'
     AND fc.estado IN ('pendiente','parcial')
     AND fc.monto_pagado < fc.monto - 0.01
     AND fc.fecha_vencimiento < (now() AT TIME ZONE 'America/Santo_Domingo')::date;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $$;

REVOKE ALL ON FUNCTION public.marcar_cuotas_vencidas() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_cuotas_vencidas() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'marcar-cuotas-vencidas';
    -- 00:05 hora RD (UTC-4, sin horario de verano) = 04:05 UTC
    PERFORM cron.schedule('marcar-cuotas-vencidas', '5 4 * * *', 'SELECT public.marcar_cuotas_vencidas()');
  ELSE
    RAISE NOTICE 'pg_cron no está instalado: programar manualmente public.marcar_cuotas_vencidas()';
  END IF;
END $$;

-- 4) Interruptor por tenant de los correos propios de cuotas ----------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS recordatorios_cuotas_activos boolean NOT NULL DEFAULT true;

-- Ceapsi: los avisos a los alumnos los envía el LMS.
UPDATE public.tenants SET recordatorios_cuotas_activos = false
 WHERE id = 'b2b8cf46-1b1b-482c-94fc-94deca68f1e3';

-- 5) Webhook: cobro.updated cuando un cobro cambia (anulación / edición) ------
CREATE OR REPLACE FUNCTION public.fn_wh_cobro()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.emit_webhook(NEW.tenant_id,
    CASE WHEN TG_OP = 'INSERT' THEN 'cobro.created' ELSE 'cobro.updated' END,
    jsonb_build_object('id', NEW.id, 'factura_id', NEW.factura_id, 'monto', NEW.monto,
      'fecha', NEW.fecha, 'metodo', NEW.metodo, 'banco_id', NEW.banco_id, 'estado', NEW.estado));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_wh_cobro_upd ON public.cobros;
CREATE TRIGGER trg_wh_cobro_upd AFTER UPDATE ON public.cobros
  FOR EACH ROW
  WHEN (OLD.estado IS DISTINCT FROM NEW.estado
     OR OLD.monto IS DISTINCT FROM NEW.monto
     OR OLD.fecha IS DISTINCT FROM NEW.fecha)
  EXECUTE FUNCTION public.fn_wh_cobro();

-- 6) Backfill ---------------------------------------------------------------
DO $$
DECLARE _id uuid;
BEGIN
  FOR _id IN SELECT DISTINCT factura_id FROM public.factura_cuotas LOOP
    PERFORM public.recalcular_cuotas_factura(_id);
  END LOOP;
END $$;
