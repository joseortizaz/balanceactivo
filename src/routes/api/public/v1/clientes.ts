import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticate, corsOptions, jsonError, jsonOk } from "@/lib/api-auth.server";

const createSchema = z.object({
  razon_social: z.string().min(1),
  nombre_comercial: z.string().optional().nullable(),
  documento: z.string().min(1),
  tipo_documento: z.enum(["rnc_empresa", "rnc_persona", "cedula"]).default("rnc_empresa"),
  email: z.string().email().optional().nullable(),
  telefono: z.string().optional().nullable(),
  telefono_secundario: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  provincia: z.string().optional().nullable(),
});

export const Route = createFileRoute("/api/public/v1/clientes")({
  server: {
    handlers: {
      OPTIONS: async () => corsOptions(),
      GET: async ({ request }) => {
        const auth = await authenticate(request);
        if (auth instanceof Response) return auth;
        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
        const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
        const search = url.searchParams.get("search");
        let q = supabaseAdmin
          .from("clientes")
          .select("*", { count: "exact" })
          .eq("tenant_id", auth.tenantId)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        if (search) q = q.or(`razon_social.ilike.%${search}%,documento.ilike.%${search}%`);
        const { data, error, count } = await q;
        if (error) return jsonError(500, "db_error", error.message);
        return jsonOk({ data, count, limit, offset });
      },
      POST: async ({ request }) => {
        const auth = await authenticate(request);
        if (auth instanceof Response) return auth;
        let body: unknown;
        try { body = await request.json(); } catch { return jsonError(400, "invalid_json", "Body inválido"); }
        const parsed = createSchema.safeParse(body);
        if (!parsed.success) return jsonError(400, "validation", parsed.error.message);
        const { data, error } = await supabaseAdmin
          .from("clientes")
          .insert({ ...parsed.data, tenant_id: auth.tenantId })
          .select()
          .single();
        if (error) return jsonError(400, "db_error", error.message);
        return jsonOk({ data }, 201);
      },
    },
  },
});