import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticate, corsOptions, jsonError, jsonOk } from "@/lib/api-auth.server";

export const Route = createFileRoute("/api/public/v1/me")({
  server: {
    handlers: {
      OPTIONS: async () => corsOptions(),
      GET: async ({ request }) => {
        const auth = await authenticate(request);
        if (auth instanceof Response) return auth;
        const { data, error } = await supabaseAdmin
          .from("tenants")
          .select("id,razon_social,nombre_comercial,rnc,email")
          .eq("id", auth.tenantId)
          .maybeSingle();
        if (error) return jsonError(500, "db_error", error.message);
        return jsonOk({ tenant: data });
      },
    },
  },
});