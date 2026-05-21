
-- ============ ENUMS ============
CREATE TYPE public.tipo_contrato AS ENUM ('indefinido','fijo','obra');
CREATE TYPE public.forma_pago_empleado AS ENUM ('mensual','quincenal','semanal');
CREATE TYPE public.estado_empleado AS ENUM ('activo','suspendido','terminado');
CREATE TYPE public.motivo_terminacion AS ENUM ('desahucio','despido_justificado','dimision','mutuo_acuerdo','otro');
CREATE TYPE public.estado_nomina AS ENUM ('borrador','cerrada','pagada');
CREATE TYPE public.tipo_concepto_nomina AS ENUM ('ingreso','deduccion');

-- ============ TABLAS ============
CREATE TABLE public.departamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  nombre text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.cargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  nombre text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.empleados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  codigo text,
  nombres text NOT NULL,
  apellidos text NOT NULL,
  cedula text NOT NULL,
  fecha_nacimiento date,
  sexo text,
  estado_civil text,
  direccion text,
  telefono text,
  email text,
  banco text,
  cuenta_bancaria text,
  tipo_cuenta text,
  departamento_id uuid REFERENCES public.departamentos(id) ON DELETE SET NULL,
  cargo_id uuid REFERENCES public.cargos(id) ON DELETE SET NULL,
  tipo_contrato public.tipo_contrato NOT NULL DEFAULT 'indefinido',
  forma_pago public.forma_pago_empleado NOT NULL DEFAULT 'mensual',
  salario_base numeric(14,2) NOT NULL DEFAULT 0,
  fecha_ingreso date NOT NULL DEFAULT CURRENT_DATE,
  fecha_salida date,
  motivo_salida public.motivo_terminacion,
  dependientes int NOT NULL DEFAULT 0,
  estado public.estado_empleado NOT NULL DEFAULT 'activo',
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_empleados_tenant ON public.empleados(tenant_id);
CREATE UNIQUE INDEX uq_empleados_tenant_cedula ON public.empleados(tenant_id, cedula);

CREATE TABLE public.tss_tasas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  vigente_desde date NOT NULL DEFAULT CURRENT_DATE,
  sfs_empleado numeric(6,4) NOT NULL DEFAULT 3.0400,
  sfs_empleador numeric(6,4) NOT NULL DEFAULT 7.0900,
  afp_empleado numeric(6,4) NOT NULL DEFAULT 2.8700,
  afp_empleador numeric(6,4) NOT NULL DEFAULT 7.1000,
  srl_empleador numeric(6,4) NOT NULL DEFAULT 1.1000,
  infotep_empleador numeric(6,4) NOT NULL DEFAULT 1.0000,
  salario_minimo_cotizable numeric(14,2) NOT NULL DEFAULT 15000.00,
  tope_sfs numeric(14,2) NOT NULL DEFAULT 234680.00,
  tope_afp numeric(14,2) NOT NULL DEFAULT 422424.00,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tss_tasas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.isr_escalas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  anio int NOT NULL,
  tramo int NOT NULL,
  desde numeric(14,2) NOT NULL,
  hasta numeric(14,2),
  tasa numeric(6,4) NOT NULL,
  cuota_fija numeric(14,2) NOT NULL DEFAULT 0,
  UNIQUE(tenant_id, anio, tramo)
);
ALTER TABLE public.isr_escalas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.nominas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  nombre text NOT NULL,
  forma_pago public.forma_pago_empleado NOT NULL DEFAULT 'mensual',
  periodo_inicio date NOT NULL,
  periodo_fin date NOT NULL,
  fecha_pago date NOT NULL DEFAULT CURRENT_DATE,
  estado public.estado_nomina NOT NULL DEFAULT 'borrador',
  total_ingresos numeric(14,2) NOT NULL DEFAULT 0,
  total_deducciones numeric(14,2) NOT NULL DEFAULT 0,
  total_neto numeric(14,2) NOT NULL DEFAULT 0,
  total_aportes_patronales numeric(14,2) NOT NULL DEFAULT 0,
  asiento_id uuid,
  asiento_pago_id uuid,
  notas text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nominas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.nomina_detalle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  nomina_id uuid NOT NULL REFERENCES public.nominas(id) ON DELETE CASCADE,
  empleado_id uuid NOT NULL REFERENCES public.empleados(id),
  salario_base numeric(14,2) NOT NULL DEFAULT 0,
  total_ingresos numeric(14,2) NOT NULL DEFAULT 0,
  sfs numeric(14,2) NOT NULL DEFAULT 0,
  afp numeric(14,2) NOT NULL DEFAULT 0,
  isr numeric(14,2) NOT NULL DEFAULT 0,
  otras_deducciones numeric(14,2) NOT NULL DEFAULT 0,
  total_deducciones numeric(14,2) NOT NULL DEFAULT 0,
  neto_pagar numeric(14,2) NOT NULL DEFAULT 0,
  sfs_patronal numeric(14,2) NOT NULL DEFAULT 0,
  afp_patronal numeric(14,2) NOT NULL DEFAULT 0,
  srl_patronal numeric(14,2) NOT NULL DEFAULT 0,
  infotep_patronal numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(nomina_id, empleado_id)
);
ALTER TABLE public.nomina_detalle ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.nomina_conceptos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  detalle_id uuid NOT NULL REFERENCES public.nomina_detalle(id) ON DELETE CASCADE,
  tipo public.tipo_concepto_nomina NOT NULL,
  concepto text NOT NULL,
  monto numeric(14,2) NOT NULL DEFAULT 0,
  afecta_tss boolean NOT NULL DEFAULT true,
  afecta_isr boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nomina_conceptos ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============
