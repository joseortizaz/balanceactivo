# Balance Activo — API Pública v1

Integración HTTP/JSON para aplicaciones externas (ej. Ceapsi).

---

## 1. URL base

| Entorno | URL |
|---|---|
| Producción | `https://balanceactivo.net/api/public/v1` |
| Producción (alt) | `https://balanceactivo.lovable.app/api/public/v1` |
| Preview | `https://project--fd5ba69f-1ae5-4505-a8fa-786750433868-dev.lovable.app/api/public/v1` |

Todas las respuestas son JSON. CORS habilitado (`Access-Control-Allow-Origin: *`).

---

## 2. Autenticación

Header obligatorio en cada request:

```
Authorization: Bearer ba_live_XXXXXXXXXXXXXXXXXXXXXXXX
```

### Cómo obtener la key
1. Iniciar sesión en Balance Activo como **administrador**.
2. Menú lateral → **API & Webhooks**.
3. **Crear API Key** → copiar el token (se muestra **una sola vez**).
4. Cada key pertenece a **un único tenant**; todas las llamadas operan sobre los datos de esa empresa.

Puedes revocarla en cualquier momento desde la misma pantalla.

### Errores

| Status | code | Significado |
|---|---|---|
| 401 | `unauthorized` | Falta header `Authorization` |
| 401 | `invalid_token` | Token inválido o revocado |
| 400 | `validation` | Body no cumple el schema |
| 400 | `rpc_error` | Regla de negocio rechazó la operación |
| 404 | `not_found` | Recurso no existe en el tenant |
| 500 | `db_error` | Error interno |

Formato:
```json
{ "error": { "code": "validation", "message": "cliente_id is required" } }
```

---

## 3. Endpoints

### 3.1 `GET /me`
Verifica la conexión y devuelve datos del tenant.

```json
{ "data": { "tenant_id": "uuid", "razon_social": "Mi Empresa SRL", "rnc": "130123456" } }
```

---

### 3.2 Clientes

**`GET /clientes`** — query: `limit` (max 200), `offset`, `search`.

**`POST /clientes`**
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "telefono": "8091234567",
  "tipo_documento": "cedula",
  "documento": "00112345678",
  "direccion": "Calle X #10"
}
```
`tipo_documento`: `"rnc_empresa" | "rnc_persona" | "cedula"`

**`GET /clientes/:id`** · **`PATCH /clientes/:id`**

---

### 3.3 Facturas

**`GET /facturas`** — query: `limit`, `offset`, `cliente_id`, `estado`, `desde`, `hasta`.

**`POST /facturas`** — crea factura + líneas (+ cuotas si es a crédito). Genera NCF automáticamente.

```json
{
  "cliente_id": "uuid",
  "tipo_ncf": "b02",
  "condicion_pago": "contado",
  "fecha": "2026-07-02",
  "tipo_descuento": "monto",
  "descuento_valor": 0,
  "lineas": [
    {
      "producto_id": "uuid-opcional",
      "descripcion": "Curso Nivel 1",
      "cantidad": 1,
      "precio": 5000,
      "tasa_itbis": 18
    }
  ],
  "cuotas": [
    { "fecha": "2026-08-02", "monto": 2950 },
    { "fecha": "2026-09-02", "monto": 2950 }
  ]
}
```

- `tipo_ncf`: `b01` crédito fiscal · `b02` consumo · `b14` régimen especial · `b15` gubernamental
- `condicion_pago`: `"contado" | "credito"`
- `producto_id` opcional: si se envía y el producto controla inventario, se descuenta stock.

Respuesta `201`:
```json
{
  "data": {
    "id": "uuid",
    "ncf": "B0200000123",
    "total": 5900,
    "estado": "pendiente",
    "factura_lineas": [ { "..." : "..." } ]
  }
}
```

**`GET /facturas/:id`** — devuelve factura con `factura_lineas` y `cobros`.

---

### 3.4 Cobros

**`GET /cobros`** — query: `limit`, `offset`, `factura_id`.

**`POST /cobros`** — registra pago; actualiza estado (`parcial` → `pagada`) y genera recibo.

```json
{
  "factura_id": "uuid",
  "monto": 2950,
  "metodo": "transferencia",
  "fecha": "2026-07-02",
  "banco_id": "uuid-opcional",
  "nota": "Primer pago"
}
```

`metodo`: `"transferencia" | "deposito" | "cheque" | "efectivo"`

---

## 4. Webhooks

Balance Activo envía eventos por HTTP POST a la URL que registres.

### 4.1 Configurar
**API & Webhooks → Crear webhook**. Ingresa URL, elige eventos y guarda el **secret HMAC** (se muestra una sola vez).

### 4.2 Eventos
- `cliente.created`, `cliente.updated`
- `factura.created`, `factura.updated`, `factura.paid`
- `cobro.created`

### 4.3 Formato

```http
POST https://tu-app.com/webhooks/ba
Content-Type: application/json
X-BA-Event: factura.paid
X-BA-Signature: sha256=<hmac_hex>

{
  "event": "factura.paid",
  "delivery_id": "uuid",
  "data": {
    "id": "uuid-factura",
    "cliente_id": "uuid",
    "total": 5900,
    "estado": "pagada"
  }
}
```

### 4.4 Verificar la firma

HMAC-SHA256 sobre el **body crudo** con el secret del endpoint.

```ts
import { createHmac, timingSafeEqual } from "crypto";

function verify(rawBody: string, header: string | null, secret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const received = Buffer.from(header.slice(7), "hex");
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  return received.length === expected.length && timingSafeEqual(received, expected);
}
```

### 4.5 Reintentos
- **Éxito**: cualquier respuesta HTTP `2xx`.
- **Reintentos**: backoff exponencial (~60s, 120s, 240s, 480s, 960s) hasta **5 intentos**.
- Responde en < 5s; encola el trabajo pesado. Usa `delivery_id` como clave de **idempotencia**.

---

## 5. Ejemplo end-to-end

```bash
BASE="https://balanceactivo.net/api/public/v1"
KEY="ba_live_xxx"

# 1. Crear cliente
CLIENTE=$(curl -s -X POST "$BASE/clientes" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"nombre":"Alumno Uno","email":"alumno@example.com","tipo_documento":"cedula","documento":"00112345678"}')
CID=$(echo "$CLIENTE" | jq -r .data.id)

# 2. Crear factura al contado
FACTURA=$(curl -s -X POST "$BASE/facturas" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d "{\"cliente_id\":\"$CID\",\"tipo_ncf\":\"b02\",\"condicion_pago\":\"contado\",\"lineas\":[{\"descripcion\":\"Matrícula\",\"cantidad\":1,\"precio\":5000,\"tasa_itbis\":18}]}")
FID=$(echo "$FACTURA" | jq -r .data.id)

# 3. Registrar cobro total
curl -s -X POST "$BASE/cobros" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d "{\"factura_id\":\"$FID\",\"monto\":5900,\"metodo\":\"transferencia\",\"nota\":\"Pago matrícula\"}"
```

---

## 6. Buenas prácticas

- La API key va **solo en el backend** de Ceapsi. Nunca en frontend.
- Guarda los `id` que devuelve BA para poder cruzar datos después.
- Trata `delivery_id` como clave de idempotencia en el receptor de webhooks.
- Rota la key ante sospecha de exposición (revocar + crear nueva).
- Usa paginación (`limit` + `offset`) en vez de traerlo todo de una vez.

---

## 7. Soporte
Si Ceapsi necesita endpoints extra (productos, reportes, notas de crédito, etc.) los agregamos a v1 bajo demanda.
