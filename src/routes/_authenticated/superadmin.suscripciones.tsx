import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { fmtMoney, fmtDate, today } from "@/lib/format";
import { ESTADO_LABEL, getPlan } from "@/lib/planes";
import { CheckCircle2, Pause, Search, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/superadmin/suscripciones")({ component: SuscripcionesAdmin });

type Susc = any;

function SuscripcionesAdmin() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [editing, setEditing] = useState<Susc | null>(null);
  const [accion, setAccion] = useState<"activar" | "suspender" | "editar" | null>(null);

  const { data: subs } = useQuery({
    queryKey: ["sa-subs"],
    enabled: auth.roles.includes("super_admin"),
    queryFn: async () => (await supabase.from("suscripciones" as any)
      .select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: tenants } = useQuery({
    queryKey: ["sa-tenants-min"],
    enabled: auth.roles.includes("super_admin"),
    queryFn: async () => (await supabase.from("tenants").select("id, razon_social, rnc")).data ?? [],
  });

  if (auth.loading) return <div className="text-muted-foreground">Cargando…</div>;
  if (!auth.roles.includes("super_admin")) {
    return <div className="text-muted-foreground">Acceso restringido: solo super administradores.</div>;
  }

  const tenantById = new Map((tenants ?? []).map((t: any) => [t.id, t]));
  const filtered = (subs ?? []).filter((s: Susc) => {
    const t = tenantById.get(s.tenant_id) as any;
    const matchQ = !q || (t?.razon_social ?? "").toLowerCase().includes(q.toLowerCase())
      || (t?.rnc ?? "").includes(q);
    const matchE = filtroEstado === "todos" || s.estado === filtroEstado;
    return matchQ && matchE;
  });

  const openAccion = (s: Susc, a: "activar" | "suspender" | "editar") => {
    setEditing({
      ...s,
      fecha_inicio: s.fecha_inicio ?? today(),
      fecha_termino: s.fecha_termino ?? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    });
    setAccion(a);
  };

  const guardar = async () => {
    if (!editing || !accion) return;
    let payload: any = { notas_admin: editing.notas_admin, referencia_pago: editing.referencia_pago };
    if (accion === "activar") {
      if (!editing.fecha_inicio || !editing.fecha_termino) return toast.error("Indica las fechas de inicio y término");
      payload = {
        ...payload,
        estado: "activa",
        fecha_inicio: editing.fecha_inicio,
        fecha_termino: editing.fecha_termino,
        activado_at: new Date().toISOString(),
        activado_by: auth.user?.id,
      };
    } else if (accion === "suspender") {
      payload = { ...payload, estado: "suspendida" };
    } else {
      payload = { ...payload, fecha_inicio: editing.fecha_inicio, fecha_termino: editing.fecha_termino, estado: editing.estado };
    }
    const { error } = await supabase.from("suscripciones" as any).update(payload).eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Suscripción actualizada");
    setEditing(null); setAccion(null);
    qc.invalidateQueries({ queryKey: ["sa-subs"] });
  };

  return (
    <div>
      <PageHeader title="Gestión de Suscripciones" description="Administra los planes, pagos y estados de cada empresa." />

      <Card className="p-3 mb-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por razón social o RNC…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="activa">Activa</option>
          <option value="vencida">Vencida</option>
          <option value="suspendida">Suspendida</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </Card>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left p-3">Empresa</th>
              <th className="text-left p-3">Plan</th>
              <th className="text-center p-3">Nómina</th>
              <th className="text-right p-3">Total</th>
              <th className="text-left p-3">Estado</th>
              <th className="text-left p-3">Vigencia</th>
              <th className="text-right p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s: Susc) => {
              const t = tenantById.get(s.tenant_id) as any;
              const est = ESTADO_LABEL[s.estado] ?? { label: s.estado, tone: "outline" as const };
              const plan = getPlan(s.plan);
              return (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="font-medium">{t?.razon_social ?? "—"}</div>
                    <div className="text-xs text-muted-foreground font-mono">{t?.rnc ?? ""}</div>
                  </td>
                  <td className="p-3">{plan.nombre}</td>
                  <td className="p-3 text-center">{s.incluye_nomina ? <Badge variant="secondary">Sí</Badge> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-3 text-right font-mono">{fmtMoney(s.precio_total)}</td>
                  <td className="p-3"><Badge variant={est.tone}>{est.label}</Badge></td>
                  <td className="p-3 text-xs">
                    {s.fecha_inicio ? (
                      <>{fmtDate(s.fecha_inicio)} → {s.fecha_termino ? fmtDate(s.fecha_termino) : "—"}</>
                    ) : <span className="text-muted-foreground">Sin activar</span>}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {s.estado !== "activa" && (
                      <Button size="sm" variant="default" className="mr-1" onClick={() => openAccion(s, "activar")}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Activar
                      </Button>
                    )}
                    {s.estado === "activa" && (
                      <Button size="sm" variant="destructive" className="mr-1" onClick={() => openAccion(s, "suspender")}>
                        <Pause className="h-3 w-3 mr-1" /> Suspender
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openAccion(s, "editar")}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Sin suscripciones</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && (setEditing(null), setAccion(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {accion === "activar" && "Activar suscripción"}
              {accion === "suspender" && "Suspender suscripción"}
              {accion === "editar" && "Editar suscripción"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                {(tenantById.get(editing.tenant_id) as any)?.razon_social} · Plan {getPlan(editing.plan).nombre} · {fmtMoney(editing.precio_total)}/mes
              </div>
              {(accion === "activar" || accion === "editar") && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Fecha de inicio *</Label>
                    <Input type="date" value={editing.fecha_inicio ?? ""} onChange={(e) => setEditing({ ...editing, fecha_inicio: e.target.value })} />
                  </div>
                  <div>
                    <Label>Fecha de término *</Label>
                    <Input type="date" value={editing.fecha_termino ?? ""} onChange={(e) => setEditing({ ...editing, fecha_termino: e.target.value })} />
                  </div>
                </div>
              )}
              <div>
                <Label>Referencia de transferencia</Label>
                <Input value={editing.referencia_pago ?? ""} onChange={(e) => setEditing({ ...editing, referencia_pago: e.target.value })} placeholder="No. de transferencia, banco…" />
              </div>
              <div>
                <Label>Notas internas</Label>
                <Textarea rows={3} value={editing.notas_admin ?? ""} onChange={(e) => setEditing({ ...editing, notas_admin: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditing(null); setAccion(null); }}>Cancelar</Button>
            <Button onClick={guardar}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}