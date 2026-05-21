import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fmtMoney, fmtDate } from "@/lib/format";
import { useState } from "react";
import { Play, Lock, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/nomina/periodos/$id")({ component: Detalle });

function Detalle() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [cuentaPago, setCuentaPago] = useState("1.1.01.02");

  const { data: nomina } = useQuery({
    queryKey: ["nomina", id],
    queryFn: async () => (await (supabase as any).from("nominas").select("*").eq("id", id).single()).data,
  });
  const { data: detalles } = useQuery({
    queryKey: ["nomina-detalle", id],
    queryFn: async () => (await (supabase as any).from("nomina_detalle").select("*, empleados(nombres, apellidos, cedula)").eq("nomina_id", id).order("created_at")).data ?? [],
  });

  const refrescar = () => { qc.invalidateQueries({ queryKey: ["nomina", id] }); qc.invalidateQueries({ queryKey: ["nomina-detalle", id] }); };

  const procesar = async () => {
    const { error } = await (supabase as any).rpc("procesar_nomina", { _nomina_id: id });
    if (error) return toast.error(error.message);
    toast.success("Nómina procesada");
    refrescar();
  };
  const cerrar = async () => {
    const { error } = await (supabase as any).rpc("cerrar_nomina", { _nomina_id: id });
    if (error) return toast.error(error.message);
    toast.success("Nómina cerrada y asiento generado");
    refrescar();
  };
  const pagar = async () => {
    const { error } = await (supabase as any).rpc("registrar_pago_nomina", { _nomina_id: id, _cuenta_codigo: cuentaPago });
    if (error) return toast.error(error.message);
    toast.success("Pago registrado");
    refrescar();
  };

  if (!nomina) return <div className="text-muted-foreground">Cargando…</div>;

  return (
    <div>
      <PageHeader title={nomina.nombre}
        description={`${fmtDate(nomina.periodo_inicio)} – ${fmtDate(nomina.periodo_fin)} · ${nomina.forma_pago} · estado: ${nomina.estado}`}
        action={<Link to="/nomina/periodos"><Button variant="outline" size="sm">Volver</Button></Link>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total bruto</div><div className="text-xl font-semibold">{fmtMoney(nomina.total_ingresos)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Deducciones</div><div className="text-xl font-semibold">{fmtMoney(nomina.total_deducciones)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Neto a pagar</div><div className="text-xl font-semibold">{fmtMoney(nomina.total_neto)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Aportes patronales</div><div className="text-xl font-semibold">{fmtMoney(nomina.total_aportes_patronales)}</div></Card>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {nomina.estado === "borrador" && <>
          <Button onClick={procesar}><Play className="h-4 w-4 mr-2" />Procesar / Recalcular</Button>
          <Button variant="secondary" onClick={cerrar} disabled={(detalles?.length ?? 0) === 0}><Lock className="h-4 w-4 mr-2" />Cerrar y generar asiento</Button>
        </>}
        {nomina.estado === "cerrada" && <div className="flex items-center gap-2">
          <Select value={cuentaPago} onValueChange={setCuentaPago}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1.1.01.01">Caja General</SelectItem>
              <SelectItem value="1.1.01.02">Banco Principal</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={pagar}><Wallet className="h-4 w-4 mr-2" />Registrar pago</Button>
        </div>}
      </div>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>
            <th className="text-left p-3">Empleado</th><th className="text-right p-3">Bruto</th>
            <th className="text-right p-3">SFS</th><th className="text-right p-3">AFP</th><th className="text-right p-3">ISR</th>
            <th className="text-right p-3">Total Ded.</th><th className="text-right p-3">Neto</th>
            <th className="text-right p-3">Aporte Patronal</th>
          </tr></thead>
          <tbody>
            {(detalles ?? []).map((d: any) => (
              <tr key={d.id} className="border-t border-border">
                <td className="p-3">{d.empleados?.apellidos}, {d.empleados?.nombres}<div className="text-xs text-muted-foreground font-mono">{d.empleados?.cedula}</div></td>
                <td className="p-3 text-right">{fmtMoney(d.total_ingresos)}</td>
                <td className="p-3 text-right">{fmtMoney(d.sfs)}</td>
                <td className="p-3 text-right">{fmtMoney(d.afp)}</td>
                <td className="p-3 text-right">{fmtMoney(d.isr)}</td>
                <td className="p-3 text-right">{fmtMoney(d.total_deducciones)}</td>
                <td className="p-3 text-right font-semibold">{fmtMoney(d.neto_pagar)}</td>
                <td className="p-3 text-right text-muted-foreground">{fmtMoney(Number(d.sfs_patronal)+Number(d.afp_patronal)+Number(d.srl_patronal)+Number(d.infotep_patronal))}</td>
              </tr>
            ))}
            {(!detalles || detalles.length === 0) && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Aún no se ha procesado. Pulsa "Procesar / Recalcular".</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}