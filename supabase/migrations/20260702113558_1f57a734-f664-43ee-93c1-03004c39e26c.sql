
-- ============ API KEYS ============
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_api_keys_tenant ON public.api_keys(tenant_id);
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash) WHERE revoked_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin ve sus api keys" ON public.api_keys FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "admin crea api keys" ON public.api_keys FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "admin revoca api keys" ON public.api_keys FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "admin elimina api keys" ON public.api_keys FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_role(auth.uid(), 'administrador'));

-- ============ WEBHOOK ENDPOINTS ============
CREATE TABLE public.webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wh_endpoints_tenant ON public.webhook_endpoints(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_endpoints TO authenticated;
GRANT ALL ON public.webhook_endpoints TO service_role;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin ve sus webhooks" ON public.webhook_endpoints FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "admin crea webhooks" ON public.webhook_endpoints FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "admin edita webhooks" ON public.webhook_endpoints FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "admin elimina webhooks" ON public.webhook_endpoints FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_role(auth.uid(), 'administrador'));

CREATE TRIGGER trg_wh_endpoints_updated BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ WEBHOOK DELIVERIES ============
CREATE TABLE public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id uuid NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status_code int,
  response_body text,
  attempt int NOT NULL DEFAULT 0,
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wh_deliv_pending ON public.webhook_deliveries(next_retry_at)
  WHERE delivered_at IS NULL AND attempt < 5;
CREATE INDEX idx_wh_deliv_tenant ON public.webhook_deliveries(tenant_id, created_at DESC);

GRANT SELECT ON public.webhook_deliveries TO authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin ve entregas de webhooks" ON public.webhook_deliveries FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_role(auth.uid(), 'administrador'));

-- ============ verify_api_key ============
CREATE OR REPLACE FUNCTION public.verify_api_key(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _hash text;
  _tenant uuid;
BEGIN
  IF _token IS NULL OR length(_token) < 20 THEN RETURN NULL; END IF;
  _hash := encode(extensions.digest(_token, 'sha256'), 'hex');
  SELECT tenant_id INTO _tenant
    FROM public.api_keys
    WHERE key_hash = _hash AND revoked_at IS NULL
    LIMIT 1;
  IF _tenant IS NOT NULL THEN
    UPDATE public.api_keys SET last_used_at = now() WHERE key_hash = _hash;
  END IF;
  RETURN _tenant;
END $$;

REVOKE ALL ON FUNCTION public.verify_api_key(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_api_key(text) TO service_role;

-- ============ emit_webhook ============
CREATE OR REPLACE FUNCTION public.emit_webhook(_tenant uuid, _event text, _payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _ep RECORD;
BEGIN
  FOR _ep IN
    SELECT id FROM public.webhook_endpoints
    WHERE tenant_id = _tenant AND active = true AND (_event = ANY(events) OR '*' = ANY(events))
  LOOP
    INSERT INTO public.webhook_deliveries(endpoint_id, tenant_id, event_type, payload)
    VALUES (_ep.id, _tenant, _event, _payload);
  END LOOP;
END $$;

-- ============ Triggers ============
CREATE OR REPLACE FUNCTION public.fn_wh_cliente()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.emit_webhook(NEW.tenant_id,
    CASE WHEN TG_OP='INSERT' THEN 'cliente.created' ELSE 'cliente.updated' END,
    jsonb_build_object('id', NEW.id, 'nombre', NEW.nombre, 'rnc', NEW.rnc, 'email', NEW.email, 'telefono', NEW.telefono));
  RETURN NEW;
END $$;
CREATE TRIGGER trg_wh_cliente_ins AFTER INSERT ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.fn_wh_cliente();
CREATE TRIGGER trg_wh_cliente_upd AFTER UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.fn_wh_cliente();

CREATE OR REPLACE FUNCTION public.fn_wh_factura()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.emit_webhook(NEW.tenant_id, 'factura.created',
      jsonb_build_object('id', NEW.id, 'ncf', NEW.ncf, 'cliente_id', NEW.cliente_id,
        'fecha', NEW.fecha, 'total', NEW.total, 'estado', NEW.estado, 'condicion_pago', NEW.condicion_pago));
  ELSE
    PERFORM public.emit_webhook(NEW.tenant_id, 'factura.updated',
      jsonb_build_object('id', NEW.id, 'ncf', NEW.ncf, 'total', NEW.total,
        'estado', NEW.estado, 'monto_pagado', NEW.monto_pagado));
    IF OLD.estado <> 'pagada' AND NEW.estado = 'pagada' THEN
      PERFORM public.emit_webhook(NEW.tenant_id, 'factura.paid',
        jsonb_build_object('id', NEW.id, 'ncf', NEW.ncf, 'total', NEW.total, 'monto_pagado', NEW.monto_pagado));
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_wh_factura_ins AFTER INSERT ON public.facturas
  FOR EACH ROW EXECUTE FUNCTION public.fn_wh_factura();
CREATE TRIGGER trg_wh_factura_upd AFTER UPDATE ON public.facturas
  FOR EACH ROW EXECUTE FUNCTION public.fn_wh_factura();

CREATE OR REPLACE FUNCTION public.fn_wh_cobro()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.emit_webhook(NEW.tenant_id, 'cobro.created',
    jsonb_build_object('id', NEW.id, 'factura_id', NEW.factura_id, 'monto', NEW.monto,
      'fecha', NEW.fecha, 'metodo', NEW.metodo, 'banco_id', NEW.banco_id));
  RETURN NEW;
END $$;
CREATE TRIGGER trg_wh_cobro_ins AFTER INSERT ON public.cobros
  FOR EACH ROW EXECUTE FUNCTION public.fn_wh_cobro();
