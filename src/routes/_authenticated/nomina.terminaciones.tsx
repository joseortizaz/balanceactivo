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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { fmtMoney, fmtDate, today } from "@/lib/format";
import { Plus, Calculator } from "lucide-react";

export const Route = createFileRoute("/_authenticated/nomina/terminaciones")({ component: Term });

const MOTIVOS = [
  { v: "desahucio", l: "Desahucio (Art. 75)" },
  { v: "despido_justificado", l: "Despido justificado (Art. 88)" },
  { v: "dimision", l: "Dimisión (Art. 96)" },
  { v: "mutuo_acuerdo", l: "Mutuo acuerdo" },
  { v: "otro", l: "Otro" },
];

function Term() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [calc, setCalc] = useState<any>(null);
  const [f, setF] = useState<any>({
    empleado_id: "", motivo: "desahucio", fecha_salida: today(), otros: 0, notas: "",
  });

  const { data: term } = useQuery({
    queryKey: ["terminaciones"],
    queryFn: async () => (await (supabase as any).from("terminaciones")
      .select("*, empleados(nombres, apellidos, cedula)").order("fecha_salida", { ascending: false })).data ?? [],
  });
  const { data: empleados } = useQuery({
    queryKey: ["empleados-activos"],
    queryFn: async () => (await (supabase as any).from("empleados").select("id, nombres, apellidos, cedula, salario_base, fecha_ingreso")
      .eq("estado", "activo").order("apellidos")).data ?? [],
  });

  const calcular = async () => {
    if (!f.empleado_id) return toast.error("Seleccione empleado");
    const { data, error } = await (supabase as any).rpc("calcular_prestaciones", {
      _empleado_id: f.empleado_id, _motivo: f.motivo, _fecha_salida: f.fecha_salida,
    });
    if (error) return toast.error(error.message);
    setCalc(data);
  };

  const registrar = async () => {
    const { error } = await (supabase as any).rpc("registrar_terminacion", {
      _empleado_id: f.empleado_id, _motivo: f.motivo, _fecha_salida: f.fecha_salida,
      _otros: Number(f.otros) || 0, _notas: f.notas || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Terminación registrada y prestaciones calculadas");
    qc.invalidateQueries({ queryKey: ["terminaciones"] });
    qc.invalidateQueries({ queryKey: ["empleados-activos"] });
    setOpen(false); setCalc(null);
    setF({ empleado_id: "", motivo: "desahucio", fecha_salida: today(), otros: 0, notas: "" });
  };

  return (
    <div>
      <PageHeader title="Terminaciones y prestaciones laborales"
        description="Cálculo automático de preaviso, cesantía, vacaciones y regalía según el Código de Trabajo"
        action={<div className="flex gap-2"><Link to="/nomina"><Button variant="outline" size="sm">Volver</Button></Link>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setCalc(null); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nueva terminación</Button></DialogTrigger>
            <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Liquidación de empleado</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Empleado</Label>
                  <Select value={f.empleado_id} onValueChange={(v) => { setF({ ...f, empleado_id: v }); setCalc(null); }}>
                    <SelectTrigger><SelectValue placeholder="Seleccione…" /></SelectTrigger>
                    <SelectContent>{(empleados ?? []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.apellidos}, {e.nombres} — {fmtMoney(e.salario_base)}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Motivo</Label>
                    <Select value={f.motivo} onValueChange={(v) => { setF({ ...f, motivo: v }); setCalc(null); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{MOTIVOS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div><Label>Fecha de salida</Label><Input type="date" value={f.fecha_salida} onChange={(e) => { setF({ ...f, fecha_salida: e.target.value }); setCalc(null); }} /></div>
                </div>
                <Button variant="secondary" onClick={calcular} className="w-full"><Calculator className="h-4 w-4 mr-2" />Calcular prestaciones</Button>
                {calc && <Card className="p-4 bg-secondary">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Años de servicio</div><div className="text-right">{calc.anos_servicio}</div>
                    <div className="text-muted-foreground">Salario diario</div><div className="text-right">{fmtMoney(calc.salario_diario)}</div>
                    <div className="text-muted-foreground">Preaviso ({calc.preaviso_dias} días)</div><div className="text-right">{fmtMoney(calc.preaviso_monto)}</div>
                    <div className="text-muted-foreground">Cesantía ({calc.cesantia_dias} días)</div><div className="text-right">{fmtMoney(calc.cesantia_monto)}</div>
                    <div className="text-muted-foreground">Vacaciones ({calc.vacaciones_dias} días)</div><div className="text-right">{fmtMoney(calc.vacaciones_monto)}</div>
                    <div className="text-muted-foreground">Regalía proporcional</div><div className="text-right">{fmtMoney(calc.regalia_monto)}</div>
                    <div className="font-semibold border-t pt-2">Subtotal</div><div className="text-right font-semibold border-t pt-2">{fmtMoney(calc.total)}</div>
                  </div>
                </Card>}
                <div><Label>Otros conceptos (bonificaciones, etc.)</Label><Input type="number" step="0.01" value={f.otros} onChange={(e) => setF({ ...f, otros: e.target.value })} /></div>
                <div><Label>Notas</Label><Textarea value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} /></div>
                <Button onClick={registrar} disabled={!calc} className="w-full">Registrar terminación</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>} />
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>
            <th className="text-left p-3">Empleado</th><th className="text-left p-3">Salida</th>
            <th className="text-left p-3">Motivo</th><th className="text-right p-3">Años</th>
            <th className="text-right p-3">Preaviso</th><th className="text-right p-3">Cesantía</th>
            <th className="text-right p-3">Vac.</th><th className="text-right p-3">Regalía</th>
            <th className="text-right p-3">Total</th>
          </tr></thead>
          <tbody>
            {(term ?? []).map((t: any) => (
              <tr key={t.id} className="border-t border-border">
                <td className="p-3">{t.empleados?.apellidos}, {t.empleados?.nombres}</td>
                <td className="p-3 text-xs">{fmtDate(t.fecha_salida)}</td>
                <td className="p-3 text-xs capitalize">{t.motivo.replace("_", " ")}</td>
                <td className="p-3 text-right">{Number(t.anos_servicio).toFixed(2)}</td>
                <td className="p-3 text-right">{fmtMoney(t.preaviso_monto)}</td>
                <td className="p-3 text-right">{fmtMoney(t.cesantia_monto)}</td>
                <td className="p-3 text-right">{fmtMoney(t.vacaciones_monto)}</td>
                <td className="p-3 text-right">{fmtMoney(t.regalia_monto)}</td>
                <td className="p-3 text-right font-semibold">{fmtMoney(t.total)}</td>
              </tr>
            ))}
            {(!term || term.length === 0) && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No hay terminaciones registradas.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}