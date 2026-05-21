
-- Estados y enums
DO $$ BEGIN
  CREATE TYPE public.plan_codigo AS ENUM ('emprendedor','mipyme','corporativo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.estado_suscripcion AS ENUM ('pendiente','activa','vencida','suspendida','cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabla principal: una suscripción "vigente o pendiente" por tenant a la vez
CREATE TABLE IF NOT EXISTS public.suscripciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  plan plan_codigo NOT NULL,
  incluye_nomina boolean NOT NULL DEFAULT false,
  estado estado_suscripcion NOT NULL DEFAULT 'pendiente',
  precio_plan numeric NOT NULL DEFAULT 0,
  precio_nomina numeric NOT NULL DEFAULT 0,
  precio_total numeric NOT NULL DEFAULT 0,
  limite_facturacion_mensual numeric NOT NULL DEFAULT 0,
  fecha_solicitud date NOT NULL DEFAULT CURRENT_DATE,
  fecha_inicio date,
  fecha_termino date,
  metodo_pago text NOT NULL DEFAULT 'transferencia_bancaria',
  referencia_pago text,
  notas_admin text,
  activado_por uuid,
  activado_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_susc_tenant ON public.suscripciones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_susc_estado ON public.suscripciones(estado);

ALTER TABLE public.suscripciones ENABLE ROW LEVEL SECURITY;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS susc_touch ON public.suscripciones;
CREATE TRIGGER susc_touch BEFORE UPDATE ON public.suscripciones
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS policies
DROP POLICY IF EXISTS susc_select_own ON public.suscripciones;
CREATE POLICY susc_select_own ON public.suscripciones
  FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS susc_insert_admin ON public.suscripciones;
CREATE POLICY susc_insert_admin ON public.suscripciones
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND has_role(auth.uid(), 'administrador'::app_role));

DROP POLICY IF EXISTS susc_super_admin_all ON public.suscripciones;
CREATE POLICY susc_super_admin_all ON public.suscripciones
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Catálogo fijo de planes (lectura)
CREATE OR REPLACE FUNCTION public.get_planes_catalogo()
RETURNS TABLE(
  codigo plan_codigo,
  nombre text,
  precio numeric,
  precio_nomina numeric,
  limite_facturacion numeric,
  max_administradores int,
  max_agentes_facturacion int,
  max_contadores int,
  descripcion text
)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT 'emprendedor'::plan_codigo, 'Emprendedor'::text, 1190::numeric, 300::numeric, 500000::numeric, 1, 1, 1,
         'Ideal para emprendedores. Incluye 1 administrador y 1 agente de facturación o contador.'::text
  UNION ALL
  SELECT 'mipyme'::plan_codigo, 'Mipyme'::text, 3190::numeric, 600::numeric, 1200000::numeric, 1, 1, 1,
         'Para pequeñas empresas con equipo completo de facturación y contabilidad.'::text
  UNION ALL
  SELECT 'corporativo'::plan_codigo, 'Corporativo'::text, 5190::numeric, 900::numeric, 4500000::numeric, 1, 3, 1,
         'Para empresas en crecimiento con múltiples agentes de facturación.'::text;
$$;

-- Helper para conocer la facturación del mes actual del tenant actual
CREATE OR REPLACE FUNCTION public.facturacion_mes_actual()
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(total),0)::numeric
  FROM public.facturas
  WHERE tenant_id = current_tenant_id()
    AND date_trunc('month', fecha) = date_trunc('month', CURRENT_DATE);
$$;
