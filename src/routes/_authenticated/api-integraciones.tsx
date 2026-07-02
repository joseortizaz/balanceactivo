import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { createApiKey, createWebhookEndpoint } from "@/lib/api-keys.functions";

const EVENTS = [
  "cliente.created", "cliente.updated",
  "factura.created", "factura.updated", "factura.paid",
  "cobro.created",
];

export const Route = createFileRoute("/_authenticated/api-integraciones")({ component: ApiIntegraciones });

function ApiIntegraciones() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(EVENTS);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  const { data: keys } = useQuery({
    queryKey: ["api_keys", auth.tenantId],
    enabled: !!auth.tenantId,
    queryFn: async () =>
      (await (supabase as unknown as { from: (t: string) => { select: (c: string) => { order: (col: string, opts: { ascending: boolean }) => Promise<{ data: unknown[] | null }> } } })
        .from("api_keys").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: hooks } = useQuery({
    queryKey: ["webhook_endpoints", auth.tenantId],
    enabled: !!auth.tenantId,
    queryFn: async () =>
      (await (supabase as unknown as { from: (t: string) => { select: (c: string) => { order: (col: string, opts: { ascending: boolean }) => Promise<{ data: unknown[] | null }> } } })
        .from("webhook_endpoints").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const createKey = useMutation({
    mutationFn: async () => await createApiKey({ data: { name: newKeyName } }),
    onSuccess: (res) => {
      setRevealedToken(res.token);
      setNewKeyName("");
      qc.invalidateQueries({ queryKey: ["api_keys"] });
      toast.success("API key creada. Cópiala ahora, no se mostrará de nuevo.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeKey = async (id: string) => {
    const { error } = await (supabase as unknown as { from: (t: string) => { update: (v: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } } })
      .from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["api_keys"] });
    toast.success("API key revocada");
  };

  const createHook = useMutation({
    mutationFn: async () =>
      await createWebhookEndpoint({ data: { url: webhookUrl, events: selectedEvents } }),
    onSuccess: (res) => {
      setRevealedSecret(res.secret);
      setWebhookUrl("");
      qc.invalidateQueries({ queryKey: ["webhook_endpoints"] });
      toast.success("Webhook creado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleHook = async (id: string, active: boolean) => {
    const { error } = await (supabase as unknown as { from: (t: string) => { update: (v: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } } })
      .from("webhook_endpoints").update({ active: !active }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["webhook_endpoints"] });
  };

  if (!auth.hasRole("administrador")) {
    return <div className="text-muted-foreground">Solo el administrador puede ver esta sección.</div>;
  }

  return (
    <div>
      <PageHeader title="API & Webhooks" description="Integra Balance Activo con aplicaciones externas" />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="font-semibold mb-1">API Keys</h2>
          <p className="text-sm text-muted-foreground mb-4">Usa estas claves como <code className="text-xs">Authorization: Bearer &lt;token&gt;</code>.</p>
          <div className="flex gap-2 mb-4">
            <Label htmlFor="key-name" className="sr-only">Nombre</Label>
            <Input id="key-name" placeholder="Nombre (ej. Ceapsi)" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
            <Button onClick={() => createKey.mutate()} disabled={!newKeyName || createKey.isPending}>Crear</Button>
          </div>
          {revealedToken && (
            <div className="rounded-md border border-primary/50 bg-primary/5 p-3 mb-4">
              <div className="text-xs font-semibold mb-1">Copia este token ahora (no se mostrará de nuevo):</div>
              <div className="flex gap-2">
                <Input readOnly value={revealedToken} className="font-mono text-xs" />
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(revealedToken); toast.success("Copiado"); }}>Copiar</Button>
                <Button size="sm" variant="ghost" onClick={() => setRevealedToken(null)}>Cerrar</Button>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {(keys as Array<{ id: string; name: string; key_prefix: string; created_at: string; revoked_at: string | null; last_used_at: string | null }> | undefined ?? []).map((k) => (
              <div key={k.id} className="flex items-center justify-between border border-border rounded-md p-3">
                <div>
                  <div className="font-medium">{k.name} {k.revoked_at && <Badge variant="secondary" className="ml-2">Revocada</Badge>}</div>
                  <div className="text-xs text-muted-foreground font-mono">{k.key_prefix}…</div>
                  <div className="text-xs text-muted-foreground">Último uso: {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "nunca"}</div>
                </div>
                {!k.revoked_at && <Button size="sm" variant="ghost" onClick={() => revokeKey(k.id)}>Revocar</Button>}
              </div>
            ))}
            {(!keys || (keys as unknown[]).length === 0) && <div className="text-sm text-muted-foreground">Aún no has creado API keys.</div>}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-1">Webhooks</h2>
          <p className="text-sm text-muted-foreground mb-4">Recibe eventos en tiempo real. Cada request se firma con <code className="text-xs">X-BA-Signature: sha256=&lt;hmac&gt;</code>.</p>
          <div className="space-y-2 mb-3">
            <Label htmlFor="hook-url">URL destino</Label>
            <Input id="hook-url" placeholder="https://ceapsi.example.com/webhooks/ba" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
            <div>
              <Label className="text-xs">Eventos</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {EVENTS.map((ev) => {
                  const on = selectedEvents.includes(ev);
                  return (
                    <button key={ev} type="button"
                      onClick={() => setSelectedEvents((s) => on ? s.filter((e) => e !== ev) : [...s, ev])}
                      className={`text-xs px-2 py-1 rounded-md border ${on ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
                    >{ev}</button>
                  );
                })}
              </div>
            </div>
            <Button onClick={() => createHook.mutate()} disabled={!webhookUrl || selectedEvents.length === 0 || createHook.isPending} className="w-full">Crear webhook</Button>
          </div>
          {revealedSecret && (
            <div className="rounded-md border border-primary/50 bg-primary/5 p-3 mb-4">
              <div className="text-xs font-semibold mb-1">Secret HMAC (guárdalo, no se mostrará de nuevo):</div>
              <div className="flex gap-2">
                <Input readOnly value={revealedSecret} className="font-mono text-xs" />
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(revealedSecret); toast.success("Copiado"); }}>Copiar</Button>
                <Button size="sm" variant="ghost" onClick={() => setRevealedSecret(null)}>Cerrar</Button>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {(hooks as Array<{ id: string; url: string; active: boolean; events: string[] }> | undefined ?? []).map((h) => (
              <div key={h.id} className="border border-border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-sm break-all">{h.url}</div>
                  <Button size="sm" variant="ghost" onClick={() => toggleHook(h.id, h.active)}>{h.active ? "Desactivar" : "Activar"}</Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {h.events.map((e) => <Badge key={e} variant="outline" className="text-xs">{e}</Badge>)}
                </div>
              </div>
            ))}
            {(!hooks || (hooks as unknown[]).length === 0) && <div className="text-sm text-muted-foreground">Aún no has creado webhooks.</div>}
          </div>
        </Card>
      </div>

      <Card className="p-5 mt-4">
        <h2 className="font-semibold mb-2">Documentación rápida</h2>
        <div className="text-sm space-y-2 text-muted-foreground">
          <p><strong>Base URL:</strong> <code>{typeof window !== "undefined" ? window.location.origin : ""}/api/public/v1</code></p>
          <p><strong>Autenticación:</strong> <code>Authorization: Bearer ba_live_…</code></p>
          <p><strong>Endpoints:</strong></p>
          <ul className="list-disc pl-5 text-xs font-mono">
            <li>GET /me</li>
            <li>GET /clientes · POST /clientes · GET/PATCH /clientes/:id</li>
            <li>GET /facturas · POST /facturas · GET /facturas/:id</li>
            <li>GET /cobros · POST /cobros</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}