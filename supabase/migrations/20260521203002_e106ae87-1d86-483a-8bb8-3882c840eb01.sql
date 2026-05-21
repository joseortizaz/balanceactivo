-- Enums
CREATE TYPE tipo_ncf_compra AS ENUM ('B01','B11','B14','B15');
CREATE TYPE categoria_gasto_606 AS ENUM (
  '01_personal','02_trabajos_suministros','03_arrendamientos','04_activos_fijos',
  '05_operacionales','06_financieros','07_seguros','08_combustibles','09_otros'
);
CREATE TYPE estado_gasto AS ENUM ('pendiente','pagado','anulado');

-- Tabla gastos
CREATE TABLE public.gastos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  proveedor_id uuid NOT NULL,
  ncf text,
  tipo_ncf_compra tipo_ncf_compra NOT NULL DEFAULT 'B01',
  categoria categoria_gasto_606 NOT NULL DEFAULT '05_operacionales',
  concepto text NOT NULL,
  cuenta_gasto_id uuid NOT NULL,
  condicion_pago condicion_pago NOT NULL DEFAULT 'contado',
  fecha_vencimiento date,
  subtotal numeric NOT NULL DEFAULT 0,
  itbis numeric NOT NULL DEFAULT 0,
  itbis_retenido numeric NOT NULL DEFAULT 0,
  isr_retenido numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  monto_pagado numeric NOT NULL DEFAULT 0,
  estado estado_gasto NOT NULL DEFAULT 'pendiente',
  cuenta_pago_id uuid,
  asiento_id uuid,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
CREATE POLICY gastos_select ON public.gastos FOR SELECT TO authenticated USING (tenant_id = current_tenant_id());
CREATE POLICY gastos_manage ON public.gastos FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)))
  WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)));
CREATE INDEX idx_gastos_tenant_fecha ON public.gastos(tenant_id, fecha DESC);

-- Pagos a gastos
CREATE TABLE public.pagos_gasto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  gasto_id uuid NOT NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  monto numeric NOT NULL,
  cuenta_pago_id uuid NOT NULL,
  metodo text,
  asiento_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.pagos_gasto ENABLE ROW LEVEL SECURITY;
CREATE POLICY pgasto_select ON public.pagos_gasto FOR SELECT TO authenticated USING (tenant_id = current_tenant_id());
CREATE POLICY pgasto_manage ON public.pagos_gasto FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)))
  WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'administrador'::app_role) OR has_role(auth.uid(),'contador'::app_role)));

