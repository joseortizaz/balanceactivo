import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticate, corsOptions, jsonError, jsonOk } from "@/lib/api-auth.server";

const lineaSchema = z.object({
  producto_id: z.string().uuid().optional().nullable(),
  descripcion: z.string().min(1),
  cantidad: z.number().positive(),
  precio: z.number().nonnegative(),
  tasa_itbis: z.number().min(0).max(100).default(18),
});

const cuotaSchema = z.object({ fecha: z.string(), monto: z.number().positive() });

const createSchema = z.object({
  cliente_id: z.string().uuid(),
  tipo_ncf: z.enum(["b01", "b02", "b14", "b15"]),
  condicion_pago: z.enum(["contado", "credito"]).default("contado"),
  fecha: z.string().default(() => new Date().toISOString().slice(0, 10)),
  tipo_descuento: z.enum(["monto", "porcentaje"]).default("monto"),
  descuento_valor: z.number().nonnegative().default(0),
  lineas: z.array(lineaSchema).min(1),
  cuotas: z.array(cuotaSchema).optional().nullable(),
});

export const Route = createFileRoute("/api/public/v1/facturas")({
  server: {
    handlers: {
      OPTIONS: async () => corsOptions(),
      GET: async ({ request }) => {
        const auth = await authenticate(request);
        if (auth instanceof Response) return auth;
        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
        const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
        let q = supabaseAdmin
          .from("facturas")
          .select("*", { count: "exact" })
          .eq("tenant_id", auth.tenantId)
          .order("fecha", { ascending: false })
          .range(offset, offset + limit - 1);
        const clienteId = url.searchParams.get("cliente_id");
        const estado = url.searchParams.get("estado");
        const desde = url.searchParams.get("desde");
        const hasta = url.searchParams.get("hasta");
        if (clienteId) q = q.eq("cliente_id", clienteId);
        if (estado) q = q.eq("estado", estado as never);
        if (desde) q = q.gte("fecha", desde);
        if (hasta) q = q.lte("fecha", hasta);
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
        const p = parsed.data;
        const { data: facturaId, error } = await supabaseAdmin.rpc("crear_factura_api", {
          _tenant: auth.tenantId,
          _cliente_id: p.cliente_id,
          _tipo_ncf: p.tipo_ncf,
          _condicion: p.condicion_pago,
          _fecha: p.fecha,
          _tipo_descuento: p.tipo_descuento,
          _descuento_valor: p.descuento_valor,
          _lineas: p.lineas,
          _cuotas: p.cuotas ?? null,
        } as never);
        if (error) return jsonError(400, "rpc_error", error.message);
        const { data: factura } = await supabaseAdmin
          .from("facturas").select("*, factura_lineas(*)").eq("id", facturaId as unknown as string).single();
        return jsonOk({ data: factura }, 201);
      },
    },
  },
});