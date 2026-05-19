
-- ============ ENUMS ============
CREATE TYPE app_role AS ENUM ('administrador', 'contador', 'agente_facturacion');
CREATE TYPE regimen_fiscal AS ENUM ('ordinario', 'rst');
CREATE TYPE tipo_ncf AS ENUM ('B01', 'B02', 'B04', 'B15');
CREATE TYPE condicion_pago AS ENUM ('contado', 'credito');
CREATE TYPE estado_factura AS ENUM ('pendiente', 'pagada', 'anulada');
CREATE TYPE tipo_documento AS ENUM ('rnc_empresa', 'rnc_persona', 'cedula');
CREATE TYPE tipo_cuenta AS ENUM ('activo','pasivo','capital','ingreso','costo','gasto');

-- ============ TENANTS ============
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rnc TEXT,
  razon_social TEXT NOT NULL,
  nombre_comercial TEXT,
  regimen_fiscal regimen_fiscal NOT NULL DEFAULT 'ordinario',
  direccion TEXT,
  telefono TEXT,
  itbis_tasa_principal NUMERIC(5,2) NOT NULL DEFAULT 18,
  itbis_tasa_reducida NUMERIC(5,2) NOT NULL DEFAULT 16,
  retencion_isr_servicios NUMERIC(5,2) NOT NULL DEFAULT 10,
  retencion_isr_alquileres NUMERIC(5,2) NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ SECURITY DEFINER HELPERS ============
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT tenant_id FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- ============ NCF SECUENCIAS ============
CREATE TABLE public.ncf_secuencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tipo tipo_ncf NOT NULL,
  prefijo TEXT NOT NULL,
  secuencia_actual BIGINT NOT NULL DEFAULT 0,
  secuencia_hasta BIGINT NOT NULL DEFAULT 99999999,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, tipo)
);
ALTER TABLE public.ncf_secuencias ENABLE ROW LEVEL SECURITY;

-- ============ CATALOGO DE CUENTAS ============
CREATE TABLE public.cuentas_contables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  tipo tipo_cuenta NOT NULL,
  nivel INT NOT NULL DEFAULT 1,
  parent_id UUID REFERENCES public.cuentas_contables(id) ON DELETE SET NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  es_movimiento BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, codigo)
);
ALTER TABLE public.cuentas_contables ENABLE ROW LEVEL SECURITY;

-- ============ CLIENTES ============
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tipo_documento tipo_documento NOT NULL DEFAULT 'rnc_empresa',
  documento TEXT NOT NULL,
  razon_social TEXT NOT NULL,
  nombre_comercial TEXT,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, documento)
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- ============ PROVEEDORES ============
CREATE TABLE public.proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tipo_documento tipo_documento NOT NULL DEFAULT 'rnc_empresa',
  documento TEXT NOT NULL,
  razon_social TEXT NOT NULL,
  nombre_comercial TEXT,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, documento)
);
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;

-- ============ ASIENTOS CONTABLES ============
CREATE TABLE public.asientos_contables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  numero BIGSERIAL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  concepto TEXT NOT NULL,
  origen TEXT,
  origen_id UUID,
  total_debito NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_credito NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asientos_contables ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.asiento_lineas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asiento_id UUID NOT NULL REFERENCES public.asientos_contables(id) ON DELETE CASCADE,
  cuenta_id UUID NOT NULL REFERENCES public.cuentas_contables(id),
  debito NUMERIC(14,2) NOT NULL DEFAULT 0,
  credito NUMERIC(14,2) NOT NULL DEFAULT 0,
  descripcion TEXT
);
ALTER TABLE public.asiento_lineas ENABLE ROW LEVEL SECURITY;

