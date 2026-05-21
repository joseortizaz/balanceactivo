import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Gift } from "lucide-react";

export const Route = createFileRoute("/_authenticated/nomina/regalia")({ component: Regalia });

function Regalia() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [anio, setAnio] = useState(new Date().getFullYear());

  const { data: regalias } = useQuery({
    queryKey: ["regalias"],
    queryFn: async () => (await (supabase as any).from("nominas").select("*")
      .eq("tipo", "regalia_pascual").order("periodo_inicio", { ascending: false })).data ?? [],
  });

  const generar = async () => {
    const { data, error } = await (supabase as any).rpc("generar_regalia_pascual", { _anio: anio });
    if (error) return toast.error(error.message);
    toast.success("Regalía Pascual generada");
    qc.invalidateQueries({ queryKey: ["regalias"] });
    nav({ to: "/nomina/periodos/$id", params: { id: data } });
  };

  return (
    <div>
      <PageHeader title="Regalía Pascual"
        description="Salario de Navidad — Art. 219 del Código de Trabajo. 1/12 del salario anual, pagadero antes del 20 de diciembre."
        action={<Link to="/nomina"><Button variant="outline" size="sm">Volver</Button></Link>} />
      <Card className="p-5 mb-4 max-w-md">
        <div className="flex items-end gap-3">
          <div className="flex-1"><Label>Año</Label><Input type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} /></div>
          <Button onClick={generar}><Gift className="h-4 w-4 mr-2" />Generar regalía</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Se creará una nómina en borrador con el cálculo proporcional para cada empleado activo. Podrás revisarla, cerrarla y registrar el pago desde el período generado.</p>
      </Card>
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>
            <th className="text-left p-3">Año / Nombre</th><th className="text-left p-3">Fecha pago</th>
            <th className="text-left p-3">Estado</th><th className="text-right p-3">Total</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {(regalias ?? []).map((r: any) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3">{r.nombre}</td>
                <td className="p-3 text-xs">{fmtDate(r.fecha_pago)}</td>
                <td className="p-3 capitalize">{r.estado}</td>
                <td className="p-3 text-right font-semibold">{fmtMoney(r.total_neto)}</td>
                <td className="p-3 text-right"><Link to="/nomina/periodos/$id" params={{ id: r.id }}><Button variant="ghost" size="sm">Ver</Button></Link></td>
              </tr>
            ))}
            {(!regalias || regalias.length === 0) && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Aún no se ha generado regalía.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}