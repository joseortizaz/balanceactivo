-- Infraestructura previa para Facturación Electrónica (e-CF), pensada para
-- el modelo de "Proveedor de Servicios de Facturación Electrónica" ante la
-- DGII: Balance Activo custodiará el certificado digital de cada empresa
-- cliente (tenant) y firmará los e-CF en su nombre. Ver README.md, sección
-- "Facturación Electrónica (e-CF)", para el mapa completo de qué falta y
-- las referencias oficiales de la DGII usadas para diseñar este esquema.
--
-- IMPORTANTE: la DGII exige certificarse primero como Emisor Electrónico
-- (un solo RNC) y solo después solicitar ser Proveedor de Servicios. Este
-- modelo ya es multi-tenant desde el inicio (cada empresa-cliente con su
-- propio certificado y sus propias secuencias e-NCF), pero en la práctica
-- las primeras pruebas reales contra la DGII (TesteCF) solo podrán
-- correrse con el primer certificado que la empresa dueña de Balance
-- Activo obtenga.

-- ============ ENUMS ============

DO $$ BEGIN
  -- Tipos de Comprobante Fiscal Electrónico (e-CF) según la DGII:
  -- 31 Factura de Crédito Fiscal Electrónica
  -- 32 Factura de Consumo Electrónica
  -- 33 Nota de Débito Electrónica
  -- 34 Nota de Crédito Electrónica
  -- 41 Comprobante Electrónico de Compras
  -- 43 Comprobante Electrónico para Gastos Menores
  -- 44 Comprobante Electrónico para Regímenes Especiales
  -- 45 Comprobante Electrónico Gubernamental
  -- 46 Comprobante Electrónico para Exportaciones
  -- 47 Comprobante Electrónico para Pagos al Exterior
  CREATE TYPE public.tipo_ecf AS ENUM ('31','32','33','34','41','43','44','45','46','47');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  -- Progreso del tenant en el proceso de certificación de la DGII para ser
  -- Emisor Electrónico (Solicitud -> Sets de Pruebas -> Declaración Jurada
  -- -> Certificación). "certificado" = ya puede emitir e-CF en producción.
  CREATE TYPE public.ecf_estado_emisor AS ENUM ('no_iniciado', 'en_pruebas', 'certificado', 'suspendido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  -- A qué ambiente de la DGII apunta este tenant. "testecf" es el ambiente
  -- de pre-certificación (ecf.dgii.gov/testecf) donde se corren los Sets de
  -- Pruebas antes de poder pedir producción.
  CREATE TYPE public.ecf_ambiente AS ENUM ('testecf', 'certificacion', 'produccion');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  -- Estado de un e-CF individual frente a la DGII, después de enviarlo.
  CREATE TYPE public.ecf_estado_envio AS ENUM (
    'pendiente', 'firmado', 'enviado', 'en_proceso',
    'aceptado', 'aceptado_condicional', 'rechazado', 'contingencia'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ ESTADO DE E-CF POR TENANT ============

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS ecf_estado public.ecf_estado_emisor NOT NULL DEFAULT 'no_iniciado',
  ADD COLUMN IF NOT EXISTS ecf_ambiente public.ecf_ambiente NOT NULL DEFAULT 'testecf',
  -- RNC bajo el cual la DGII certificó al tenant como Emisor Electrónico.
  -- Normalmente es tenants.rnc, pero se guarda aparte por si en algún
  -- momento un tenant factura bajo un RNC representado distinto.
  ADD COLUMN IF NOT EXISTS ecf_rnc_certificado text,
  ADD COLUMN IF NOT EXISTS ecf_fecha_certificacion date;

-- ============ CERTIFICADO DIGITAL (custodia por tenant) ============
--
-- Balance Activo actúa, según el modelo operativo que describe la DGII
-- para Proveedores de Servicios de FE, como custodio del certificado
-- digital y de la firma de cada empresa cliente. El archivo .p12/.pfx en
-- sí ya es un contenedor cifrado con su propia contraseña (PKCS#12); esa
-- contraseña NUNCA se guarda en texto plano -- se cifra con AES-256-GCM
-- usando una clave maestra que vive solo como secreto del Worker
-- (CERT_ENCRYPTION_KEY, ver .env.example), nunca en la base de datos.
--
-- El archivo .p12 se guarda en el bucket privado "certificados-digitales"
-- (creado más abajo), al que ningún rol "authenticated" tiene acceso de
-- lectura -- solo el service_role, desde el Worker, al momento de firmar.
CREATE TABLE IF NOT EXISTS public.tenant_certificados_digitales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  titular_nombre text NOT NULL,
  titular_documento text,
  entidad_certificadora text,
  storage_path text NOT NULL,
  passphrase_cifrada text NOT NULL,
  passphrase_iv text NOT NULL,
  valido_desde date,
  valido_hasta date NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- A lo sumo un certificado activo por tenant a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_cert_activo_unico
  ON public.tenant_certificados_digitales(tenant_id) WHERE activo;

ALTER TABLE public.tenant_certificados_digitales ENABLE ROW LEVEL SECURITY;

-- Solo administradores del tenant pueden ver que existe un certificado y
-- sus metadatos (vigencia, titular) -- nunca la passphrase cifrada ni la
-- ruta del archivo, que se excluyen a nivel de columna más abajo.
CREATE POLICY tenant_cert_select ON public.tenant_certificados_digitales
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_role(auth.uid(), 'administrador'::app_role));

-- INSERT/UPDATE/DELETE de esta tabla se hacen exclusivamente desde una
-- ruta de servidor (service_role) que cifra la passphrase antes de
-- guardarla -- por eso no hay políticas de escritura para "authenticated".

REVOKE SELECT ON public.tenant_certificados_digitales FROM authenticated;
GRANT SELECT (id, tenant_id, titular_nombre, titular_documento, entidad_certificadora, valido_desde, valido_hasta, activo, created_at)
  ON public.tenant_certificados_digitales TO authenticated;
GRANT ALL ON public.tenant_certificados_digitales TO service_role;

INSERT INTO storage.buckets (id, name, public)
VALUES ('certificados-digitales', 'certificados-digitales', false)
ON CONFLICT (id) DO NOTHING;

-- Sin políticas de SELECT/INSERT/UPDATE/DELETE para "authenticated" en este
-- bucket a propósito: el certificado se sube y se lee exclusivamente desde
-- una ruta de servidor con supabaseAdmin (service_role), que sí bypasea RLS.
-- Ningún usuario, ni siquiera administrador, puede descargar el .p12 desde
-- el cliente.

-- ============ SECUENCIAS E-NCF (asignadas por la DGII) ============
--
-- A diferencia de ncf_secuencias (que la empresa administra libremente
-- dentro de un rango que la DGII autorizó por adelantado, régimen NCF
-- tradicional), los rangos de e-NCF los asigna la DGII bajo demanda a
-- través de la Oficina Virtual una vez el tenant está certificado como
-- Emisor Electrónico. Esta tabla registra los rangos que la DGII entregó,
-- para que el sistema los consuma igual que los NCF tradicionales.
CREATE TABLE IF NOT EXISTS public.ecf_secuencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tipo_ecf public.tipo_ecf NOT NULL,
  secuencia_desde bigint NOT NULL,
  secuencia_hasta bigint NOT NULL,
  secuencia_actual bigint NOT NULL DEFAULT 0,
  fecha_vencimiento date,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, tipo_ecf, secuencia_desde)
);

