-- Verificación en dos pasos: obligatoriedad real en la base de datos.
--
-- Casi todas las políticas RLS comparan tenant_id con current_tenant_id().
-- Si el usuario tiene un factor MFA verificado pero su sesión todavía es
-- "aal1" (solo contraseña), esta función devuelve NULL y la sesión no ve ni
-- modifica datos de la empresa hasta completar el código (sesión "aal2").
-- Los usuarios SIN verificación en dos pasos no se ven afectados.
-- Las llamadas con service_role (API pública, webhooks, jobs) tampoco:
-- no tienen auth.uid().

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.tenant_id
    FROM public.profiles p
   WHERE p.id = auth.uid()
     AND (
       COALESCE(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
       OR NOT EXISTS (
         SELECT 1 FROM auth.mfa_factors f
          WHERE f.user_id = auth.uid() AND f.status = 'verified'
       )
     )
$function$;
