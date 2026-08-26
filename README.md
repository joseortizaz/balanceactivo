# Balance Activo

SaaS multi-tenant de facturación, contabilidad y nómina para República Dominicana (NCF, ITBIS, reportes DGII 606/607/608, TSS/ISR). Construido con [TanStack Start](https://tanstack.com/start) sobre Cloudflare Workers, con Supabase (Postgres + RLS) como backend.

## Stack

- **Frontend/SSR**: React 19 + TanStack Start + TanStack Router + TanStack Query, Tailwind v4, shadcn/ui.
- **Backend**: rutas server de TanStack Start desplegadas en Cloudflare Workers (`wrangler.jsonc`, entrada en `src/server.ts`).
- **Base de datos**: Supabase (Postgres), con Row Level Security como mecanismo principal de aislamiento multi-tenant.
- **Paquetes**: `bun` (ver `bun.lock`). No usar `npm install`/`yarn` — genera un lockfile distinto y puede desincronizar versiones.
- **Tests**: Vitest (`bun run test`).

## Setup local

```bash
bun install
cp .env.example .env   # completar con los valores reales (ver abajo)
bun run dev
```

## Variables de entorno

Ninguna de estas debe commitearse — `.env` está en `.gitignore`. Usar `.env.example` como referencia.

| Variable | Dónde se usa | Notas |
|---|---|---|
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | cliente y servidor | URL del proyecto Supabase |
| `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` | cliente y servidor | Clave "anon", pública por diseño (la protección real es RLS) |
| `SUPABASE_PROJECT_ID` / `VITE_SUPABASE_PROJECT_ID` | cliente y servidor | — |
| `SUPABASE_SERVICE_ROLE_KEY` | **solo servidor** | Bypasea RLS. Nunca exponer al cliente, nunca loguear |
| `WEBHOOK_DISPATCH_SECRET` | **solo servidor** | Autoriza `POST /api/public/v1/_deliver` (despacho de webhooks salientes). Generar un valor aleatorio largo, no reusar ninguna clave de Supabase |
| `VITE_TURNSTILE_SITE_KEY` | cliente | Site key pública de Cloudflare Turnstile (captcha en login/signup). Opcional: si no está seteada, el captcha simplemente no se muestra |
| `ERROR_WEBHOOK_URL` | **solo servidor** | Si está seteada, los errores no manejados del servidor se reportan ahí (POST JSON). Pensado para un Slack Incoming Webhook o endpoint propio |
| `LOVABLE_API_KEY` / `LOVABLE_SEND_URL` | **solo servidor** | Envío de emails transaccionales vía la infraestructura de Lovable |

## Scripts

- `bun run dev` — servidor de desarrollo
- `bun run build` — build de producción
- `bun run test` — corre los tests de Vitest
- `bun run lint` — ESLint
- `bun run format` — Prettier

## Base de datos y migraciones

Las migraciones viven en `supabase/migrations/`, ordenadas por timestamp en el nombre del archivo. Convenciones a seguir:

- **No editar ni borrar migraciones ya commiteadas a `main`.** Si ya se aplicaron a un entorno (staging/producción), Supabase las trackea por nombre de archivo en `supabase_migrations.schema_migrations`; borrarlas o renombrarlas desincroniza esa base de datos del historial del repo, aunque localmente "funcione". Un cambio de esquema siempre es una migración nueva, incluso si es solo para corregir la anterior.
- Usar `CREATE OR REPLACE FUNCTION` para iterar sobre funciones (ya es el patrón usado en el repo) en vez de `DROP` + `CREATE`.
- Para tablas, usar `CREATE TABLE IF NOT EXISTS` y `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` para que las migraciones sean re-ejecutables sin error.
- Toda tabla de negocio nueva necesita: `tenant_id UUID NOT NULL REFERENCES public.tenants(id)`, `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, y políticas que filtren por `tenant_id = public.current_tenant_id()` (ver cualquier migración existente como referencia, p. ej. `20260519162019_...sql`).
- Después de una migración que cambia el esquema, regenerar `src/integrations/supabase/types.ts` (o actualizarlo a mano si no se tiene el CLI de Supabase a mano) para que `supabase.from(...)` mantenga el tipado — evitar el patrón `.from("tabla" as any)` / `(supabase as any)`, que desactiva el chequeo de TypeScript en esa llamada.

Nota sobre el historial actual: hay migraciones que recrean el mismo objeto varias veces (p. ej. `email_infra` aparece 3 veces, `crear_factura` se redefinió 3 veces). Funciona porque usan `IF NOT EXISTS`/`CREATE OR REPLACE`, pero dificulta leer el estado real del esquema desde el historial. No se reescribió ese historial en este repaso porque hacerlo con seguridad requiere confirmar contra la base de datos real qué migraciones ya se aplicaron — reescribir a ciegas puede desincronizar un entorno ya desplegado. Si en algún momento quieren un "baseline" limpio, lo más seguro es: congelar el esquema actual con `supabase db dump`, y a partir de ahí empezar una carpeta de migraciones nueva, dejando las viejas como archivo histórico sin tocar.

## Tests

`bun run test` corre Vitest sobre `src/**/*.test.ts`. Hoy la cobertura es la lógica pura de `src/lib/dgii.ts` y `src/lib/format.ts` (formato DGII, validación de RNC/cédula). Es un punto de partida, no cobertura completa — falta lo más importante: las funciones de Postgres (`crear_factura`, cálculo de ITBIS/ISR, generación de NCF, nómina). Esas viven en SQL y necesitarían un entorno de Supabase local (`supabase start`) para testear de verdad contra Postgres.

## CI

`.github/workflows/ci.yml` corre lint + test + build en cada push/PR contra `main`.
