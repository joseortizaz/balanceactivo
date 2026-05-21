import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { Download, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/nomina/reportes")({ component: Reportes });

function descargar(nombre: string, contenido: string, mime = "text/plain") {
  const blob = new Blob([contenido], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombre; a.click();
  URL.revokeObjectURL(url);
}

function Reportes() {
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ir3, setIr3] = useState<any>(null);

  const generarIR3 = async () => {
    const { data, error } = await (supabase as any).rpc("generar_ir3", { _anio: anio, _mes: mes });
    if (error) return toast.error(error.message);
    setIr3(data);
  };

  const descargarIR3CSV = () => {
    if (!ir3) return;
    const filas = [["Cédula", "Nombre", "Bruto", "SFS", "AFP", "ISR"].join(",")];
    for (const e of ir3.empleados) {
      filas.push([e.cedula, `"${e.nombre}"`, e.bruto, e.sfs, e.afp, e.isr].join(","));
    }
    descargar(`IR3_${ir3.periodo}.csv`, filas.join("\n"), "text/csv");
  };

  const descargarTSS = async () => {
    const { data, error } = await (supabase as any).rpc("generar_ir3", { _anio: anio, _mes: mes });
    if (error) return toast.error(error.message);
    const lineas: string[] = [];
    for (const e of data.empleados ?? []) {
      const ced = (e.cedula ?? "").padEnd(11, "0").slice(0, 11);
      const sal = Math.round(Number(e.bruto) * 100).toString().padStart(12, "0");
      const sfs = Math.round(Number(e.sfs) * 100).toString().padStart(10, "0");
      const afp = Math.round(Number(e.afp) * 100).toString().padStart(10, "0");
      lineas.push(`${ced}|${sal}|${sfs}|${afp}`);
    }
    descargar(`TSS_AUTODETERMINACION_${anio}${String(mes).padStart(2, "0")}.txt`, lineas.join("\n"));
  };

  const descargarDGT3 = async () => {
    const { data: emp, error } = await (supabase as any).from("empleados")
      .select("cedula, nombres, apellidos, fecha_ingreso, salario_base, estado, sexo, fecha_nacimiento")
      .eq("estado", "activo");
    if (error) return toast.error(error.message);
    const filas = [["Cedula", "Apellidos", "Nombres", "Sexo", "Fecha Nacimiento", "Fecha Ingreso", "Salario"].join(",")];
    for (const e of emp ?? []) {
      filas.push([e.cedula, `"${e.apellidos}"`, `"${e.nombres}"`, e.sexo ?? "", e.fecha_nacimiento ?? "", e.fecha_ingreso, e.salario_base].join(","));
    }
    descargar(`DGT3_PERSONAL_FIJO.csv`, filas.join("\n"), "text/csv");
  };

  return (
    <div>
      <PageHeader title="Reportes oficiales de nómina"
        description="IR-3 (ISR retenido), TSS Autodeterminación SUIR+, DGT-3 Personal Fijo"
        action={<Link to="/nomina"><Button variant="outline" size="sm">Volver</Button></Link>} />

      <Card className="p-5 mb-4 max-w-2xl">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Período</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div><Label>Año</Label><Input type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} /></div>
          <div><Label>Mes</Label><Input type="number" min={1} max={12} value={mes} onChange={(e) => setMes(Number(e.target.value))} /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={generarIR3} variant="secondary">Generar IR-3</Button>
          <Button onClick={descargarTSS} variant="outline"><Download className="h-4 w-4 mr-2" />TSS SUIR+ (.txt)</Button>
          <Button onClick={descargarDGT3} variant="outline"><Download className="h-4 w-4 mr-2" />DGT-3 Personal Fijo</Button>
        </div>
      </Card>

      {ir3 && <Card className="p-0 overflow-x-auto">
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div>
            <div className="text-sm text-muted-foreground">IR-3 · Período {ir3.periodo}</div>
            <div className="text-lg font-semibold">Total ISR: {fmtMoney(ir3.total_isr)} · Total bruto: {fmtMoney(ir3.total_bruto)}</div>
          </div>
          <Button onClick={descargarIR3CSV}><Download className="h-4 w-4 mr-2" />Descargar CSV</Button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>
            <th className="text-left p-3">Cédula</th><th className="text-left p-3">Nombre</th>
            <th className="text-right p-3">Bruto</th><th className="text-right p-3">SFS</th>
            <th className="text-right p-3">AFP</th><th className="text-right p-3">ISR</th>
          </tr></thead>
          <tbody>
            {(ir3.empleados ?? []).map((e: any, i: number) => (
              <tr key={i} className="border-t border-border">
                <td className="p-3 font-mono text-xs">{e.cedula}</td>
                <td className="p-3">{e.nombre}</td>
                <td className="p-3 text-right">{fmtMoney(e.bruto)}</td>
                <td className="p-3 text-right">{fmtMoney(e.sfs)}</td>
                <td className="p-3 text-right">{fmtMoney(e.afp)}</td>
                <td className="p-3 text-right font-semibold">{fmtMoney(e.isr)}</td>
              </tr>
            ))}
            {(!ir3.empleados || ir3.empleados.length === 0) && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Sin datos para el período seleccionado.</td></tr>}
          </tbody>
        </table>
      </Card>}
    </div>
  );
}