ALTER TABLE public.ecf_secuencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY ecf_sec_select ON public.ecf_secuencias FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY ecf_sec_manage ON public.ecf_secuencias FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND (public.has_role(auth.uid(), 'administrador'::app_role) OR public.has_role(auth.uid(), 'contador'::app_role)))
  WITH CHECK (tenant_id = public.current_tenant_id() AND (public.has_role(auth.uid(), 'administrador'::app_role) OR public.has_role(auth.uid(), 'contador'::app_role)));

-- Siguiente e-NCF libre de un tipo, de forma atómica (mismo patrón que
-- siguiente_ncf_libre para el NCF tradicional).
CREATE OR REPLACE FUNCTION public.siguiente_encf_libre(_tenant uuid, _tipo public.tipo_ecf)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _next bigint; _hasta bigint; _seq_id uuid;
BEGIN
  SELECT id, secuencia_hasta INTO _seq_id, _hasta
    FROM public.ecf_secuencias
    WHERE tenant_id = _tenant AND tipo_ecf = _tipo AND activo = true
      AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURRENT_DATE)
    ORDER BY secuencia_desde LIMIT 1;
  IF _seq_id IS NULL THEN
    RAISE EXCEPTION 'No hay secuencia e-NCF activa y vigente para el tipo % de este tenant. Debe registrarse el rango que la DGII asignó en Configuración > Facturación Electrónica.', _tipo;
  END IF;

  UPDATE public.ecf_secuencias SET secuencia_actual = secuencia_actual + 1
    WHERE id = _seq_id
    RETURNING secuencia_actual INTO _next;

  IF _next > _hasta THEN
    RAISE EXCEPTION 'Se agotó el rango de e-NCF autorizado por la DGII para el tipo %. Debe solicitar un nuevo rango en la Oficina Virtual.', _tipo;
  END IF;

  RETURN 'E' || _tipo || lpad(_next::text, 10, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.siguiente_encf_libre(uuid, public.tipo_ecf) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.siguiente_encf_libre(uuid, public.tipo_ecf) TO authenticated, service_role;

-- ============ RASTREO E-CF POR FACTURA ============

ALTER TABLE public.facturas
  ADD COLUMN IF NOT EXISTS es_ecf boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tipo_ecf public.tipo_ecf,
  ADD COLUMN IF NOT EXISTS e_ncf text,
  ADD COLUMN IF NOT EXISTS ecf_estado_envio public.ecf_estado_envio,
  ADD COLUMN IF NOT EXISTS ecf_track_id text,
  ADD COLUMN IF NOT EXISTS ecf_codigo_seguridad text,
  ADD COLUMN IF NOT EXISTS ecf_xml_firmado_path text,
  ADD COLUMN IF NOT EXISTS ecf_fecha_firma timestamptz,
  ADD COLUMN IF NOT EXISTS ecf_fecha_respuesta_dgii timestamptz,
  ADD COLUMN IF NOT EXISTS ecf_mensaje_dgii text;

-- ============ AUDITORÍA DE COMUNICACIÓN CON LA DGII ============
--
-- Registro de cada paso del ciclo de vida de un e-CF (generación de XML,
-- firma, envío, respuesta). Independiente de logs_auditoria porque el
-- volumen y la naturaleza de los datos (XML, respuestas de la DGII) son
-- distintos, y esto es lo primero que se va a necesitar revisar si un
-- envío falla o la DGII rechaza un comprobante.
CREATE TABLE IF NOT EXISTS public.ecf_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  factura_id uuid REFERENCES public.facturas(id) ON DELETE CASCADE,
  evento text NOT NULL,
  detalle jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ecf_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY ecf_eventos_select ON public.ecf_eventos FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
GRANT ALL ON public.ecf_eventos TO service_role;
