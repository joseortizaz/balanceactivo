-- Registro de quién crea cada empresa + limpieza de empresas huérfanas.
--
-- Causa de las empresas "Mi Empresa" sin usuarios: al agregar un miembro a una
-- empresa (Equipo), la cuenta de acceso nueva disparaba handle_new_user(), que
-- creaba una empresa vacía y luego el perfil se movía a la empresa correcta,
-- dejando la vacía huérfana. Además el rol del miembro quedaba apuntando a esa
-- empresa vacía (el upsert usaba una clave que no existe).

-- 1) Quién y cómo creó cada empresa
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS email_registro text,
  ADD COLUMN IF NOT EXISTS origen text;

-- 2) Rellenar con lo que se sabe hoy (ANTES de reubicar los roles)
UPDATE public.tenants t
   SET email_registro = x.email
  FROM (
    SELECT r.tenant_id, min(u.email) AS email
      FROM public.user_roles r
      JOIN auth.users u ON u.id = r.user_id
     GROUP BY r.tenant_id
  ) x
 WHERE x.tenant_id = t.id AND t.email_registro IS NULL;

UPDATE public.tenants t
   SET origen = CASE
         WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.tenant_id = t.id AND r.role = 'super_admin') THEN 'plataforma'
         WHEN t.email_registro IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.tenant_id = t.id)
              THEN 'invitacion'
         ELSE 'autoregistro'
       END
 WHERE t.origen IS NULL;

-- 3) Los roles de cada usuario deben apuntar a la empresa de su perfil
--    (si no, borrar la empresa huérfana les quitaría el rol de administrador).
UPDATE public.user_roles r
   SET tenant_id = p.tenant_id
  FROM public.profiles p
 WHERE p.id = r.user_id
   AND r.tenant_id <> p.tenant_id
   AND r.role <> 'super_admin'
   AND NOT EXISTS (
     SELECT 1 FROM public.user_roles r2
      WHERE r2.user_id = r.user_id AND r2.tenant_id = p.tenant_id AND r2.role = r.role
   );

-- Sobrantes duplicados (el rol ya existía en la empresa correcta)
DELETE FROM public.user_roles r
 USING public.profiles p
 WHERE p.id = r.user_id AND r.tenant_id <> p.tenant_id AND r.role <> 'super_admin';

-- 4) handle_new_user: no crear empresa vacía para miembros invitados y dejar
--    registro de auditoría de cada empresa nueva (con el correo).
--    Se confía solo en raw_app_meta_data (únicamente el servidor lo escribe);
--    raw_user_meta_data lo controla quien se registra.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _tenant_id UUID;
  _invited   UUID;
  _razon TEXT;
  _nombre TEXT;
BEGIN
  _nombre := COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1));

  BEGIN
    _invited := NULLIF(NEW.raw_app_meta_data->>'invited_to_tenant', '')::uuid;
  EXCEPTION WHEN others THEN
    _invited := NULL;
  END;

  IF _invited IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants WHERE id = _invited) THEN
    -- Miembro agregado por un administrador: va directo a esa empresa.
    INSERT INTO public.profiles (id, tenant_id, nombre, email)
    VALUES (NEW.id, _invited, _nombre, NEW.email);
    -- El rol lo asigna el servidor (addMember) según lo elegido por el administrador.
    RETURN NEW;
  END IF;

  _razon := COALESCE(NEW.raw_user_meta_data->>'razon_social', 'Mi Empresa');

  INSERT INTO public.tenants (razon_social, nombre_comercial, email_registro, origen)
  VALUES (_razon, _razon, NEW.email, 'autoregistro')
  RETURNING id INTO _tenant_id;

  INSERT INTO public.profiles (id, tenant_id, nombre, email)
  VALUES (NEW.id, _tenant_id, _nombre, NEW.email);

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, _tenant_id, 'administrador');

  INSERT INTO public.logs_auditoria (tenant_id, user_id, accion, tabla_afectada, registro_id, detalles)
  VALUES (_tenant_id, NEW.id, 'registro_empresa', 'tenants', _tenant_id,
          jsonb_build_object('email', NEW.email, 'razon_social', _razon, 'nombre', _nombre));

  PERFORM public.seed_tenant_defaults(_tenant_id);
  RETURN NEW;
END;
$function$;

-- 5) Registro inicial en auditoría de las empresas ya existentes (una sola vez)
INSERT INTO public.logs_auditoria (tenant_id, user_id, accion, tabla_afectada, registro_id, detalles, created_at)
SELECT t.id, NULL, 'registro_empresa', 'tenants', t.id,
       jsonb_build_object('email', t.email_registro, 'razon_social', t.razon_social, 'origen', t.origen, 'reconstruido', true),
       t.created_at
  FROM public.tenants t
 WHERE NOT EXISTS (
   SELECT 1 FROM public.logs_auditoria l WHERE l.tabla_afectada = 'tenants' AND l.registro_id = t.id AND l.accion = 'registro_empresa'
 );
