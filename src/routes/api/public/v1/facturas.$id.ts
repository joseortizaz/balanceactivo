import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { FACTURA_CUOTAS_SELECT, conCuotas } from "@/lib/cuotas-api.server";
import { authenticate, corsOptions, jsonError, jsonOk } from "@/lib/api-auth.server";

export const Route = createFileRoute("/api/public/v1/facturas/$id")({
  server: {
    handlers: {
      OPTIONS: async () => corsOptions(),
      GET: async ({ request, params }) => {
        const auth = await authenticate(request);
        if (auth instanceof Response) return auth;
        const { data, error } = await supabaseAdmin
          .from("facturas")
          .select(`*, factura_lineas(*), cobros(*), ${FACTURA_CUOTAS_SELECT}`)
          .eq("tenant_id", auth.tenantId).eq("id", params.id).maybeSingle();
        if (error) return jsonError(500, "db_error", error.message);
        if (!data) return jsonError(404, "not_found", "Factura no encontrada");
        return jsonOk({ data: conCuotas(data as unknown) });
      },
    },
  },
});