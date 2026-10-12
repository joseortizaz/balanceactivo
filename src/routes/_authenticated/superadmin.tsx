import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { TwoFactorCard } from "@/components/TwoFactorCard";
import { fmtMoney, today } from "@/lib/format";
import { Building2, Users, FileText, DollarSign, CheckCircle2, Pause, Briefcase, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { infoCuentasAcceso, eliminarEmpresa } from "@/lib/superadmin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/superadmin")({ component: SuperAdmin });

function SuperAdmin() {
  const auth = useAuth();
  const qc = useQueryClient();
  const infoFn = useServerFn(infoCuentasAcceso);
  const eliminarFn = useServerFn(eliminarEmpresa);
  const [aEliminar, setAEliminar] = useState<any | null>(null);
  const [eliminando, setEliminando] = useState(false);

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
  const { data: cuentas } = useQuery({
    queryKey: ["sa-cuentas-acceso"],
    enabled: auth.roles.includes("super_admin"),
    queryFn: () => infoFn(),
  });
  const { data: actividad } = useQuery({
    queryKey: ["sa-actividad"],
    enabled: auth.roles.includes("super_admin"),
    queryFn: async () =>
      (await supabase.from("logs_auditoria").select("id, accion, detalles, created_at, tenant_id")
        .in("accion", ["registro_empresa", "empresa_eliminada", "miembro_agregado"])
        .order("created_at", { ascending: false }).limit(40)).data ?? [],
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

  const confirmarEliminar = async () => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await eliminarFn({ data: { tenantId: aEliminar.id, motivo: "Eliminada por el super administrador desde el panel" } });
      toast.success("Empresa eliminada");
      setAEliminar(null);
      ["sa-tenants", "sa-profiles", "sa-roles", "sa-subs", "sa-cuentas-acceso", "sa-actividad"]
        .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo eliminar");
    } finally {
      setEliminando(false);
    }
  };

  const toggleSub = async (sub: any, tenantId: string) => {
    if (!sub) return toast.error("Este tenant no tiene una suscripción registrada");
    const activa = sub.estado === "activa";
    const payload: any = activa
      ? { estado: "suspendida" }
      : {
          estado: "activa",
          fecha_inicio: sub.fecha_inicio ?? today(),
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
          nomina_fecha_inicio: sub.nomina_fecha_inicio ?? today(),
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
      <PageHeader title="Panel Super Administrador" description="Vista global de toda la plataforma IngreSaaS" />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat icon={Building2} label="Empresas" value={String(tenants?.length ?? 0)} />
        <Stat icon={Users} label="Usuarios" value={String(profiles?.length ?? 0)} />
        <Stat icon={FileText} label="Facturas emitidas" value={String(facturas?.length ?? 0)} />
        <Stat icon={DollarSign} label="Volumen total" value={fmtMoney(totalFacturado)} />
      </div>

      <div className="mb-6">
        <TwoFactorCard />
      </div>

      <Card className="p-0 overflow-x-auto mb-6">
        <div className="p-4 border-b border-border font-semibold">Empresas (tenants)</div>
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left p-3">Razón social</th>
              <th className="text-left p-3">Correo / registro</th>
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
              const correos = (profiles ?? []).filter((p: any) => p.tenant_id === t.id).map((p: any) => p.email).filter(Boolean);
              const correoMostrar = correos.length ? correos : t.email_registro ? [t.email_registro] : [];
              const esPlataforma = t.origen === "plataforma";
              const acceso = correoMostrar.map((c: string) => cuentas?.[c.toLowerCase()]).find(Boolean);
              const sinDatos = stats.count === 0;
              return (
                <tr key={t.id} className="border-t border-border">
                  <td className="p-3 font-medium">{t.razon_social}</td>
                  <td className="p-3 text-xs">
                    {correoMostrar.length ? correoMostrar.map((c: string) => <div key={c}>{c}</div>) : <span className="text-muted-foreground">sin dato (cuenta ya eliminada)</span>}
                    <div className="text-muted-foreground">
                      {t.origen === "invitacion" ? "agregado por una empresa" : t.origen === "plataforma" ? "plataforma" : "auto-registro"}
                      {acceso ? ` · ${acceso.confirmada ? "correo confirmado" : "correo sin confirmar"} · ${acceso.ultimoIngreso ? "último ingreso " + new Date(acceso.ultimoIngreso).toLocaleDateString("es-DO") : "nunca ingresó"}` : ""}
                    </div>
                  </td>
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
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        disabled={esPlataforma || !sinDatos}
                        onClick={() => setAEliminar({ ...t, correos: correoMostrar })}
                        title={esPlataforma ? "Empresa de la plataforma" : !sinDatos ? "Tiene facturas: no se puede eliminar" : "Eliminar empresa"}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card className="p-0 overflow-x-auto mb-6">
        <div className="p-4 border-b border-border font-semibold">Registros y eliminaciones de empresas</div>
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left p-3">Fecha</th>
              <th className="text-left p-3">Evento</th>
              <th className="text-left p-3">Correo</th>
              <th className="text-left p-3">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {(actividad ?? []).map((a: any) => {
              const d = a.detalles ?? {};
              const evento = a.accion === "registro_empresa" ? "Empresa registrada" : a.accion === "empresa_eliminada" ? "Empresa eliminada" : "Miembro agregado";
              const correo = d.email ?? d.email_registro ?? (d.correos_eliminados ?? []).join(", ");
              return (
                <tr key={a.id} className="border-t border-border">
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(a.created_at).toLocaleString("es-DO")}</td>
                  <td className="p-3"><Badge variant={a.accion === "empresa_eliminada" ? "destructive" : "secondary"}>{evento}</Badge></td>
                  <td className="p-3">{correo || "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{d.razon_social ?? ""}{d.reconstruido ? " (reconstruido)" : ""}{d.motivo ? ` · ${d.motivo}` : ""}</td>
                </tr>
              );
            })}
            {(actividad ?? []).length === 0 && (
              <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Sin registros</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <AlertDialog open={!!aEliminar} onOpenChange={(o) => !o && !eliminando && setAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{aEliminar?.razon_social}»
              {aEliminar?.correos?.length ? ` y las cuentas de acceso ${aEliminar.correos.join(", ")}` : ""}.
              Esta acción no se puede deshacer y queda registrada en la auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={eliminando} onClick={(e) => { e.preventDefault(); confirmarEliminar(); }}>
              {eliminando ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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