-- Helper: obtener cuenta por código
CREATE OR REPLACE FUNCTION public.get_cuenta_id(_tenant uuid, _codigo text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM cuentas_contables WHERE tenant_id = _tenant AND codigo = _codigo LIMIT 1;
$$;

-- Registrar gasto: crea asiento contable automático
CREATE OR REPLACE FUNCTION public.registrar_gasto(_gasto_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g RECORD;
  v_asiento_id uuid;
  v_cuenta_itbis_adel uuid;
  v_cuenta_itbis_ret uuid;
  v_cuenta_isr_ret uuid;
  v_cuenta_prov uuid;
  v_neto numeric;
BEGIN
  SELECT * INTO g FROM gastos WHERE id = _gasto_id;
  IF g IS NULL THEN RAISE EXCEPTION 'Gasto no encontrado'; END IF;
  IF g.asiento_id IS NOT NULL THEN RAISE EXCEPTION 'Gasto ya tiene asiento'; END IF;

  v_cuenta_itbis_adel := get_cuenta_id(g.tenant_id, '1.1.03.01');
  v_cuenta_itbis_ret  := get_cuenta_id(g.tenant_id, '2.1.02.01');
  v_cuenta_isr_ret    := get_cuenta_id(g.tenant_id, '2.1.02.02');
  v_cuenta_prov       := get_cuenta_id(g.tenant_id, '2.1.01.01');

  v_neto := g.total - g.itbis_retenido - g.isr_retenido;

  INSERT INTO asientos_contables (tenant_id, fecha, concepto, origen, origen_id, total_debito, total_credito)
  VALUES (g.tenant_id, g.fecha, 'Gasto: ' || g.concepto, 'gasto', g.id,
          g.subtotal + g.itbis, g.subtotal + g.itbis)
  RETURNING id INTO v_asiento_id;

  -- Débitos
  INSERT INTO asiento_lineas (asiento_id, tenant_id, cuenta_id, debito, credito, descripcion)
  VALUES (v_asiento_id, g.tenant_id, g.cuenta_gasto_id, g.subtotal, 0, g.concepto);

  IF g.itbis > 0 AND v_cuenta_itbis_adel IS NOT NULL THEN
    INSERT INTO asiento_lineas (asiento_id, tenant_id, cuenta_id, debito, credito, descripcion)
    VALUES (v_asiento_id, g.tenant_id, v_cuenta_itbis_adel, g.itbis, 0, 'ITBIS Adelantado');
  END IF;

  -- Créditos: retenciones
  IF g.itbis_retenido > 0 AND v_cuenta_itbis_ret IS NOT NULL THEN
    INSERT INTO asiento_lineas (asiento_id, tenant_id, cuenta_id, debito, credito, descripcion)
    VALUES (v_asiento_id, g.tenant_id, v_cuenta_itbis_ret, 0, g.itbis_retenido, 'ITBIS Retenido');
  END IF;
  IF g.isr_retenido > 0 AND v_cuenta_isr_ret IS NOT NULL THEN
    INSERT INTO asiento_lineas (asiento_id, tenant_id, cuenta_id, debito, credito, descripcion)
    VALUES (v_asiento_id, g.tenant_id, v_cuenta_isr_ret, 0, g.isr_retenido, 'ISR Retenido');
  END IF;

  -- Crédito final: contado contra cuenta de pago, crédito contra proveedores
  IF g.condicion_pago = 'contado' AND g.cuenta_pago_id IS NOT NULL THEN
    INSERT INTO asiento_lineas (asiento_id, tenant_id, cuenta_id, debito, credito, descripcion)
    VALUES (v_asiento_id, g.tenant_id, g.cuenta_pago_id, 0, v_neto, 'Pago de contado');
    UPDATE gastos SET asiento_id = v_asiento_id, estado = 'pagado', monto_pagado = g.total WHERE id = g.id;
  ELSE
    INSERT INTO asiento_lineas (asiento_id, tenant_id, cuenta_id, debito, credito, descripcion)
    VALUES (v_asiento_id, g.tenant_id, v_cuenta_prov, 0, v_neto, 'Cuenta por pagar');
    UPDATE gastos SET asiento_id = v_asiento_id WHERE id = g.id;
  END IF;

  RETURN v_asiento_id;
END; $$;

-- Registrar pago de gasto
CREATE OR REPLACE FUNCTION public.registrar_pago_gasto(_gasto_id uuid, _monto numeric, _cuenta_pago_id uuid, _fecha date, _metodo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g RECORD;
  v_asiento_id uuid;
  v_pago_id uuid;
  v_cuenta_prov uuid;
  v_nuevo_pagado numeric;
BEGIN
  SELECT * INTO g FROM gastos WHERE id = _gasto_id;
  IF g IS NULL THEN RAISE EXCEPTION 'Gasto no encontrado'; END IF;
  IF g.estado = 'anulado' THEN RAISE EXCEPTION 'Gasto anulado'; END IF;

  v_nuevo_pagado := g.monto_pagado + _monto;
  IF v_nuevo_pagado > g.total + 0.01 THEN RAISE EXCEPTION 'Pago excede saldo'; END IF;

  v_cuenta_prov := get_cuenta_id(g.tenant_id, '2.1.01.01');

  INSERT INTO asientos_contables (tenant_id, fecha, concepto, origen, origen_id, total_debito, total_credito)
  VALUES (g.tenant_id, _fecha, 'Pago gasto: ' || g.concepto, 'pago_gasto', g.id, _monto, _monto)
  RETURNING id INTO v_asiento_id;

  INSERT INTO asiento_lineas (asiento_id, tenant_id, cuenta_id, debito, credito, descripcion)
  VALUES (v_asiento_id, g.tenant_id, v_cuenta_prov, _monto, 0, 'Pago a proveedor');
  INSERT INTO asiento_lineas (asiento_id, tenant_id, cuenta_id, debito, credito, descripcion)
  VALUES (v_asiento_id, g.tenant_id, _cuenta_pago_id, 0, _monto, COALESCE(_metodo,'Pago'));

  INSERT INTO pagos_gasto (tenant_id, gasto_id, fecha, monto, cuenta_pago_id, metodo, asiento_id, created_by)
  VALUES (g.tenant_id, g.id, _fecha, _monto, _cuenta_pago_id, _metodo, v_asiento_id, auth.uid())
  RETURNING id INTO v_pago_id;

  UPDATE gastos SET monto_pagado = v_nuevo_pagado,
    estado = CASE WHEN v_nuevo_pagado >= total - 0.01 THEN 'pagado'::estado_gasto ELSE 'pendiente'::estado_gasto END
  WHERE id = g.id;

  RETURN v_pago_id;
END; $$;