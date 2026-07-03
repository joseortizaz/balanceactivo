CREATE OR REPLACE FUNCTION public.fn_wh_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.emit_webhook(NEW.tenant_id,
    CASE WHEN TG_OP='INSERT' THEN 'cliente.created' ELSE 'cliente.updated' END,
    jsonb_build_object('id', NEW.id, 'razon_social', NEW.razon_social, 'documento', NEW.documento, 'tipo_documento', NEW.tipo_documento, 'email', NEW.email, 'telefono', NEW.telefono));
  RETURN NEW;
END $function$;