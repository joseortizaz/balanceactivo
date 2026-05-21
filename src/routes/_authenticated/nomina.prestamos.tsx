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
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney, fmtDate, today } from "@/lib/format";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/nomina/prestamos")({ component: Prestamos });

function Prestamos() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({
    empleado_id: "", fecha_inicio: today(), monto_original: 0, cuota: 0,
    descontar_en_nomina: true, notas: "",
  });

  const { data: prestamos } = useQuery({
    queryKey: ["prestamos"],
    queryFn: async () => (await (supabase as any).from("prestamos_empleado")
      .select("*, empleados(nombres, apellidos, cedula)").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: empleados } = useQuery({
    queryKey: ["empleados-activos"],
    queryFn: async () => (await (supabase as any).from("empleados").select("id, nombres, apellidos, cedula")
      .eq("estado", "activo").order("apellidos")).data ?? [],
  });

  const guardar = async () => {
    if (!f.empleado_id || Number(f.monto_original) <= 0) return toast.error("Empleado y monto requeridos");
    const { error } = await (supabase as any).from("prestamos_empleado").insert({
      ...f, monto_original: Number(f.monto_original), cuota: Number(f.cuota),
      saldo: Number(f.monto_original), tenant_id: auth.tenantId, created_by: auth.user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Préstamo registrado");
    qc.invalidateQueries({ queryKey: ["prestamos"] });
    setOpen(false);
    setF({ empleado_id: "", fecha_inicio: today(), monto_original: 0, cuota: 0, descontar_en_nomina: true, notas: "" });
  };

  const cancelar = async (id: string) => {
    const { error } = await (supabase as any).from("prestamos_empleado").update({ estado: "cancelado" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Préstamo cancelado");
    qc.invalidateQueries({ queryKey: ["prestamos"] });
  };

  return (
    <div>
      <PageHeader title="Préstamos a empleados"
        description="Adelantos y préstamos que se descuentan automáticamente en cada nómina"
        action={<div className="flex gap-2"><Link to="/nomina"><Button variant="outline" size="sm">Volver</Button></Link>
          <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nuevo préstamo</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Nuevo préstamo</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Empleado</Label>
                  <Select value={f.empleado_id} onValueChange={(v) => setF({ ...f, empleado_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccione…" /></SelectTrigger>
                    <SelectContent>{(empleados ?? []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.apellidos}, {e.nombres}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Fecha</Label><Input type="date" value={f.fecha_inicio} onChange={(e) => setF({ ...f, fecha_inicio: e.target.value })} /></div>
                  <div><Label>Monto total</Label><Input type="number" step="0.01" value={f.monto_original} onChange={(e) => setF({ ...f, monto_original: e.target.value })} /></div>
                  <div><Label>Cuota mensual</Label><Input type="number" step="0.01" value={f.cuota} onChange={(e) => setF({ ...f, cuota: e.target.value })} /></div>
                </div>
                <div className="flex items-center gap-2"><Switch checked={f.descontar_en_nomina} onCheckedChange={(v) => setF({ ...f, descontar_en_nomina: v })} /><Label>Descontar en nómina automáticamente</Label></div>
                <div><Label>Notas</Label><Textarea value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} /></div>
                <Button onClick={guardar} className="w-full">Guardar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>} />
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>
            <th className="text-left p-3">Empleado</th><th className="text-left p-3">Inicio</th>
            <th className="text-right p-3">Monto</th><th className="text-right p-3">Saldo</th>
            <th className="text-right p-3">Cuota</th><th className="text-left p-3">Estado</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {(prestamos ?? []).map((p: any) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3">{p.empleados?.apellidos}, {p.empleados?.nombres}<div className="text-xs text-muted-foreground font-mono">{p.empleados?.cedula}</div></td>
                <td className="p-3 text-xs">{fmtDate(p.fecha_inicio)}</td>
                <td className="p-3 text-right">{fmtMoney(p.monto_original)}</td>
                <td className="p-3 text-right font-semibold">{fmtMoney(p.saldo)}</td>
                <td className="p-3 text-right">{fmtMoney(p.cuota)}{p.descontar_en_nomina && <div className="text-xs text-muted-foreground">auto</div>}</td>
                <td className="p-3"><Badge variant={p.estado === "activo" ? "default" : "secondary"}>{p.estado}</Badge></td>
                <td className="p-3 text-right">{p.estado === "activo" && <Button variant="ghost" size="sm" onClick={() => cancelar(p.id)}>Cancelar</Button>}</td>
              </tr>
            ))}
            {(!prestamos || prestamos.length === 0) && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No hay préstamos registrados.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}