DO $$ BEGIN CREATE TYPE estado_prestamo AS ENUM ('activo','cancelado','pagado'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE tipo_ausencia AS ENUM ('vacaciones','licencia_medica','permiso','maternidad','sin_goce','otro'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE tipo_nomina AS ENUM ('regular','regalia_pascual','bonificacion'); EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.nominas ADD COLUMN IF NOT EXISTS tipo tipo_nomina NOT NULL DEFAULT 'regular';

CREATE TABLE IF NOT EXISTS public.prestamos_empleado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  empleado_id uuid NOT NULL,
  fecha_inicio date NOT NULL DEFAULT CURRENT_DATE,
  monto_original numeric(14,2) NOT NULL,
  saldo numeric(14,2) NOT NULL,
  cuota numeric(14,2) NOT NULL,
  descontar_en_nomina boolean NOT NULL DEFAULT true,
  estado estado_prestamo NOT NULL DEFAULT 'activo',
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.prestamos_empleado ENABLE ROW LEVEL SECURITY;
CREATE POLICY prest_select ON public.prestamos_empleado FOR SELECT TO authenticated USING (tenant_id = current_tenant_id());
CREATE POLICY prest_manage ON public.prestamos_empleado FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador')))
  WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador')));

CREATE TABLE IF NOT EXISTS public.ausencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  empleado_id uuid NOT NULL,
  tipo tipo_ausencia NOT NULL,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  dias numeric(6,2) NOT NULL,
  con_goce boolean NOT NULL DEFAULT true,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.ausencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY aus_select ON public.ausencias FOR SELECT TO authenticated USING (tenant_id = current_tenant_id());
CREATE POLICY aus_manage ON public.ausencias FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador')))
  WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador')));

CREATE TABLE IF NOT EXISTS public.terminaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  empleado_id uuid NOT NULL,
  fecha_salida date NOT NULL,
  motivo motivo_terminacion NOT NULL,
  anos_servicio numeric(6,3) NOT NULL,
  salario_promedio numeric(14,2) NOT NULL,
  preaviso_dias int NOT NULL DEFAULT 0,
  preaviso_monto numeric(14,2) NOT NULL DEFAULT 0,
  cesantia_dias int NOT NULL DEFAULT 0,
  cesantia_monto numeric(14,2) NOT NULL DEFAULT 0,
  vacaciones_monto numeric(14,2) NOT NULL DEFAULT 0,
  regalia_monto numeric(14,2) NOT NULL DEFAULT 0,
  otros numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  notas text,
  asiento_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.terminaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY term_select ON public.terminaciones FOR SELECT TO authenticated USING (tenant_id = current_tenant_id());
CREATE POLICY term_manage ON public.terminaciones FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador')))
  WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'contador')));