-- ============ FACTURAS ============
CREATE TABLE public.facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  tipo_ncf tipo_ncf NOT NULL,
  ncf TEXT NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  condicion_pago condicion_pago NOT NULL DEFAULT 'contado',
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  descuento NUMERIC(14,2) NOT NULL DEFAULT 0,
  itbis NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_pagado NUMERIC(14,2) NOT NULL DEFAULT 0,
  estado estado_factura NOT NULL DEFAULT 'pendiente',
  asiento_id UUID REFERENCES public.asientos_contables(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, ncf)
);
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.factura_lineas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factura_id UUID NOT NULL REFERENCES public.facturas(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(14,3) NOT NULL DEFAULT 1,
  precio NUMERIC(14,2) NOT NULL DEFAULT 0,
  tasa_itbis NUMERIC(5,2) NOT NULL DEFAULT 18,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  itbis NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.factura_lineas ENABLE ROW LEVEL SECURITY;

-- ============ COBROS ============
CREATE TABLE public.cobros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factura_id UUID NOT NULL REFERENCES public.facturas(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  monto NUMERIC(14,2) NOT NULL,
  metodo TEXT,
  asiento_id UUID REFERENCES public.asientos_contables(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cobros ENABLE ROW LEVEL SECURITY;

-- ============ LOGS DE AUDITORIA ============
CREATE TABLE public.logs_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  accion TEXT NOT NULL,
  tabla_afectada TEXT,
  registro_id UUID,
  detalles JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============
-- tenants: read your tenant; admin can update
CREATE POLICY "tenant_read_own" ON public.tenants FOR SELECT TO authenticated USING (id = public.current_tenant_id());
CREATE POLICY "tenant_update_admin" ON public.tenants FOR UPDATE TO authenticated USING (id = public.current_tenant_id() AND public.has_role(auth.uid(), 'administrador'));

-- profiles
CREATE POLICY "profiles_select_same_tenant" ON public.profiles FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- user_roles
CREATE POLICY "roles_select_same_tenant" ON public.user_roles FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
CREATE POLICY "roles_admin_manage" ON public.user_roles FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_role(auth.uid(), 'administrador'));

-- Generic helper: same tenant policies for all data tables
-- ncf_secuencias (admin gestiona)
CREATE POLICY "ncf_select" ON public.ncf_secuencias FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
CREATE POLICY "ncf_admin_all" ON public.ncf_secuencias FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_role(auth.uid(), 'administrador'));

-- cuentas (contador y admin gestionan)
CREATE POLICY "cuentas_select" ON public.cuentas_contables FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
CREATE POLICY "cuentas_manage" ON public.cuentas_contables FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND (public.has_role(auth.uid(), 'contador') OR public.has_role(auth.uid(), 'administrador')))
  WITH CHECK (tenant_id = public.current_tenant_id() AND (public.has_role(auth.uid(), 'contador') OR public.has_role(auth.uid(), 'administrador')));

-- clientes (todos los roles)
CREATE POLICY "clientes_select" ON public.clientes FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
CREATE POLICY "clientes_manage" ON public.clientes FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- proveedores
CREATE POLICY "prov_select" ON public.proveedores FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
CREATE POLICY "prov_manage" ON public.proveedores FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND (public.has_role(auth.uid(), 'contador') OR public.has_role(auth.uid(), 'administrador')))
  WITH CHECK (tenant_id = public.current_tenant_id() AND (public.has_role(auth.uid(), 'contador') OR public.has_role(auth.uid(), 'administrador')));

-- asientos
CREATE POLICY "asientos_select" ON public.asientos_contables FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
CREATE POLICY "asientos_insert" ON public.asientos_contables FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY "alineas_select" ON public.asiento_lineas FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
CREATE POLICY "alineas_insert" ON public.asiento_lineas FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());

-- facturas
CREATE POLICY "fact_select" ON public.facturas FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
CREATE POLICY "fact_insert" ON public.facturas FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY "fact_update" ON public.facturas FOR UPDATE TO authenticated USING (tenant_id = public.current_tenant_id());
CREATE POLICY "flineas_select" ON public.factura_lineas FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
CREATE POLICY "flineas_insert" ON public.factura_lineas FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());

-- cobros
CREATE POLICY "cobros_select" ON public.cobros FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
CREATE POLICY "cobros_insert" ON public.cobros FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());

-- logs (solo admin lee)
CREATE POLICY "logs_admin_select" ON public.logs_auditoria FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id() AND public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "logs_insert" ON public.logs_auditoria FOR INSERT TO authenticated WITH CHECK (tenant_id = public.current_tenant_id());

