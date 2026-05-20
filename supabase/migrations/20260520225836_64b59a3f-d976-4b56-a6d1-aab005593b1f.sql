CREATE TABLE IF NOT EXISTS public.productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  codigo text,
  nombre text NOT NULL,
  descripcion text,
  precio numeric NOT NULL DEFAULT 0,
  tasa_itbis numeric NOT NULL DEFAULT 18,
  unidad text NOT NULL DEFAULT 'unidad',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY productos_select ON public.productos FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id());

CREATE POLICY productos_manage ON public.productos FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE INDEX IF NOT EXISTS productos_tenant_idx ON public.productos(tenant_id);