-- departamentos / cargos: lectura por tenant, gestión por admin o contador
CREATE POLICY dep_select ON public.departamentos FOR SELECT TO authenticated USING (tenant_id = current_tenant_id());
CREATE POLICY dep_manage ON public.departamentos FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)))
  WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)));

CREATE POLICY car_select ON public.cargos FOR SELECT TO authenticated USING (tenant_id = current_tenant_id());
CREATE POLICY car_manage ON public.cargos FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)))
  WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)));

-- empleados
CREATE POLICY emp_select ON public.empleados FOR SELECT TO authenticated USING (tenant_id = current_tenant_id());
CREATE POLICY emp_manage ON public.empleados FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)))
  WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)));

-- tss_tasas: solo admin gestiona
CREATE POLICY tss_select ON public.tss_tasas FOR SELECT TO authenticated USING (tenant_id = current_tenant_id());
CREATE POLICY tss_manage ON public.tss_tasas FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND has_role(auth.uid(),'administrador'::app_role))
  WITH CHECK (tenant_id = current_tenant_id() AND has_role(auth.uid(),'administrador'::app_role));

-- isr_escalas: solo admin gestiona
CREATE POLICY isr_select ON public.isr_escalas FOR SELECT TO authenticated USING (tenant_id = current_tenant_id());
CREATE POLICY isr_manage ON public.isr_escalas FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND has_role(auth.uid(),'administrador'::app_role))
  WITH CHECK (tenant_id = current_tenant_id() AND has_role(auth.uid(),'administrador'::app_role));

-- nominas
CREATE POLICY nom_select ON public.nominas FOR SELECT TO authenticated USING (tenant_id = current_tenant_id());
CREATE POLICY nom_manage ON public.nominas FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)))
  WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)));

CREATE POLICY nomd_select ON public.nomina_detalle FOR SELECT TO authenticated USING (tenant_id = current_tenant_id());
CREATE POLICY nomd_manage ON public.nomina_detalle FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)))
  WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)));

CREATE POLICY nomc_select ON public.nomina_conceptos FOR SELECT TO authenticated USING (tenant_id = current_tenant_id());
CREATE POLICY nomc_manage ON public.nomina_conceptos FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)))
  WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)));

