-- Las facturas cerradas (cerrar_factura) no se recalculan: sus cuotas quedan
-- congeladas tal como estaban. Solo se recalculan facturas pendiente y pagada.
-- (Las cuotas impagas, incluidas las parciales, con fecha pasada siguen
-- pasando a 'vencida'.)

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
  IF NOT FOUND OR _f.estado IN ('anulada','cerrada') THEN RETURN; END IF;

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

CREATE OR REPLACE FUNCTION public.marcar_cuotas_vencidas()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  UPDATE public.factura_cuotas fc
     SET estado = 'vencida'::estado_cuota
    FROM public.facturas f
   WHERE f.id = fc.factura_id
     AND f.estado NOT IN ('anulada','cerrada')
     AND fc.estado IN ('pendiente','parcial')
     AND fc.monto_pagado < fc.monto - 0.01
     AND fc.fecha_vencimiento < (now() AT TIME ZONE 'America/Santo_Domingo')::date;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $$;
