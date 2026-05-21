import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { fmtDate, today } from "@/lib/format";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/nomina/ausencias")({ component: Ausencias });

const TIPOS = [
  { v: "vacaciones", l: "Vacaciones" },
  { v: "licencia_medica", l: "Licencia médica" },
  { v: "permiso", l: "Permiso" },
  { v: "maternidad", l: "Maternidad" },
  { v: "sin_goce", l: "Sin goce de sueldo" },
  { v: "otro", l: "Otro" },
];

function diff(a: string, b: string) {
  const d1 = new Date(a), d2 = new Date(b);
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
}

function Ausencias() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({
    empleado_id: "", tipo: "vacaciones", fecha_inicio: today(), fecha_fin: today(),
    con_goce: true, notas: "",
  });

  const { data: ausencias } = useQuery({
    queryKey: ["ausencias"],
    queryFn: async () => (await (supabase as any).from("ausencias")
      .select("*, empleados(nombres, apellidos, cedula)").order("fecha_inicio", { ascending: false })).data ?? [],
  });
  const { data: empleados } = useQuery({
    queryKey: ["empleados-activos"],
    queryFn: async () => (await (supabase as any).from("empleados").select("id, nombres, apellidos, cedula")
      .eq("estado", "activo").order("apellidos")).data ?? [],
  });

  const guardar = async () => {
    if (!f.empleado_id) return toast.error("Empleado requerido");
    const dias = diff(f.fecha_inicio, f.fecha_fin);
    const { error } = await (supabase as any).from("ausencias").insert({
      ...f, dias, tenant_id: auth.tenantId, created_by: auth.user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Ausencia registrada");
    qc.invalidateQueries({ queryKey: ["ausencias"] });
    setOpen(false);
  };

  return (
    <div>
      <PageHeader title="Ausencias"
        description="Vacaciones, licencias y permisos del personal"
        action={<div className="flex gap-2"><Link to="/nomina"><Button variant="outline" size="sm">Volver</Button></Link>
          <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Registrar</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Registrar ausencia</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Empleado</Label>
                  <Select value={f.empleado_id} onValueChange={(v) => setF({ ...f, empleado_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccione…" /></SelectTrigger>
                    <SelectContent>{(empleados ?? []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.apellidos}, {e.nombres}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Tipo</Label>
                  <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Desde</Label><Input type="date" value={f.fecha_inicio} onChange={(e) => setF({ ...f, fecha_inicio: e.target.value })} /></div>
                  <div><Label>Hasta</Label><Input type="date" value={f.fecha_fin} onChange={(e) => setF({ ...f, fecha_fin: e.target.value })} /></div>
                </div>
                <div className="flex items-center gap-2"><Switch checked={f.con_goce} onCheckedChange={(v) => setF({ ...f, con_goce: v })} /><Label>Con goce de sueldo</Label></div>
                <div><Label>Notas</Label><Textarea value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} /></div>
                <Button onClick={guardar} className="w-full">Guardar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>} />
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>
            <th className="text-left p-3">Empleado</th><th className="text-left p-3">Tipo</th>
            <th className="text-left p-3">Desde</th><th className="text-left p-3">Hasta</th>
            <th className="text-right p-3">Días</th><th className="text-left p-3">Goce</th><th className="text-left p-3">Notas</th>
          </tr></thead>
          <tbody>
            {(ausencias ?? []).map((a: any) => (
              <tr key={a.id} className="border-t border-border">
                <td className="p-3">{a.empleados?.apellidos}, {a.empleados?.nombres}</td>
                <td className="p-3 capitalize">{a.tipo.replace("_", " ")}</td>
                <td className="p-3 text-xs">{fmtDate(a.fecha_inicio)}</td>
                <td className="p-3 text-xs">{fmtDate(a.fecha_fin)}</td>
                <td className="p-3 text-right">{a.dias}</td>
                <td className="p-3">{a.con_goce ? "Sí" : "No"}</td>
                <td className="p-3 text-xs text-muted-foreground">{a.notas}</td>
              </tr>
            ))}
            {(!ausencias || ausencias.length === 0) && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No hay ausencias registradas.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}