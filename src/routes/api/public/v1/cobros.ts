import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticate, corsOptions, jsonError, jsonOk } from "@/lib/api-auth.server";
import { today } from "@/lib/format";

const createSchema = z.object({
  factura_id: z.string().uuid(),
  monto: z.number().positive(),
  metodo: z.enum(["transferencia", "deposito", "cheque", "efectivo"]),
  fecha: z.string().default(today),
  banco_id: z.string().uuid().optional().nullable(),
  nota: z.string().optional().nullable(),
});

export const Route = createFileRoute("/api/public/v1/cobros")({
  server: {
    handlers: {
      OPTIONS: async () => corsOptions(),
      GET: async ({ request }) => {
        const auth = await authenticate(request);
        if (auth instanceof Response) return auth;
        const url = new URL(request.url);
        const facturaId = url.searchParams.get("factura_id");
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
        const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
        const clienteId = url.searchParams.get("cliente_id");
        // cobros no tiene cliente_id: se filtra a través de la factura (inner join).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q = (supabaseAdmin as any)
          .from("cobros").select(clienteId ? "*, facturas!inner(cliente_id)" : "*", { count: "exact" })
          .eq("tenant_id", auth.tenantId)
          .order("fecha", { ascending: false })
          .range(offset, offset + limit - 1);
        if (facturaId) q = q.eq("factura_id", facturaId);
        if (clienteId) q = q.eq("facturas.cliente_id", clienteId);
        const { data, error, count } = await q;
        if (error) return jsonError(500, "db_error", error.message);
        // Se devuelve cada cobro sin el objeto anidado, con cliente_id plano.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = ((data ?? []) as any[]).map(({ facturas, ...c }) => (clienteId ? { ...c, cliente_id: facturas?.cliente_id ?? clienteId } : c));
        return jsonOk({ data: rows, count, limit, offset });
      },
      POST: async ({ request }) => {
        const auth = await authenticate(request);
        if (auth instanceof Response) return auth;
        let body: unknown;
        try { body = await request.json(); } catch { return jsonError(400, "invalid_json", "Body inválido"); }
        const parsed = createSchema.safeParse(body);
        if (!parsed.success) return jsonError(400, "validation", parsed.error.message);
        const p = parsed.data;
        const { data: cobroId, error } = await supabaseAdmin.rpc("registrar_cobro_api", {
          _tenant: auth.tenantId,
          _factura_id: p.factura_id,
          _monto: p.monto,
          _metodo: p.metodo,
          _fecha: p.fecha,
          _banco_id: p.banco_id ?? null,
          _nota: p.nota ?? null,
        } as never);
        if (error) return jsonError(400, "rpc_error", error.message);
        const { data: cobro } = await supabaseAdmin
          .from("cobros").select("*").eq("id", cobroId as unknown as string).single();
        return jsonOk({ data: cobro }, 201);
      },
    },
  },
});