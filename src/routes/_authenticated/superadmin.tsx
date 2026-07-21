import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney } from "@/lib/format";
import { Building2, Users, FileText, DollarSign, CheckCircle2, Pause, Briefcase } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/superadmin")({ component: SuperAdmin });

function SuperAdmin() {
  const auth = useAuth();
  const qc = useQueryClient();

  const { data: tenants } = useQuery({
    queryKey: ["sa-tenants"],
    enabled: auth.roles.includes("super_admin"),
    queryFn: async () => (await supabase.from("tenants").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: subs } = useQuery({
    queryKey: ["sa-subs"],
    enabled: auth.roles.includes("super_admin"),
    queryFn: async () => (await supabase.from("suscripciones").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: profiles } = useQuery({
    queryKey: ["sa-profiles"],
    enabled: auth.roles.includes("super_admin"),
    queryFn: async () => (await supabase.from("profiles").select("id, tenant_id, nombre, email, created_at")).data ?? [],
  });
  const { data: roles } = useQuery({
    queryKey: ["sa-roles"],
    enabled: auth.roles.includes("super_admin"),
    queryFn: async () => (await supabase.from("user_roles").select("user_id, tenant_id, role")).data ?? [],
  });
  const { data: facturas } = useQuery({
    queryKey: ["sa-facturas"],
    enabled: auth.roles.includes("super_admin"),
    queryFn: async () => (await supabase.from("facturas").select("tenant_id, total, fecha")).data ?? [],
  });

  if (auth.loading) return <div className="text-muted-foreground">Cargando…</div>;
  if (!auth.roles.includes("super_admin")) {
    return <div className="text-muted-foreground">Acceso restringido: solo super administradores.</div>;
  }

  const totalFacturado = (facturas ?? []).reduce((s, f: any) => s + Number(f.total ?? 0), 0);
  const byTenant = new Map<string, { count: number; total: number }>();
  (facturas ?? []).forEach((f: any) => {
    const r = byTenant.get(f.tenant_id) ?? { count: 0, total: 0 };
    r.count++; r.total += Number(f.total ?? 0);
    byTenant.set(f.tenant_id, r);
  });
  const usersByTenant = new Map<string, number>();
  (profiles ?? []).forEach((p: any) => usersByTenant.set(p.tenant_id, (usersByTenant.get(p.tenant_id) ?? 0) + 1));

  // Latest subscription per tenant
  const subByTenant = new Map<string, any>();
  (subs ?? []).forEach((s: any) => { if (!subByTenant.has(s.tenant_id)) subByTenant.set(s.tenant_id, s); });

  const toggleSub = async (sub: any, tenantId: string) => {
    if (!sub) return toast.error("Este tenant no tiene una suscripción registrada");
    const activa = sub.estado === "activa";
    const payload: any = activa
      ? { estado: "suspendida" }
      : {
          estado: "activa",
          fecha_inicio: sub.fecha_inicio ?? new Date().toISOString().slice(0, 10),
          fecha_termino: sub.fecha_termino ?? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          activado_at: new Date().toISOString(),
          activado_por: auth.user?.id,
        };
    const { error } = await supabase.from("suscripciones").update(payload).eq("id", sub.id);
    if (error) return toast.error(error.message);
    toast.success(activa ? "Suscripción suspendida" : "Suscripción activada");
    qc.invalidateQueries({ queryKey: ["sa-subs"] });
    qc.invalidateQueries({ queryKey: ["sa-subs-pendientes-count"] });
  };

  const toggleNomina = async (sub: any) => {
    if (!sub) return toast.error("Este tenant no tiene una suscripción registrada");
    const activa = sub.nomina_estado === "activa";
    const payload: any = activa
      ? { nomina_estado: "suspendida" }
      : {
          nomina_estado: "activa",
          incluye_nomina: true,
          nomina_fecha_inicio: sub.nomina_fecha_inicio ?? new Date().toISOString().slice(0, 10),
          nomina_fecha_termino: sub.nomina_fecha_termino ?? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          nomina_activado_at: new Date().toISOString(),
          nomina_activado_por: auth.user?.id,
        };
    const { error } = await supabase.from("suscripciones").update(payload).eq("id", sub.id);
    if (error) return toast.error(error.message);
    toast.success(activa ? "Nómina pausada" : "Nómina activada");
    qc.invalidateQueries({ queryKey: ["sa-subs"] });
  };

  return (
    <div>
      <PageHeader title="Panel Super Administrador" description="Vista global de toda la plataforma Balance Activo" />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat icon={Building2} label="Empresas" value={String(tenants?.length ?? 0)} />
        <Stat icon={Users} label="Usuarios" value={String(profiles?.length ?? 0)} />
        <Stat icon={FileText} label="Facturas emitidas" value={String(facturas?.length ?? 0)} />
        <Stat icon={DollarSign} label="Volumen total" value={fmtMoney(totalFacturado)} />
      </div>

      <Card className="p-0 overflow-x-auto mb-6">
        <div className="p-4 border-b border-border font-semibold">Empresas (tenants)</div>
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left p-3">Razón social</th>
              <th className="text-left p-3">RNC</th>
              <th className="text-left p-3">Régimen</th>
              <th className="text-right p-3">Usuarios</th>
              <th className="text-right p-3">Facturas</th>
              <th className="text-right p-3">Volumen</th>
              <th className="text-left p-3">Creada</th>
              <th className="text-right p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(tenants ?? []).map((t: any) => {
              const stats = byTenant.get(t.id) ?? { count: 0, total: 0 };
              const sub = subByTenant.get(t.id);
              const subActiva = sub?.estado === "activa";
              const nominaActiva = sub?.nomina_estado === "activa";
              return (
                <tr key={t.id} className="border-t border-border">
                  <td className="p-3 font-medium">{t.razon_social}</td>
                  <td className="p-3 font-mono text-xs">{t.rnc ?? "—"}</td>
                  <td className="p-3"><Badge variant="outline">{t.regimen_fiscal}</Badge></td>
                  <td className="p-3 text-right">{usersByTenant.get(t.id) ?? 0}</td>
                  <td className="p-3 text-right">{stats.count}</td>
                  <td className="p-3 text-right font-mono">{fmtMoney(stats.total)}</td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("es-DO")}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <div className="flex flex-wrap gap-1 justify-end">
                      <Button
                        size="sm"
                        variant={subActiva ? "destructive" : "default"}
                        disabled={!sub}
                        onClick={() => toggleSub(sub, t.id)}
                        title={!sub ? "Sin suscripción registrada" : subActiva ? "Suspender suscripción" : "Activar suscripción"}
                      >
                        {subActiva ? <><Pause className="h-3 w-3 mr-1" />Suspender</> : <><CheckCircle2 className="h-3 w-3 mr-1" />Activar</>}
                      </Button>
                      <Button
                        size="sm"
                        variant={nominaActiva ? "outline" : "secondary"}
                        disabled={!sub}
                        onClick={() => toggleNomina(sub)}
                        title={!sub ? "Sin suscripción registrada" : nominaActiva ? "Pausar nómina" : "Activar nómina"}
                      >
                        <Briefcase className="h-3 w-3 mr-1" />
                        {nominaActiva ? "Pausar nómina" : "Activar nómina"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card className="p-0 overflow-x-auto">
        <div className="p-4 border-b border-border font-semibold">Usuarios de la plataforma</div>
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left p-3">Nombre</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Empresa</th>
              <th className="text-left p-3">Roles</th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p: any) => {
              const tenant = (tenants ?? []).find((t: any) => t.id === p.tenant_id);
              const userRoles = (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role);
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3">{p.nombre}</td>
                  <td className="p-3 text-muted-foreground">{p.email}</td>
                  <td className="p-3">{tenant?.razon_social ?? "—"}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {userRoles.map((r: string) => (
                        <Badge key={r} variant={r === "super_admin" ? "default" : "secondary"}>{r.replace("_", " ")}</Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
      </div>
    </Card>
  );
}