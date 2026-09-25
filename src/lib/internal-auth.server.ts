// Autenticación para rutas de servidor internas (llamadas desde la propia
// app autenticada con la sesión del usuario), a diferencia de
// src/lib/api-auth.server.ts que autentica la API pública con API keys.
//
// El navegador manda el access token de la sesión de Supabase (el mismo
// que usa supabase-js internamente, obtenible con
// `(await supabase.auth.getSession()).data.session?.access_token`) en el
// header Authorization. Aquí se valida ese token con el service role y se
// resuelve el tenant y el rol del usuario.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { jsonError } from "@/lib/api-auth.server";

export type InternalUserContext = { userId: string; tenantId: string };

export async function authenticateUser(request: Request): Promise<InternalUserContext | Response> {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return jsonError(401, "unauthorized", "Falta el token de sesión");
  const token = match[1].trim();

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) return jsonError(401, "invalid_session", "Sesión inválida o expirada");
  const userId = userData.user.id;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle();
  if (profileError || !profile?.tenant_id) return jsonError(403, "no_tenant", "El usuario no pertenece a ningún tenant");

  return { userId, tenantId: profile.tenant_id as string };
}

/**
 * Requiere además que el usuario tenga el rol 'administrador' en su tenant.
 *
 * Nota: no se usa la función has_role(_user_id, _role) de Postgres aquí a
 * propósito. Esa función filtra internamente por
 * `tenant_id = current_tenant_id()`, y current_tenant_id() se resuelve a
 * partir de auth.uid() -- que es NULL cuando se llama con el cliente
 * service_role (sin sesión de usuario), como es el caso de supabaseAdmin.
 * Eso haría que has_role() devuelva siempre false sin importar el rol real.
 * Se consulta user_roles directamente, con el tenantId ya resuelto arriba.
 */
export async function requireAdmin(request: Request): Promise<InternalUserContext | Response> {
  const ctx = await authenticateUser(request);
  if (ctx instanceof Response) return ctx;
  const { data: roleRow, error } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("tenant_id", ctx.tenantId)
    .eq("role", "administrador")
    .maybeSingle();
  if (error) return jsonError(500, "role_check_error", error.message);
  if (!roleRow) return jsonError(403, "forbidden", "Requiere rol administrador");
  return ctx;
}
