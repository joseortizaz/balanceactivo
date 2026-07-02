import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ name: z.string().min(1).max(80) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "administrador",
    });
    if (!isAdmin) throw new Error("Solo administradores pueden crear API keys");
    const { data: profile } = await context.supabase
      .from("profiles").select("tenant_id").eq("id", context.userId).single();
    if (!profile?.tenant_id) throw new Error("Sin tenant");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateApiKey } = await import("@/lib/api-auth.server");
    const { token, hash, prefix } = generateApiKey();
    const { error } = await supabaseAdmin.from("api_keys").insert({
      tenant_id: profile.tenant_id,
      name: data.name,
      key_prefix: prefix,
      key_hash: hash,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { token, prefix };
  });

export const createWebhookEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      url: z.string().url(),
      events: z.array(z.string()).min(1),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "administrador",
    });
    if (!isAdmin) throw new Error("Solo administradores");
    const { data: profile } = await context.supabase
      .from("profiles").select("tenant_id").eq("id", context.userId).single();
    if (!profile?.tenant_id) throw new Error("Sin tenant");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { randomBytes } = await import("crypto");
    const secret = `whsec_${randomBytes(24).toString("base64url")}`;
    const { data: row, error } = await supabaseAdmin.from("webhook_endpoints").insert({
      tenant_id: profile.tenant_id, url: data.url, events: data.events, secret,
    }).select("id, url, secret, events, active").single();
    if (error) throw new Error(error.message);
    return row;
  });