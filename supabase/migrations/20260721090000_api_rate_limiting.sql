-- Rate limiting para la API pública (/api/public/v1/*).
-- Contador por tenant y ventana de tiempo fija (fixed window), con upsert atómico.

CREATE TABLE IF NOT EXISTS public.api_rate_limit_counters (
  tenant_id uuid NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, window_start)
);

-- No necesita RLS de usuario: solo se accede vía función SECURITY DEFINER
-- desde el service role (api-auth.server.ts).
ALTER TABLE public.api_rate_limit_counters ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.api_rate_limit_counters TO service_role;

-- Limpieza periódica opcional: ventanas viejas se pueden borrar con un cron,
-- no es estrictamente necesario porque la tabla es pequeña (una fila por
-- tenant por minuto activo), pero se deja un índice para facilitarlo.
CREATE INDEX IF NOT EXISTS idx_api_rate_limit_window ON public.api_rate_limit_counters(window_start);

-- Verifica e incrementa el contador de la ventana actual. Devuelve TRUE si la
-- request está permitida (no superó el límite), FALSE si debe rechazarse.
CREATE OR REPLACE FUNCTION public.check_api_rate_limit(
  _tenant_id uuid,
  _max_requests integer,
  _window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _window_start timestamptz;
  _count integer;
BEGIN
  _window_start := to_timestamp(floor(extract(epoch FROM now()) / _window_seconds) * _window_seconds);

  INSERT INTO public.api_rate_limit_counters (tenant_id, window_start, request_count)
  VALUES (_tenant_id, _window_start, 1)
  ON CONFLICT (tenant_id, window_start)
  DO UPDATE SET request_count = api_rate_limit_counters.request_count + 1
  RETURNING request_count INTO _count;

  RETURN _count <= _max_requests;
END;
$$;

REVOKE ALL ON FUNCTION public.check_api_rate_limit(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_api_rate_limit(uuid, integer, integer) TO service_role;
