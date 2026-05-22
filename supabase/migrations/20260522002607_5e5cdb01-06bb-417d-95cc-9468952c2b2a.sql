
-- Enum para estado de nómina
DO $$ BEGIN
  CREATE TYPE public.estado_modulo_nomina AS ENUM ('no_solicitado','pendiente','activa','suspendida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.suscripciones
  ADD COLUMN IF NOT EXISTS nomina_estado public.estado_modulo_nomina NOT NULL DEFAULT 'no_solicitado',
  ADD COLUMN IF NOT EXISTS nomina_fecha_inicio date,
  ADD COLUMN IF NOT EXISTS nomina_fecha_termino date,
  ADD COLUMN IF NOT EXISTS nomina_activado_at timestamptz,
  ADD COLUMN IF NOT EXISTS nomina_activado_por uuid;

-- Si una suscripción ya incluía nómina al solicitarse, marcar como pendiente
UPDATE public.suscripciones
   SET nomina_estado = 'pendiente'
 WHERE incluye_nomina = true
   AND nomina_estado = 'no_solicitado';

-- Función para obtener los correos de los super administradores
CREATE OR REPLACE FUNCTION public.get_super_admin_emails()
RETURNS TABLE (email text, nombre text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.email::text, COALESCE(p.nombre, '')::text
    FROM public.user_roles ur
    JOIN auth.users u ON u.id = ur.user_id
    LEFT JOIN public.profiles p ON p.id = ur.user_id
   WHERE ur.role = 'super_admin'
     AND u.email IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_super_admin_emails() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_super_admin_emails() TO authenticated, service_role;
