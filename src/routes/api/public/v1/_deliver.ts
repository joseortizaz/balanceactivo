import { createFileRoute } from "@tanstack/react-router";
import { createHmac } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MAX_ATTEMPTS = 5;
const BATCH = 20;

function backoffSeconds(attempt: number): number {
  return Math.min(60 * 60, Math.pow(2, attempt) * 30);
}

export const Route = createFileRoute("/api/public/v1/_deliver")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? "";
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
        if (!expected || apikey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { data: pending, error } = await supabaseAdmin
          .from("webhook_deliveries")
          .select("*, webhook_endpoints!inner(url, secret, active)")
          .is("delivered_at", null)
          .lt("attempt", MAX_ATTEMPTS)
          .lte("next_retry_at", new Date().toISOString())
          .order("next_retry_at", { ascending: true })
          .limit(BATCH);
        if (error) return new Response(error.message, { status: 500 });

        const results: Array<{ id: string; status: number | null; ok: boolean }> = [];
        for (const d of (pending ?? []) as Array<{
          id: string; endpoint_id: string; event_type: string; payload: unknown; attempt: number;
          webhook_endpoints: { url: string; secret: string; active: boolean } | null;
        }>) {
          const ep = d.webhook_endpoints;
          if (!ep || !ep.active) {
            await supabaseAdmin.from("webhook_deliveries")
              .update({ delivered_at: new Date().toISOString(), last_error: "endpoint inactive" })
              .eq("id", d.id);
            continue;
          }
          const body = JSON.stringify({ event: d.event_type, data: d.payload, delivery_id: d.id });
          const sig = createHmac("sha256", ep.secret).update(body).digest("hex");
          try {
            const resp = await fetch(ep.url, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "x-ba-signature": `sha256=${sig}`,
                "x-ba-event": d.event_type,
              },
              body,
            });
            const text = (await resp.text()).slice(0, 4000);
            const ok = resp.status >= 200 && resp.status < 300;
            const attempt = d.attempt + 1;
            await supabaseAdmin.from("webhook_deliveries").update({
              status_code: resp.status,
              response_body: text,
              attempt,
              delivered_at: ok ? new Date().toISOString() : null,
              next_retry_at: ok
                ? new Date().toISOString()
                : new Date(Date.now() + backoffSeconds(attempt) * 1000).toISOString(),
              last_error: ok ? null : `HTTP ${resp.status}`,
            }).eq("id", d.id);
            results.push({ id: d.id, status: resp.status, ok });
          } catch (err) {
            const attempt = d.attempt + 1;
            await supabaseAdmin.from("webhook_deliveries").update({
              attempt,
              next_retry_at: new Date(Date.now() + backoffSeconds(attempt) * 1000).toISOString(),
              last_error: (err as Error).message.slice(0, 500),
            }).eq("id", d.id);
            results.push({ id: d.id, status: null, ok: false });
          }
        }

        return new Response(JSON.stringify({ processed: results.length, results }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});