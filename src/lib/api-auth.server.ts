import { createHash, randomBytes } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ApiContext = { tenantId: string };

export function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
    },
  });
}

export function jsonOk(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
    },
  });
}

export function corsOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "access-control-allow-headers": "authorization,content-type",
      "access-control-max-age": "86400",
    },
  });
}

// Límite por defecto de la API pública: 120 requests por minuto por tenant.
// Generoso para uso normal, suficiente para frenar abuso/loops accidentales.
const RATE_LIMIT_MAX_REQUESTS = 120;
const RATE_LIMIT_WINDOW_SECONDS = 60;

export async function authenticate(request: Request): Promise<ApiContext | Response> {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return jsonError(401, "unauthorized", "Missing Bearer token");
  const token = match[1].trim();
  const { data, error } = await supabaseAdmin.rpc("verify_api_key", { _token: token });
  if (error) return jsonError(500, "auth_error", error.message);
  if (!data) return jsonError(401, "invalid_token", "API key inválida o revocada");
  const tenantId = data as string;

  const { data: allowed, error: rlError } = await (supabaseAdmin.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: boolean | null; error: { message: string } | null }>)("check_api_rate_limit", {
    _tenant_id: tenantId,
    _max_requests: RATE_LIMIT_MAX_REQUESTS,
    _window_seconds: RATE_LIMIT_WINDOW_SECONDS,
  });
  // Si el chequeo de rate limit falla por error de infraestructura, no bloqueamos
  // la request (fail-open) para no tumbar la API por un problema no relacionado.
  if (!rlError && allowed === false) {
    return jsonError(429, "rate_limited", "Demasiadas solicitudes. Intenta de nuevo en unos segundos.");
  }

  return { tenantId };
}

/** Generate a new token pair (token to give to user, hash to store). */
export function generateApiKey(): { token: string; hash: string; prefix: string } {
  const raw = randomBytes(24).toString("base64url");
  const token = `ba_live_${raw}`;
  const hash = createHash("sha256").update(token).digest("hex");
  return { token, hash, prefix: token.slice(0, 16) };
}