-- ============ FUNCTION: seed default data for new tenant ============
CREATE OR REPLACE FUNCTION public.seed_tenant_defaults(_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- NCF secuencias por defecto
  INSERT INTO public.ncf_secuencias (tenant_id, tipo, prefijo, secuencia_actual, secuencia_hasta) VALUES
    (_tenant_id, 'B01', 'B01', 0, 99999999),
    (_tenant_id, 'B02', 'B02', 0, 99999999),
    (_tenant_id, 'B04', 'B04', 0, 99999999),
    (_tenant_id, 'B15', 'B15', 0, 99999999);

  -- Catalogo de cuentas (estructura DR estandar)
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
END;
$$;

-- ============ FUNCTION: create tenant on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tenant_id UUID;
  _razon TEXT;
  _nombre TEXT;
BEGIN
  _razon := COALESCE(NEW.raw_user_meta_data->>'razon_social', 'Mi Empresa');
  _nombre := COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1));

  INSERT INTO public.tenants (razon_social, nombre_comercial)
  VALUES (_razon, _razon)
  RETURNING id INTO _tenant_id;

  INSERT INTO public.profiles (id, tenant_id, nombre, email)
  VALUES (NEW.id, _tenant_id, _nombre, NEW.email);

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, _tenant_id, 'administrador');

  PERFORM public.seed_tenant_defaults(_tenant_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ FUNCTION: crear factura con NCF atomico + asiento ============
CREATE OR REPLACE FUNCTION public.crear_factura(
  _cliente_id UUID,
  _tipo_ncf tipo_ncf,
  _condicion condicion_pago,
  _fecha DATE,
  _descuento NUMERIC,
  _lineas JSONB
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tenant UUID;
  _user UUID;
  _next BIGINT;
  _prefijo TEXT;
  _ncf TEXT;
  _factura_id UUID;
  _asiento_id UUID;
  _subtotal NUMERIC(14,2) := 0;
  _itbis NUMERIC(14,2) := 0;
  _total NUMERIC(14,2) := 0;
  _line JSONB;
  _cuenta_caja UUID;
  _cuenta_cxc UUID;
  _cuenta_ingresos UUID;
  _cuenta_itbis UUID;
  _ls NUMERIC; _li NUMERIC;
BEGIN
  _user := auth.uid();
  IF _user IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT tenant_id INTO _tenant FROM public.profiles WHERE id = _user;
  IF _tenant IS NULL THEN RAISE EXCEPTION 'Sin tenant'; END IF;

  -- Reservar siguiente NCF de forma atomica
  UPDATE public.ncf_secuencias
    SET secuencia_actual = secuencia_actual + 1
    WHERE tenant_id = _tenant AND tipo = _tipo_ncf AND activo = true
    RETURNING secuencia_actual, prefijo INTO _next, _prefijo;
  IF _next IS NULL THEN RAISE EXCEPTION 'Secuencia NCF no configurada para %', _tipo_ncf; END IF;
  IF _next > (SELECT secuencia_hasta FROM public.ncf_secuencias WHERE tenant_id=_tenant AND tipo=_tipo_ncf) THEN
    RAISE EXCEPTION 'Secuencia NCF agotada para %', _tipo_ncf;
  END IF;
  _ncf := _prefijo || lpad(_next::text, 8, '0');

  -- Calcular totales
  FOR _line IN SELECT * FROM jsonb_array_elements(_lineas) LOOP
    _ls := (_line->>'cantidad')::numeric * (_line->>'precio')::numeric;
    _li := _ls * ((_line->>'tasa_itbis')::numeric / 100.0);
    _subtotal := _subtotal + _ls;
    _itbis := _itbis + _li;
  END LOOP;
  _total := _subtotal - COALESCE(_descuento,0) + _itbis;

  -- Insert factura
  INSERT INTO public.facturas (tenant_id, cliente_id, tipo_ncf, ncf, fecha, condicion_pago, subtotal, descuento, itbis, total, estado, created_by)
  VALUES (_tenant, _cliente_id, _tipo_ncf, _ncf, _fecha, _condicion, _subtotal, COALESCE(_descuento,0), _itbis, _total,
          CASE WHEN _condicion='contado' THEN 'pagada'::estado_factura ELSE 'pendiente'::estado_factura END, _user)
  RETURNING id INTO _factura_id;

  -- Insertar lineas
  FOR _line IN SELECT * FROM jsonb_array_elements(_lineas) LOOP
    _ls := (_line->>'cantidad')::numeric * (_line->>'precio')::numeric;
    _li := _ls * ((_line->>'tasa_itbis')::numeric / 100.0);
    INSERT INTO public.factura_lineas (tenant_id, factura_id, descripcion, cantidad, precio, tasa_itbis, subtotal, itbis, total)
    VALUES (_tenant, _factura_id, _line->>'descripcion',
            (_line->>'cantidad')::numeric, (_line->>'precio')::numeric, (_line->>'tasa_itbis')::numeric,
            _ls, _li, _ls + _li);
  END LOOP;

  -- Cuentas
  SELECT id INTO _cuenta_caja FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='1.1.01.01';
  SELECT id INTO _cuenta_cxc FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='1.1.02.01';
  SELECT id INTO _cuenta_ingresos FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='4.1.01';
  SELECT id INTO _cuenta_itbis FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='2.1.02.01';

  -- Asiento contable
  INSERT INTO public.asientos_contables (tenant_id, fecha, concepto, origen, origen_id, total_debito, total_credito)
  VALUES (_tenant, _fecha, 'Factura ' || _ncf, 'factura', _factura_id, _total, _total)
  RETURNING id INTO _asiento_id;

  -- DEBITO: Caja o CxC
  INSERT INTO public.asiento_lineas (tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
  VALUES (_tenant, _asiento_id,
          CASE WHEN _condicion='contado' THEN _cuenta_caja ELSE _cuenta_cxc END,
          _total, 0, 'Factura ' || _ncf);

  -- CREDITO: Ingresos (subtotal - descuento)
  INSERT INTO public.asiento_lineas (tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
  VALUES (_tenant, _asiento_id, _cuenta_ingresos, 0, _subtotal - COALESCE(_descuento,0), 'Ingresos ' || _ncf);

  -- CREDITO: ITBIS por Pagar
  IF _itbis > 0 THEN
    INSERT INTO public.asiento_lineas (tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
    VALUES (_tenant, _asiento_id, _cuenta_itbis, 0, _itbis, 'ITBIS ' || _ncf);
  END IF;

  UPDATE public.facturas SET asiento_id = _asiento_id WHERE id = _factura_id;

  -- Log auditoria
  INSERT INTO public.logs_auditoria (tenant_id, user_id, accion, tabla_afectada, registro_id, detalles)
  VALUES (_tenant, _user, 'Creacion de Factura', 'facturas', _factura_id, jsonb_build_object('ncf', _ncf, 'total', _total));

  RETURN _factura_id;
END;
$$;

-- ============ FUNCTION: registrar cobro ============
CREATE OR REPLACE FUNCTION public.registrar_cobro(_factura_id UUID, _monto NUMERIC, _metodo TEXT, _fecha DATE)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tenant UUID; _user UUID; _cobro_id UUID; _asiento_id UUID;
  _cuenta_caja UUID; _cuenta_cxc UUID;
  _fact RECORD;
BEGIN
  _user := auth.uid();
  SELECT tenant_id INTO _tenant FROM public.profiles WHERE id = _user;
  SELECT * INTO _fact FROM public.facturas WHERE id = _factura_id AND tenant_id = _tenant;
  IF _fact IS NULL THEN RAISE EXCEPTION 'Factura no encontrada'; END IF;

  SELECT id INTO _cuenta_caja FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='1.1.01.01';
  SELECT id INTO _cuenta_cxc FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='1.1.02.01';

  INSERT INTO public.asientos_contables (tenant_id, fecha, concepto, origen, origen_id, total_debito, total_credito)
  VALUES (_tenant, _fecha, 'Cobro Factura ' || _fact.ncf, 'cobro', _factura_id, _monto, _monto)
  RETURNING id INTO _asiento_id;

  INSERT INTO public.asiento_lineas (tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
  VALUES (_tenant, _asiento_id, _cuenta_caja, _monto, 0, 'Cobro ' || _fact.ncf);
  INSERT INTO public.asiento_lineas (tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
  VALUES (_tenant, _asiento_id, _cuenta_cxc, 0, _monto, 'Cancelacion CxC ' || _fact.ncf);

  INSERT INTO public.cobros (tenant_id, factura_id, fecha, monto, metodo, asiento_id, created_by)
  VALUES (_tenant, _factura_id, _fecha, _monto, _metodo, _asiento_id, _user)
  RETURNING id INTO _cobro_id;

  UPDATE public.facturas
    SET monto_pagado = monto_pagado + _monto,
        estado = CASE WHEN monto_pagado + _monto >= total THEN 'pagada'::estado_factura ELSE estado END
    WHERE id = _factura_id;

  INSERT INTO public.logs_auditoria (tenant_id, user_id, accion, tabla_afectada, registro_id, detalles)
  VALUES (_tenant, _user, 'Registro de Cobro', 'cobros', _cobro_id, jsonb_build_object('factura', _fact.ncf, 'monto', _monto));

  RETURN _cobro_id;
END;
$$;
