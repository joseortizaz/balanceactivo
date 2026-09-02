import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticate, corsOptions, jsonError, jsonOk } from "@/lib/api-auth.server";

const patchSchema = z.object({
  razon_social: z.string().min(1).optional(),
  nombre_comercial: z.string().optional().nullable(),
  documento: z.string().min(1).optional(),
  tipo_documento: z.enum(["rnc_empresa", "rnc_persona", "cedula"]).optional(),
  email: z.string().email().optional().nullable(),
  telefono: z.string().optional().nullable(),
  telefono_secundario: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  provincia: z.string().optional().nullable(),
  activo: z.boolean().optional(),
});

export const Route = createFileRoute("/api/public/v1/clientes/$id")({
  server: {
    handlers: {
      OPTIONS: async () => corsOptions(),
      GET: async ({ request, params }) => {
        const auth = await authenticate(request);
        if (auth instanceof Response) return auth;
        const { data, error } = await supabaseAdmin
          .from("clientes").select("*").eq("tenant_id", auth.tenantId).eq("id", params.id).maybeSingle();
        if (error) return jsonError(500, "db_error", error.message);
        if (!data) return jsonError(404, "not_found", "Cliente no encontrado");
        return jsonOk({ data });
      },
      PATCH: async ({ request, params }) => {
        const auth = await authenticate(request);
        if (auth instanceof Response) return auth;
        let body: unknown;
        try { body = await request.json(); } catch { return jsonError(400, "invalid_json", "Body inválido"); }
        const parsed = patchSchema.safeParse(body);
        if (!parsed.success) return jsonError(400, "validation", parsed.error.message);
        const { data, error } = await supabaseAdmin
          .from("clientes").update(parsed.data)
          .eq("tenant_id", auth.tenantId).eq("id", params.id)
          .select().single();
        if (error) return jsonError(400, "db_error", error.message);
        return jsonOk({ data });
      },
    },
  },
});