-- ============ SEED PARA TENANT ============
CREATE OR REPLACE FUNCTION public.seed_nomina_defaults(_tenant_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Tasas TSS por defecto
  INSERT INTO public.tss_tasas(tenant_id) VALUES (_tenant_id)
  ON CONFLICT DO NOTHING;

  -- Escala ISR vigente (anual)
  INSERT INTO public.isr_escalas(tenant_id, anio, tramo, desde, hasta, tasa, cuota_fija) VALUES
    (_tenant_id, EXTRACT(YEAR FROM CURRENT_DATE)::int, 1, 0,         416220.00, 0.0000,  0),
    (_tenant_id, EXTRACT(YEAR FROM CURRENT_DATE)::int, 2, 416220.01, 624329.00, 0.1500,  0),
    (_tenant_id, EXTRACT(YEAR FROM CURRENT_DATE)::int, 3, 624329.01, 867123.00, 0.2000,  31216.00),
    (_tenant_id, EXTRACT(YEAR FROM CURRENT_DATE)::int, 4, 867123.01, NULL,      0.2500,  79776.00)
  ON CONFLICT DO NOTHING;

  -- Cuentas contables del módulo
  INSERT INTO public.cuentas_contables(tenant_id, codigo, nombre, tipo, nivel, es_movimiento) VALUES
    (_tenant_id, '6.1.02',    'Gastos de Personal',          'gasto',  3, false),
    (_tenant_id, '6.1.02.01', 'Sueldos y Salarios',           'gasto',  4, true),
    (_tenant_id, '6.1.02.02', 'TSS Aporte Patronal',          'gasto',  4, true),
    (_tenant_id, '6.1.02.03', 'INFOTEP',                      'gasto',  4, true),
    (_tenant_id, '2.1.03',    'Nomina por Pagar',             'pasivo', 3, false),
    (_tenant_id, '2.1.03.01', 'Sueldos por Pagar',            'pasivo', 4, true),
    (_tenant_id, '2.1.03.02', 'TSS por Pagar',                'pasivo', 4, true),
    (_tenant_id, '2.1.03.03', 'ISR Asalariados por Pagar',    'pasivo', 4, true)
  ON CONFLICT DO NOTHING;
END $$;

-- Sembrar nómina para tenants existentes
DO $$ DECLARE _t uuid; BEGIN
  FOR _t IN SELECT id FROM public.tenants LOOP
    PERFORM public.seed_nomina_defaults(_t);
  END LOOP;
END $$;

-- Encadenar al handle_new_user existente (vía override de seed_tenant_defaults)
CREATE OR REPLACE FUNCTION public.seed_tenant_defaults(_tenant_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- NCF secuencias
  INSERT INTO public.ncf_secuencias (tenant_id, tipo, prefijo, secuencia_actual, secuencia_hasta) VALUES
    (_tenant_id, 'B01', 'B01', 0, 99999999),
    (_tenant_id, 'B02', 'B02', 0, 99999999),
    (_tenant_id, 'B04', 'B04', 0, 99999999),
    (_tenant_id, 'B15', 'B15', 0, 99999999);

  INSERT INTO public.cuentas_contables (tenant_id, codigo, nombre, tipo, nivel, es_movimiento) VALUES
    (_tenant_id, '1', 'ACTIVOS', 'activo', 1, false),
    (_tenant_id, '1.1', 'Activos Corrientes', 'activo', 2, false),
    (_tenant_id, '1.1.01', 'Caja y Bancos', 'activo', 3, false),
    (_tenant_id, '1.1.01.01', 'Caja General', 'activo', 4, true),
    (_tenant_id, '1.1.01.02', 'Banco Principal', 'activo', 4, true),
    (_tenant_id, '1.1.02', 'Cuentas por Cobrar', 'activo', 3, false),
    (_tenant_id, '1.1.02.01', 'Clientes', 'activo', 4, true),
    (_tenant_id, '1.1.03', 'Impuestos Adelantados', 'activo', 3, false),
    (_tenant_id, '1.1.03.01', 'ITBIS Adelantado', 'activo', 4, true),
    (_tenant_id, '2', 'PASIVOS', 'pasivo', 1, false),
    (_tenant_id, '2.1', 'Pasivos Corrientes', 'pasivo', 2, false),
    (_tenant_id, '2.1.01', 'Cuentas por Pagar', 'pasivo', 3, false),
    (_tenant_id, '2.1.01.01', 'Proveedores', 'pasivo', 4, true),
    (_tenant_id, '2.1.02', 'Impuestos por Pagar', 'pasivo', 3, false),
    (_tenant_id, '2.1.02.01', 'ITBIS por Pagar', 'pasivo', 4, true),
    (_tenant_id, '2.1.02.02', 'ISR Retenido por Pagar', 'pasivo', 4, true),
    (_tenant_id, '3', 'CAPITAL', 'capital', 1, false),
    (_tenant_id, '3.1', 'Capital Social', 'capital', 2, true),
    (_tenant_id, '4', 'INGRESOS', 'ingreso', 1, false),
    (_tenant_id, '4.1', 'Ingresos Operacionales', 'ingreso', 2, false),
    (_tenant_id, '4.1.01', 'Ingresos por Ventas', 'ingreso', 3, true),
    (_tenant_id, '4.1.02', 'Ingresos por Servicios', 'ingreso', 3, true),
    (_tenant_id, '5', 'COSTOS', 'costo', 1, false),
    (_tenant_id, '5.1', 'Costo de Ventas', 'costo', 2, true),
    (_tenant_id, '6', 'GASTOS', 'gasto', 1, false),
    (_tenant_id, '6.1', 'Gastos Operacionales', 'gasto', 2, false),
    (_tenant_id, '6.1.01', 'Gastos Generales', 'gasto', 3, true);

  PERFORM public.seed_nomina_defaults(_tenant_id);
END $$;

-- ============ MOTOR DE CÁLCULO ============

-- ISR mensual a partir de salario gravable mensual
CREATE OR REPLACE FUNCTION public.calcular_isr_mensual(_tenant uuid, _gravable_mensual numeric)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _gravable_anual numeric;
  _tramo RECORD;
  _isr_anual numeric := 0;
  _anio int := EXTRACT(YEAR FROM CURRENT_DATE)::int;
BEGIN
  _gravable_anual := _gravable_mensual * 12;
  SELECT * INTO _tramo FROM public.isr_escalas
    WHERE tenant_id = _tenant AND anio = _anio
      AND _gravable_anual >= desde AND (hasta IS NULL OR _gravable_anual <= hasta)
    ORDER BY tramo DESC LIMIT 1;
  IF _tramo IS NULL THEN RETURN 0; END IF;
  _isr_anual := _tramo.cuota_fija + ((_gravable_anual - _tramo.desde) * _tramo.tasa);
  RETURN ROUND(_isr_anual / 12.0, 2);
END $$;

-- Procesar nómina: calcular todos los empleados activos
CREATE OR REPLACE FUNCTION public.procesar_nomina(_nomina_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant uuid; _user uuid; _nom RECORD; _emp RECORD; _tasas RECORD;
  _det_id uuid; _factor numeric;
  _bruto numeric; _base_tss numeric; _sfs numeric; _afp numeric;
  _base_isr numeric; _isr numeric;
  _sfs_pat numeric; _afp_pat numeric; _srl numeric; _infotep numeric;
  _total_ing numeric := 0; _total_ded numeric := 0; _total_neto numeric := 0; _total_pat numeric := 0;
  _count integer := 0;
BEGIN
  _user := auth.uid();
  SELECT tenant_id INTO _tenant FROM public.profiles WHERE id = _user;
  SELECT * INTO _nom FROM public.nominas WHERE id = _nomina_id AND tenant_id = _tenant;
  IF _nom IS NULL THEN RAISE EXCEPTION 'Nómina no encontrada'; END IF;
  IF _nom.estado <> 'borrador' THEN RAISE EXCEPTION 'Solo se puede procesar una nómina en borrador'; END IF;

  SELECT * INTO _tasas FROM public.tss_tasas WHERE tenant_id = _tenant AND activo = true
    ORDER BY vigente_desde DESC LIMIT 1;
  IF _tasas IS NULL THEN RAISE EXCEPTION 'No hay tasas TSS configuradas'; END IF;

  -- Factor de período según forma de pago de la nómina
  _factor := CASE _nom.forma_pago WHEN 'mensual' THEN 1.0 WHEN 'quincenal' THEN 0.5 WHEN 'semanal' THEN 12.0/52.0 END;

  -- Limpiar detalles previos
  DELETE FROM public.nomina_detalle WHERE nomina_id = _nomina_id;

  FOR _emp IN
    SELECT * FROM public.empleados
    WHERE tenant_id = _tenant AND estado = 'activo' AND forma_pago = _nom.forma_pago
  LOOP
    _bruto := ROUND(_emp.salario_base * _factor, 2);

    -- Bases con topes (tope mensual ya configurado)
    _base_tss := LEAST(_bruto, _tasas.tope_sfs * _factor);
    _sfs := ROUND(_base_tss * (_tasas.sfs_empleado/100.0), 2);
    _sfs_pat := ROUND(_base_tss * (_tasas.sfs_empleador/100.0), 2);

    _base_tss := LEAST(_bruto, _tasas.tope_afp * _factor);
    _afp := ROUND(_base_tss * (_tasas.afp_empleado/100.0), 2);
    _afp_pat := ROUND(_base_tss * (_tasas.afp_empleador/100.0), 2);
    _srl := ROUND(_base_tss * (_tasas.srl_empleador/100.0), 2);

    _infotep := ROUND(_bruto * (_tasas.infotep_empleador/100.0), 2);

    -- ISR: base = bruto mensualizado - (SFS+AFP empleado) mensualizado
    _base_isr := (_bruto - _sfs - _afp) / _factor;  -- a base mensual
    _isr := ROUND(public.calcular_isr_mensual(_tenant, _base_isr) * _factor, 2);

    INSERT INTO public.nomina_detalle(
      tenant_id, nomina_id, empleado_id, salario_base, total_ingresos,
      sfs, afp, isr, otras_deducciones, total_deducciones, neto_pagar,
      sfs_patronal, afp_patronal, srl_patronal, infotep_patronal
    ) VALUES (
      _tenant, _nomina_id, _emp.id, _bruto, _bruto,
      _sfs, _afp, _isr, 0, _sfs+_afp+_isr, _bruto-(_sfs+_afp+_isr),
      _sfs_pat, _afp_pat, _srl, _infotep
    ) RETURNING id INTO _det_id;

    _total_ing := _total_ing + _bruto;
    _total_ded := _total_ded + _sfs + _afp + _isr;
    _total_neto := _total_neto + (_bruto - _sfs - _afp - _isr);
    _total_pat := _total_pat + _sfs_pat + _afp_pat + _srl + _infotep;
    _count := _count + 1;
  END LOOP;

  UPDATE public.nominas SET
    total_ingresos = _total_ing,
    total_deducciones = _total_ded,
    total_neto = _total_neto,
    total_aportes_patronales = _total_pat
  WHERE id = _nomina_id;

  RETURN _count;
END $$;

-- Cerrar nómina y generar asiento
CREATE OR REPLACE FUNCTION public.cerrar_nomina(_nomina_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant uuid; _user uuid; _nom RECORD;
  _asiento_id uuid;
  _c_sueldo uuid; _c_tss_gasto uuid; _c_infotep_gasto uuid;
  _c_sueldo_pag uuid; _c_tss_pag uuid; _c_isr_pag uuid;
  _tot_bruto numeric; _tot_tss_pat numeric; _tot_infotep numeric;
  _tot_sfs_e numeric; _tot_afp_e numeric; _tot_isr numeric; _tot_neto numeric;
  _tot_tss_total numeric;
BEGIN
  _user := auth.uid();
  SELECT tenant_id INTO _tenant FROM public.profiles WHERE id = _user;
  SELECT * INTO _nom FROM public.nominas WHERE id = _nomina_id AND tenant_id = _tenant;
  IF _nom IS NULL THEN RAISE EXCEPTION 'Nómina no encontrada'; END IF;
  IF _nom.estado <> 'borrador' THEN RAISE EXCEPTION 'Solo se puede cerrar una nómina en borrador'; END IF;

  SELECT
    COALESCE(SUM(total_ingresos),0),
    COALESCE(SUM(sfs_patronal + afp_patronal + srl_patronal),0),
    COALESCE(SUM(infotep_patronal),0),
    COALESCE(SUM(sfs),0),
    COALESCE(SUM(afp),0),
    COALESCE(SUM(isr),0),
    COALESCE(SUM(neto_pagar),0)
  INTO _tot_bruto, _tot_tss_pat, _tot_infotep, _tot_sfs_e, _tot_afp_e, _tot_isr, _tot_neto
  FROM public.nomina_detalle WHERE nomina_id = _nomina_id;

  IF _tot_bruto = 0 THEN RAISE EXCEPTION 'La nómina no tiene empleados procesados'; END IF;

  _tot_tss_total := _tot_tss_pat + _tot_sfs_e + _tot_afp_e;

  SELECT id INTO _c_sueldo FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='6.1.02.01';
  SELECT id INTO _c_tss_gasto FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='6.1.02.02';
  SELECT id INTO _c_infotep_gasto FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='6.1.02.03';
  SELECT id INTO _c_sueldo_pag FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='2.1.03.01';
  SELECT id INTO _c_tss_pag FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='2.1.03.02';
  SELECT id INTO _c_isr_pag FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='2.1.03.03';

  INSERT INTO public.asientos_contables(tenant_id, fecha, concepto, origen, origen_id, total_debito, total_credito)
  VALUES (_tenant, _nom.fecha_pago, 'Nomina ' || _nom.nombre, 'nomina', _nomina_id,
          _tot_bruto + _tot_tss_pat + _tot_infotep, _tot_neto + _tot_tss_total + _tot_isr + _tot_infotep)
  RETURNING id INTO _asiento_id;

  -- Débitos (gastos)
  INSERT INTO public.asiento_lineas(tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
  VALUES (_tenant, _asiento_id, _c_sueldo, _tot_bruto, 0, 'Sueldos brutos');
  IF _tot_tss_pat > 0 THEN
    INSERT INTO public.asiento_lineas(tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
    VALUES (_tenant, _asiento_id, _c_tss_gasto, _tot_tss_pat, 0, 'TSS aporte patronal');
  END IF;
  IF _tot_infotep > 0 THEN
    INSERT INTO public.asiento_lineas(tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
    VALUES (_tenant, _asiento_id, _c_infotep_gasto, _tot_infotep, 0, 'INFOTEP');
  END IF;

  -- Créditos (pasivos)
  INSERT INTO public.asiento_lineas(tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
  VALUES (_tenant, _asiento_id, _c_sueldo_pag, 0, _tot_neto, 'Sueldos por pagar');
  IF _tot_tss_total + _tot_infotep > 0 THEN
    INSERT INTO public.asiento_lineas(tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
    VALUES (_tenant, _asiento_id, _c_tss_pag, 0, _tot_tss_total + _tot_infotep, 'TSS e INFOTEP por pagar');
  END IF;
  IF _tot_isr > 0 THEN
    INSERT INTO public.asiento_lineas(tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
    VALUES (_tenant, _asiento_id, _c_isr_pag, 0, _tot_isr, 'ISR asalariados retenido');
  END IF;

  UPDATE public.nominas SET estado='cerrada', asiento_id=_asiento_id WHERE id=_nomina_id;

  INSERT INTO public.logs_auditoria(tenant_id, user_id, accion, tabla_afectada, registro_id, detalles)
  VALUES (_tenant, _user, 'Cierre de Nomina', 'nominas', _nomina_id,
          jsonb_build_object('nombre', _nom.nombre, 'neto', _tot_neto));

  RETURN _asiento_id;
END $$;

-- Registrar pago de una nómina cerrada
CREATE OR REPLACE FUNCTION public.registrar_pago_nomina(_nomina_id uuid, _cuenta_codigo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant uuid; _user uuid; _nom RECORD; _asiento_id uuid;
  _c_banco uuid; _c_sueldo_pag uuid;
BEGIN
  _user := auth.uid();
  SELECT tenant_id INTO _tenant FROM public.profiles WHERE id = _user;
  SELECT * INTO _nom FROM public.nominas WHERE id = _nomina_id AND tenant_id = _tenant;
  IF _nom IS NULL THEN RAISE EXCEPTION 'Nómina no encontrada'; END IF;
  IF _nom.estado <> 'cerrada' THEN RAISE EXCEPTION 'Solo se puede pagar una nómina cerrada'; END IF;

  SELECT id INTO _c_banco FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo=_cuenta_codigo;
  SELECT id INTO _c_sueldo_pag FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='2.1.03.01';
  IF _c_banco IS NULL THEN RAISE EXCEPTION 'Cuenta de pago no encontrada'; END IF;

  INSERT INTO public.asientos_contables(tenant_id, fecha, concepto, origen, origen_id, total_debito, total_credito)
  VALUES (_tenant, CURRENT_DATE, 'Pago Nomina ' || _nom.nombre, 'pago_nomina', _nomina_id, _nom.total_neto, _nom.total_neto)
  RETURNING id INTO _asiento_id;

  INSERT INTO public.asiento_lineas(tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
  VALUES (_tenant, _asiento_id, _c_sueldo_pag, _nom.total_neto, 0, 'Cancelacion sueldos por pagar');
  INSERT INTO public.asiento_lineas(tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
  VALUES (_tenant, _asiento_id, _c_banco, 0, _nom.total_neto, 'Salida banco/caja');

  UPDATE public.nominas SET estado='pagada', asiento_pago_id=_asiento_id WHERE id=_nomina_id;
  RETURN _asiento_id;
END $$;
