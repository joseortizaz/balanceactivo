
# Balance Activo — Plan del MVP

App SaaS multi-tenant de contabilidad y facturación para República Dominicana, con NCF, ITBIS, asientos automáticos y reportes pre-606/607.

## Stack

- **Frontend**: TanStack Start + React + Tailwind + shadcn/ui (ya instalados).
- **Backend**: Lovable Cloud (Supabase) — Postgres, Auth, RLS, server functions.
- **Auth**: Email + contraseña (Supabase Auth nativo).

## Fase 1 — Cimientos (base de datos + auth + RBAC)

### Esquema multi-tenant
- `tenants` (empresa): razón social, nombre comercial, RNC, régimen fiscal (`ordinario` | `rst`), config NCF (prefijos + secuencias por tipo), ITBIS por defecto, retenciones ISR.
- `profiles` (1:1 con `auth.users`): nombre, `tenant_id`.
- `user_roles` enum (`administrador`, `contador`, `agente_facturacion`) en tabla separada (nunca en profiles).
- Función `SECURITY DEFINER` `has_role(_user, _role)` + `current_tenant_id()` para RLS.

### RLS estricto
- Todas las tablas tienen `tenant_id`.
- Policies: `tenant_id = current_tenant_id()` + check de rol cuando aplique.

### Onboarding
- Trigger `on_auth_user_created`: si el usuario llega vía signup normal crea su `tenant`, su `profile` y le asigna rol `administrador`.
- Pantallas: `/login`, `/signup` (crea empresa), `/onboarding/fiscal` para completar RNC/NCF tras registro.

## Fase 2 — Configuración fiscal (Administrador)

Pantalla `/configuracion/fiscal`:
- RNC con validación 9 u 11 dígitos.
- Razón social, nombre comercial, dirección, teléfono.
- Régimen fiscal.
- Tabla `ncf_secuencias` con filas para B01, B02, B04, B15: `prefijo`, `secuencia_actual`, `secuencia_hasta`, `activo`.
- ITBIS por defecto (18, 16, 0) y tasas de retención ISR configurables.

## Fase 3 — Catálogo, Clientes, Proveedores

- `cuentas_contables`: estructura jerárquica de 5 niveles, sembrada por defecto al crear tenant (1 Activos, 2 Pasivos, 3 Capital, 4 Ingresos, 5 Costos, 6 Gastos), con cuentas clave: Caja, Cuentas por Cobrar, ITBIS por Pagar, Ingresos por Ventas, etc. CRUD para Contador (soft delete vía `activo`).
- `clientes` y `proveedores`: tipo doc (RNC empresa / RNC persona / Cédula), número con validación, razón social, dirección, teléfono, email.

## Fase 4 — Núcleo: Facturación + Asiento Automático

### Tablas
- `facturas`: cliente, tipo_ncf, ncf (único por tenant+ncf), condición pago, fechas, subtotal, descuento, itbis, total, estado (`pendiente`|`pagada`|`anulada`), asiento_id.
- `factura_lineas`: descripción, cantidad, precio, tasa_itbis, monto_itbis, subtotal.
- `asientos_contables` + `asiento_lineas` (débito/crédito por cuenta).
- `cobros` para registrar pagos (Agente de Facturación).
- `notas_credito` (estructura espejo de factura, NCF B04).

### Server function `crearFactura`
1. Valida tenant + rol.
2. Toma siguiente NCF transaccionalmente (`UPDATE ... RETURNING` sobre `ncf_secuencias`).
3. Inserta factura + líneas.
4. Genera asiento automático:
   - Débito: Caja (contado) o CxC (crédito) por total.
   - Crédito: Ingresos por subtotal-descuento, ITBIS por Pagar por itbis.
5. Restricción `UNIQUE(tenant_id, ncf)` para bloquear duplicados.
6. Log a `logs_auditoria`.

Pantalla `/facturas/nueva`: cliente, NCF, condición, líneas dinámicas con cálculo en vivo (subtotal, descuento, ITBIS, total).

## Fase 5 — Dashboard y Reportes

- `/` dashboard: ventas del mes (gráfico), ITBIS por pagar estimado, CxC vencidas, últimos 10 NCF.
- `/reportes/606-607`: tabla de facturas agrupadas por tipo NCF con RNC cliente, subtotal, ITBIS, total y filtros de mes/año.

## Fase 6 — Auditoría y pulido

- `logs_auditoria`: user_id, tenant_id, accion, tabla_afectada, registro_id, detalles (jsonb), timestamp. Llenado desde server functions críticas.
- Vista `/auditoria` solo para Administrador.
- Toasts (sonner), loading states, validaciones zod en todos los formularios.
- Sidebar responsivo, navegación filtrada por rol.

## Detalles técnicos

- **Server functions** (`createServerFn` + `requireSupabaseAuth`) para: crear factura, registrar cobro, crear nota crédito, generar reportes. Nunca consultas sensibles desde loaders isomorfos.
- **NCF**: secuencia atómica con `UPDATE ncf_secuencias SET secuencia_actual = secuencia_actual + 1 WHERE ... RETURNING secuencia_actual`, formato `Bxx########` (10 dígitos).
- **RLS**: helpers `current_tenant_id()` (SECURITY DEFINER) leen el `tenant_id` del profile del `auth.uid()`.
- **UI**: layout `_authenticated` con sidebar, redirección a `/login` si no hay sesión.

## Entregable de este turno

Construyo Fases 1 a 5 completas y funcionales. Fase 6 (auditoría + pulido) se integra en paralelo con las anteriores (logs desde el inicio en las server functions, toasts en todas las pantallas).

## Próximo módulo sugerido (al terminar)

Recomendaré **Compras y Gastos** como siguiente módulo: cierra el ciclo contable (refleja el otro lado de los asientos), habilita el ITBIS adelantado (crédito fiscal real), y es prerrequisito directo para la exportación formal de los formatos **606** (compras) y **607** (ventas) de la DGII.
