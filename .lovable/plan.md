# API Pública v1 de Balance Activo

Construir una API REST versionada (`/api/public/v1/*`) autenticada con API keys por tenant, más webhooks salientes para notificar a Ceapsi.

## 1. Base de datos (migración)

**`api_keys`**
- `id`, `tenant_id`, `name`, `key_prefix` (8 chars visibles, ej. `ba_live_a1b2c3d4`), `key_hash` (SHA-256 del token completo), `last_used_at`, `revoked_at`, `created_by`, `created_at`.
- RLS: solo admin del tenant puede listar/crear/revocar. Los hashes nunca se devuelven al cliente después de crearse.

**`webhook_endpoints`**
- `id`, `tenant_id`, `url`, `secret` (para firmar payloads con HMAC-SHA256), `events` (array de tipos suscritos), `active`, `created_at`.
- RLS: admin del tenant.

**`webhook_deliveries`** (registro de intentos)
- `id`, `endpoint_id`, `event_type`, `payload`, `status_code`, `response_body`, `attempt`, `next_retry_at`, `delivered_at`, `created_at`.

**Función `verify_api_key(text)`** (SECURITY DEFINER)
- Recibe el token en claro, calcula hash, devuelve `tenant_id` si existe y no está revocado, actualiza `last_used_at`.

## 2. Autenticación de la API

Middleware en `src/lib/api-auth.server.ts`:
- Extrae `Authorization: Bearer ba_live_...` del request.
- Llama a `verify_api_key` con `supabaseAdmin`.
- Devuelve `{ tenantId, supabase }` — un cliente de servicio limitado al tenant validado (se filtra por `tenant_id` en cada query, no se depende de RLS).
- Retorna 401 si falta o es inválido.

## 3. Endpoints REST — `src/routes/api/public/v1/`

Todos devuelven JSON, validan con Zod, filtran por `tenant_id`.

**Clientes** (`clientes.ts`, `clientes.$id.ts`)
- `GET /clientes` — lista paginada (`?limit=50&offset=0&search=`).
- `POST /clientes` — crea (`nombre`, `rnc`, `email`, `telefono`, `direccion`, `tipo`).
- `GET /clientes/:id` — detalle.
- `PATCH /clientes/:id` — actualiza campos parciales.

**Facturas** (`facturas.ts`, `facturas.$id.ts`)
- `GET /facturas` — lista (`?cliente_id=&estado=&desde=&hasta=`).
- `POST /facturas` — crea factura con líneas (`cliente_id`, `fecha`, `tipo_ncf`, `condicion_pago`, `lineas: [{producto_id?, descripcion, cantidad, precio, itbis_rate}]`). Reutiliza la RPC `crear_factura` existente.
- `GET /facturas/:id` — detalle con líneas.
- `PATCH /facturas/:id` — actualiza (reutiliza `actualizar_factura`).

**Cobros** (`cobros.ts`, `cobros.$id.ts`)
- `GET /cobros?factura_id=` — lista.
- `POST /cobros` — registra cobro (`factura_id`, `monto`, `fecha`, `medio_pago`, `banco_id`, `nota`). Usa RPC `registrar_cobro`.
- `PATCH /cobros/:id` — edita monto/nota/fecha (permisos ya definidos en RLS).

**Meta**
- `GET /me` — devuelve datos del tenant autenticado (para validar la conexión desde Ceapsi).

## 4. Webhooks salientes

Cuando ocurren estos eventos, disparar entrega a los `webhook_endpoints` activos suscritos:

- `cliente.created`, `cliente.updated`
- `factura.created`, `factura.updated`, `factura.paid`
- `cobro.created`

**Implementación**:
- Función `emit_webhook(tenant_id, event_type, payload jsonb)` que inserta en `webhook_deliveries` con estado pendiente.
- Trigger en `cobros` que llama `emit_webhook('cobro.created', ...)` y otro que detecta `factura.estado='pagada'` para `factura.paid`.
- Server route `POST /api/public/v1/_deliver` (interno, protegido con `WEBHOOK_DISPATCH_SECRET`) que toma N entregas pendientes, hace `fetch` a la URL del endpoint firmando el cuerpo con `X-BA-Signature: sha256=<hmac>`, guarda respuesta y programa reintento exponencial (máx 5).
- pg_cron corriendo cada minuto que llama al endpoint `_deliver` con el secreto. Se documenta el statement SQL para que el usuario lo active.

## 5. UI — Configuración → API & Webhooks

Nueva pestaña en `configuracion.tsx` (solo admin):
- **API Keys**: tabla con nombre, prefijo, último uso, botón "Nueva key" (muestra el token completo UNA sola vez con banner de advertencia y botón copiar), botón "Revocar".
- **Webhooks**: tabla con URL, eventos suscritos, estado, botón "Nuevo endpoint" (genera un `secret` automático), "Ver últimas entregas" (modal con log de `webhook_deliveries`), "Desactivar".

## 6. Documentación

Archivo `API.md` en la raíz del proyecto con:
- URL base: `https://balanceactivo.lovable.app/api/public/v1`
- Cómo obtener y usar la API key.
- Ejemplos `curl` de cada endpoint.
- Estructura de eventos y verificación de firma HMAC de webhooks.

## Detalles técnicos

- Todos los endpoints en `/api/public/*` (bypassa auth de Lovable; se autentica manualmente).
- Validación con Zod en cada handler, errores en formato `{ error: { code, message } }`.
- Rate limiting NO se incluye por defecto (Lovable no tiene primitiva estándar); se documenta la limitación.
- Los secretos de webhook y el hash de API keys nunca vuelven a exponerse tras creación.
- CORS: `Access-Control-Allow-Origin: *` con manejador `OPTIONS` en cada ruta (para permitir llamadas desde el navegador de Ceapsi si se necesita).
