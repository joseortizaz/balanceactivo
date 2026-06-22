
-- 1. facturas DELETE policy (admin/contador only)
DROP POLICY IF EXISTS facturas_delete ON public.facturas;
CREATE POLICY facturas_delete ON public.facturas
  FOR DELETE TO authenticated
  USING (
    tenant_id = current_tenant_id()
    AND (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'contador'))
  );

-- 2. productos UPDATE policy with role check + WITH CHECK
DROP POLICY IF EXISTS productos_update ON public.productos;
CREATE POLICY productos_update ON public.productos
  FOR UPDATE TO authenticated
  USING (
    tenant_id = current_tenant_id()
    AND (
      has_role(auth.uid(), 'administrador')
      OR has_role(auth.uid(), 'contador')
      OR has_role(auth.uid(), 'agente_facturacion')
    )
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND (
      has_role(auth.uid(), 'administrador')
      OR has_role(auth.uid(), 'contador')
      OR has_role(auth.uid(), 'agente_facturacion')
    )
  );

-- 3. Pin search_path on email queue helper functions
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pgmq, public
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pgmq, public
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pgmq, public
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pgmq, public
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;
