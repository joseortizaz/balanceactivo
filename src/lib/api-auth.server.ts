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

export async function authenticate(request: Request): Promise<ApiContext | Response> {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return jsonError(401, "unauthorized", "Missing Bearer token");
  const token = match[1].trim();
  const { data, error } = await supabaseAdmin.rpc("verify_api_key", { _token: token });
  if (error) return jsonError(500, "auth_error", error.message);
  if (!data) return jsonError(401, "invalid_token", "API key inválida o revocada");
  return { tenantId: data as string };
}

/** Generate a new token pair (token to give to user, hash to store). */
export function generateApiKey(): { token: string; hash: string; prefix: string } {
  const raw = randomBytes(24).toString("base64url");
  const token = `ba_live_${raw}`;
  const hash = createHash("sha256").update(token).digest("hex");
  return { token, hash, prefix: token.slice(0, 16) };
}