CREATE OR REPLACE FUNCTION public.calcular_prestaciones(_empleado_id uuid, _motivo motivo_terminacion, _fecha_salida date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant uuid; _emp RECORD; _anios numeric; _dia numeric;
  _preaviso_d int := 0; _cesantia_d int := 0;
  _preaviso_m numeric := 0; _cesantia_m numeric := 0;
  _vac_dias numeric := 0; _vac_m numeric := 0;
  _reg_m numeric := 0; _meses_trab numeric;
BEGIN
  SELECT tenant_id INTO _tenant FROM profiles WHERE id = auth.uid();
  SELECT * INTO _emp FROM empleados WHERE id = _empleado_id AND tenant_id = _tenant;
  IF _emp IS NULL THEN RAISE EXCEPTION 'Empleado no encontrado'; END IF;

  _anios := EXTRACT(EPOCH FROM (_fecha_salida - _emp.fecha_ingreso)) / (365.25 * 86400);
  _dia := _emp.salario_base / 23.83;

  IF _motivo IN ('desahucio','despido_justificado','mutuo_acuerdo') THEN
    IF _motivo = 'desahucio' THEN
      IF _anios >= 1.0/12 AND _anios < 0.25 THEN _preaviso_d := 7;
      ELSIF _anios < 0.5 THEN _preaviso_d := 14;
      ELSIF _anios >= 0.5 THEN _preaviso_d := 28; END IF;
    END IF;
    IF _motivo = 'desahucio' OR _motivo = 'mutuo_acuerdo' THEN
      IF _anios >= 3.0/12 AND _anios < 0.5 THEN _cesantia_d := 6;
      ELSIF _anios < 1 THEN _cesantia_d := 13;
      ELSIF _anios < 5 THEN _cesantia_d := FLOOR(_anios) * 21;
      ELSE _cesantia_d := FLOOR(_anios) * 23; END IF;
    END IF;
  END IF;

  _preaviso_m := ROUND(_preaviso_d * _dia, 2);
  _cesantia_m := ROUND(_cesantia_d * _dia, 2);

  IF _anios >= 1 THEN _vac_dias := CASE WHEN _anios < 5 THEN 14 ELSE 18 END;
  ELSE _vac_dias := ROUND(14 * _anios, 2); END IF;
  _vac_m := ROUND(_vac_dias * _dia, 2);

  _meses_trab := EXTRACT(MONTH FROM _fecha_salida) + (EXTRACT(DAY FROM _fecha_salida)/30.0);
  _reg_m := ROUND(_emp.salario_base * (_meses_trab / 12.0), 2);

  RETURN jsonb_build_object(
    'anos_servicio', ROUND(_anios::numeric, 3),
    'salario_diario', ROUND(_dia::numeric, 2),
    'preaviso_dias', _preaviso_d, 'preaviso_monto', _preaviso_m,
    'cesantia_dias', _cesantia_d, 'cesantia_monto', _cesantia_m,
    'vacaciones_dias', _vac_dias, 'vacaciones_monto', _vac_m,
    'regalia_monto', _reg_m,
    'total', _preaviso_m + _cesantia_m + _vac_m + _reg_m
  );
END $$;

CREATE OR REPLACE FUNCTION public.registrar_terminacion(
  _empleado_id uuid, _motivo motivo_terminacion, _fecha_salida date, _otros numeric, _notas text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant uuid; _user uuid; _calc jsonb; _id uuid; _emp RECORD;
BEGIN
  _user := auth.uid();
  SELECT tenant_id INTO _tenant FROM profiles WHERE id = _user;
  _calc := public.calcular_prestaciones(_empleado_id, _motivo, _fecha_salida);
  SELECT * INTO _emp FROM empleados WHERE id = _empleado_id;

  INSERT INTO terminaciones(tenant_id, empleado_id, fecha_salida, motivo, anos_servicio,
    salario_promedio, preaviso_dias, preaviso_monto, cesantia_dias, cesantia_monto,
    vacaciones_monto, regalia_monto, otros, total, notas, created_by)
  VALUES (_tenant, _empleado_id, _fecha_salida, _motivo,
    (_calc->>'anos_servicio')::numeric, _emp.salario_base,
    (_calc->>'preaviso_dias')::int, (_calc->>'preaviso_monto')::numeric,
    (_calc->>'cesantia_dias')::int, (_calc->>'cesantia_monto')::numeric,
    (_calc->>'vacaciones_monto')::numeric, (_calc->>'regalia_monto')::numeric,
    COALESCE(_otros,0), (_calc->>'total')::numeric + COALESCE(_otros,0),
    _notas, _user)
  RETURNING id INTO _id;

  UPDATE empleados SET estado='terminado', fecha_salida=_fecha_salida, motivo_salida=_motivo
    WHERE id = _empleado_id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.generar_regalia_pascual(_anio int)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant uuid; _user uuid; _nom_id uuid; _emp RECORD;
  _meses numeric; _monto numeric; _total numeric := 0;
BEGIN
  _user := auth.uid();
  SELECT tenant_id INTO _tenant FROM profiles WHERE id = _user;

  INSERT INTO nominas(tenant_id, nombre, tipo, forma_pago, periodo_inicio, periodo_fin,
                       fecha_pago, estado, created_by)
  VALUES (_tenant, 'Regalía Pascual ' || _anio, 'regalia_pascual', 'mensual',
          make_date(_anio,1,1), make_date(_anio,12,31), make_date(_anio,12,20), 'borrador', _user)
  RETURNING id INTO _nom_id;

  FOR _emp IN SELECT * FROM empleados WHERE tenant_id = _tenant AND estado = 'activo' LOOP
    _meses := LEAST(12, GREATEST(0,
      EXTRACT(MONTH FROM LEAST(make_date(_anio,12,31), CURRENT_DATE)) -
      CASE WHEN EXTRACT(YEAR FROM _emp.fecha_ingreso)::int = _anio
           THEN EXTRACT(MONTH FROM _emp.fecha_ingreso)::int - 1 ELSE 0 END
    ));
    _monto := ROUND(_emp.salario_base * (_meses / 12.0), 2);
    IF _monto <= 0 THEN CONTINUE; END IF;

    INSERT INTO nomina_detalle(tenant_id, nomina_id, empleado_id, salario_base,
      total_ingresos, neto_pagar, total_deducciones)
    VALUES (_tenant, _nom_id, _emp.id, _emp.salario_base, _monto, _monto, 0);
    _total := _total + _monto;
  END LOOP;

  UPDATE nominas SET total_ingresos = _total, total_neto = _total WHERE id = _nom_id;
  RETURN _nom_id;
END $$;

CREATE OR REPLACE FUNCTION public.generar_ir3(_anio int, _mes int)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'periodo', _anio::text || lpad(_mes::text,2,'0'),
    'total_isr', COALESCE(SUM(d.isr),0),
    'total_bruto', COALESCE(SUM(d.total_ingresos),0),
    'empleados', COALESCE(jsonb_agg(jsonb_build_object(
      'cedula', e.cedula,
      'nombre', e.apellidos || ', ' || e.nombres,
      'bruto', d.total_ingresos, 'sfs', d.sfs, 'afp', d.afp, 'isr', d.isr
    )), '[]'::jsonb)
  )
  FROM nomina_detalle d
  JOIN nominas n ON n.id = d.nomina_id
  JOIN empleados e ON e.id = d.empleado_id
  WHERE d.tenant_id = current_tenant_id()
    AND n.estado IN ('cerrada','pagada') AND n.tipo = 'regular'
    AND EXTRACT(YEAR FROM n.fecha_pago) = _anio
    AND EXTRACT(MONTH FROM n.fecha_pago) = _mes
$$;

CREATE OR REPLACE FUNCTION public.procesar_nomina(_nomina_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant uuid; _user uuid; _nom RECORD; _emp RECORD; _tasas RECORD;
  _det_id uuid; _factor numeric;
  _bruto numeric; _base_tss numeric; _sfs numeric; _afp numeric;
  _base_isr numeric; _isr numeric;
  _sfs_pat numeric; _afp_pat numeric; _srl numeric; _infotep numeric;
  _prestamo_total numeric;
  _total_ing numeric := 0; _total_ded numeric := 0; _total_neto numeric := 0; _total_pat numeric := 0;
  _count integer := 0;
BEGIN
  _user := auth.uid();
  SELECT tenant_id INTO _tenant FROM profiles WHERE id = _user;
  SELECT * INTO _nom FROM nominas WHERE id = _nomina_id AND tenant_id = _tenant;
  IF _nom IS NULL THEN RAISE EXCEPTION 'Nómina no encontrada'; END IF;
  IF _nom.estado <> 'borrador' THEN RAISE EXCEPTION 'Solo se puede procesar una nómina en borrador'; END IF;
  IF _nom.tipo <> 'regular' THEN RAISE EXCEPTION 'Use generar_regalia_pascual para Regalía'; END IF;

  SELECT * INTO _tasas FROM tss_tasas WHERE tenant_id = _tenant AND activo = true
    ORDER BY vigente_desde DESC LIMIT 1;
  IF _tasas IS NULL THEN RAISE EXCEPTION 'No hay tasas TSS configuradas'; END IF;

  _factor := CASE _nom.forma_pago WHEN 'mensual' THEN 1.0 WHEN 'quincenal' THEN 0.5 WHEN 'semanal' THEN 12.0/52.0 END;
  DELETE FROM nomina_detalle WHERE nomina_id = _nomina_id;

  FOR _emp IN SELECT * FROM empleados
    WHERE tenant_id = _tenant AND estado = 'activo' AND forma_pago = _nom.forma_pago LOOP
    _bruto := ROUND(_emp.salario_base * _factor, 2);
    _base_tss := LEAST(_bruto, _tasas.tope_sfs * _factor);
    _sfs := ROUND(_base_tss * (_tasas.sfs_empleado/100.0), 2);
    _sfs_pat := ROUND(_base_tss * (_tasas.sfs_empleador/100.0), 2);
    _base_tss := LEAST(_bruto, _tasas.tope_afp * _factor);
    _afp := ROUND(_base_tss * (_tasas.afp_empleado/100.0), 2);
    _afp_pat := ROUND(_base_tss * (_tasas.afp_empleador/100.0), 2);
    _srl := ROUND(_base_tss * (_tasas.srl_empleador/100.0), 2);
    _infotep := ROUND(_bruto * (_tasas.infotep_empleador/100.0), 2);
    _base_isr := (_bruto - _sfs - _afp) / _factor;
    _isr := ROUND(public.calcular_isr_mensual(_tenant, _base_isr) * _factor, 2);

    SELECT COALESCE(SUM(LEAST(cuota, saldo)),0) INTO _prestamo_total
      FROM prestamos_empleado
      WHERE tenant_id = _tenant AND empleado_id = _emp.id
        AND estado = 'activo' AND descontar_en_nomina = true;
    _prestamo_total := ROUND(_prestamo_total * _factor, 2);

    INSERT INTO nomina_detalle(tenant_id, nomina_id, empleado_id, salario_base, total_ingresos,
      sfs, afp, isr, otras_deducciones, total_deducciones, neto_pagar,
      sfs_patronal, afp_patronal, srl_patronal, infotep_patronal)
    VALUES (_tenant, _nomina_id, _emp.id, _bruto, _bruto,
      _sfs, _afp, _isr, _prestamo_total, _sfs+_afp+_isr+_prestamo_total,
      _bruto-(_sfs+_afp+_isr+_prestamo_total),
      _sfs_pat, _afp_pat, _srl, _infotep)
    RETURNING id INTO _det_id;

    _total_ing := _total_ing + _bruto;
    _total_ded := _total_ded + _sfs + _afp + _isr + _prestamo_total;
    _total_neto := _total_neto + (_bruto - _sfs - _afp - _isr - _prestamo_total);
    _total_pat := _total_pat + _sfs_pat + _afp_pat + _srl + _infotep;
    _count := _count + 1;
  END LOOP;

  UPDATE nominas SET total_ingresos=_total_ing, total_deducciones=_total_ded,
    total_neto=_total_neto, total_aportes_patronales=_total_pat WHERE id = _nomina_id;
  RETURN _count;
END $$;

CREATE OR REPLACE FUNCTION public.aplicar_pago_prestamos_nomina(_nomina_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant uuid; _det RECORD; _factor numeric; _nom RECORD;
  _prest RECORD; _restante numeric; _aplicar numeric;
BEGIN
  SELECT tenant_id INTO _tenant FROM profiles WHERE id = auth.uid();
  SELECT * INTO _nom FROM nominas WHERE id = _nomina_id;
  _factor := CASE _nom.forma_pago WHEN 'mensual' THEN 1.0 WHEN 'quincenal' THEN 0.5 ELSE 12.0/52.0 END;
  FOR _det IN SELECT * FROM nomina_detalle WHERE nomina_id = _nomina_id AND otras_deducciones > 0 LOOP
    _restante := _det.otras_deducciones;
    FOR _prest IN SELECT * FROM prestamos_empleado
      WHERE tenant_id = _tenant AND empleado_id = _det.empleado_id
        AND estado = 'activo' AND descontar_en_nomina = true
      ORDER BY created_at LOOP
      EXIT WHEN _restante <= 0;
      _aplicar := LEAST(_restante, _prest.saldo, ROUND(_prest.cuota * _factor, 2));
      UPDATE prestamos_empleado SET saldo = saldo - _aplicar,
        estado = CASE WHEN saldo - _aplicar <= 0.01 THEN 'pagado'::estado_prestamo ELSE estado END
        WHERE id = _prest.id;
      _restante := _restante - _aplicar;
    END LOOP;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.cerrar_nomina(_nomina_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant uuid; _user uuid; _nom RECORD; _asiento_id uuid;
  _c_sueldo uuid; _c_tss_gasto uuid; _c_infotep_gasto uuid;
  _c_sueldo_pag uuid; _c_tss_pag uuid; _c_isr_pag uuid;
  _tot_bruto numeric; _tot_tss_pat numeric; _tot_infotep numeric;
  _tot_sfs_e numeric; _tot_afp_e numeric; _tot_isr numeric; _tot_neto numeric;
  _tot_tss_total numeric;
BEGIN
  _user := auth.uid();
  SELECT tenant_id INTO _tenant FROM profiles WHERE id = _user;
  SELECT * INTO _nom FROM nominas WHERE id = _nomina_id AND tenant_id = _tenant;
  IF _nom IS NULL THEN RAISE EXCEPTION 'Nómina no encontrada'; END IF;
  IF _nom.estado <> 'borrador' THEN RAISE EXCEPTION 'Solo se puede cerrar una nómina en borrador'; END IF;

  SELECT COALESCE(SUM(total_ingresos),0), COALESCE(SUM(sfs_patronal + afp_patronal + srl_patronal),0),
    COALESCE(SUM(infotep_patronal),0), COALESCE(SUM(sfs),0), COALESCE(SUM(afp),0),
    COALESCE(SUM(isr),0), COALESCE(SUM(neto_pagar),0)
  INTO _tot_bruto, _tot_tss_pat, _tot_infotep, _tot_sfs_e, _tot_afp_e, _tot_isr, _tot_neto
  FROM nomina_detalle WHERE nomina_id = _nomina_id;

  IF _tot_bruto = 0 THEN RAISE EXCEPTION 'La nómina no tiene empleados procesados'; END IF;
  _tot_tss_total := _tot_tss_pat + _tot_sfs_e + _tot_afp_e;

  SELECT id INTO _c_sueldo FROM cuentas_contables WHERE tenant_id=_tenant AND codigo='6.1.02.01';
  SELECT id INTO _c_tss_gasto FROM cuentas_contables WHERE tenant_id=_tenant AND codigo='6.1.02.02';
  SELECT id INTO _c_infotep_gasto FROM cuentas_contables WHERE tenant_id=_tenant AND codigo='6.1.02.03';
  SELECT id INTO _c_sueldo_pag FROM cuentas_contables WHERE tenant_id=_tenant AND codigo='2.1.03.01';
  SELECT id INTO _c_tss_pag FROM cuentas_contables WHERE tenant_id=_tenant AND codigo='2.1.03.02';
  SELECT id INTO _c_isr_pag FROM cuentas_contables WHERE tenant_id=_tenant AND codigo='2.1.03.03';

  INSERT INTO asientos_contables(tenant_id, fecha, concepto, origen, origen_id, total_debito, total_credito)
  VALUES (_tenant, _nom.fecha_pago, 'Nomina ' || _nom.nombre, 'nomina', _nomina_id,
          _tot_bruto + _tot_tss_pat + _tot_infotep, _tot_neto + _tot_tss_total + _tot_isr + _tot_infotep)
  RETURNING id INTO _asiento_id;

  INSERT INTO asiento_lineas(tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
  VALUES (_tenant, _asiento_id, _c_sueldo, _tot_bruto, 0, 'Sueldos brutos');
  IF _tot_tss_pat > 0 THEN INSERT INTO asiento_lineas(tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
    VALUES (_tenant, _asiento_id, _c_tss_gasto, _tot_tss_pat, 0, 'TSS aporte patronal'); END IF;
  IF _tot_infotep > 0 THEN INSERT INTO asiento_lineas(tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
    VALUES (_tenant, _asiento_id, _c_infotep_gasto, _tot_infotep, 0, 'INFOTEP'); END IF;
  INSERT INTO asiento_lineas(tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
  VALUES (_tenant, _asiento_id, _c_sueldo_pag, 0, _tot_neto, 'Sueldos por pagar');
  IF _tot_tss_total + _tot_infotep > 0 THEN INSERT INTO asiento_lineas(tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
    VALUES (_tenant, _asiento_id, _c_tss_pag, 0, _tot_tss_total + _tot_infotep, 'TSS e INFOTEP por pagar'); END IF;
  IF _tot_isr > 0 THEN INSERT INTO asiento_lineas(tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
    VALUES (_tenant, _asiento_id, _c_isr_pag, 0, _tot_isr, 'ISR asalariados retenido'); END IF;

  UPDATE nominas SET estado='cerrada', asiento_id=_asiento_id WHERE id=_nomina_id;
  PERFORM public.aplicar_pago_prestamos_nomina(_nomina_id);

  INSERT INTO logs_auditoria(tenant_id, user_id, accion, tabla_afectada, registro_id, detalles)
  VALUES (_tenant, _user, 'Cierre de Nomina', 'nominas', _nomina_id,
          jsonb_build_object('nombre', _nom.nombre, 'neto', _tot_neto));
  RETURN _asiento_id;
END $$;