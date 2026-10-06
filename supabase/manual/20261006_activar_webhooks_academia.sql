-- ACTIVACIÓN MANUAL de webhooks hacia Academia Ceapsi (no es una migración).
-- Ejecutar en el SQL Editor de Supabase, EN ESTE ORDEN, después de publicar
-- el código (ruta /api/public/v1/deliver) y de crear el secreto
-- WEBHOOK_DISPATCH_SECRET en Lovable.

-- 0) Guardar el MISMO valor de WEBHOOK_DISPATCH_SECRET en Vault (reemplazar):
--    select vault.create_secret('<valor>', 'webhook_dispatch_secret');

-- 1) Descartar la cola vieja de Ceapsi (no debe enviarse).
update public.webhook_deliveries
   set delivered_at = now(),
       last_error = 'omitido: cola anterior a la activación del despachador (2026-10-06)'
 where tenant_id = 'b2b8cf46-1b1b-482c-94fc-94deca68f1e3'
   and delivered_at is null;

-- 2) Corregir el endpoint de Ceapsi (reemplazar <SECRETO> por el valor de
--    BALANCE_ACTIVO_WEBHOOK_SECRET de la academia).
update public.webhook_endpoints
   set url = 'https://academiaceapsi.com/api/public/balance-activo-webhook',
       events = (select array_agg(distinct e) from unnest(events || array['cobro.updated']) e),
       secret = '<SECRETO>'
 where id = 'b28ccc8a-0309-493c-8fb4-271bd967cac1';

-- 3) Programar el despachador cada minuto.
select cron.schedule(
  'despachar-webhooks',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://balanceactivo.net/api/public/v1/deliver',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-dispatch-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'webhook_dispatch_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
