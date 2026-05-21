import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CalendarDays, Settings, Plus, Banknote, CalendarOff, UserMinus, Gift, FileBarChart } from "lucide-react";
import { fmtMoney, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/nomina/")({ component: NominaHome });

function NominaHome() {
  const { data: empleados } = useQuery({
    queryKey: ["nomina-empleados-count"],
    queryFn: async () => {
      const { count } = await (supabase as any).from("empleados").select("*", { count: "exact", head: true }).eq("estado", "activo");
      return count ?? 0;
    },
  });
  const { data: nominas } = useQuery({
    queryKey: ["nominas-recientes"],
    queryFn: async () => (await (supabase as any).from("nominas").select("*").order("created_at", { ascending: false }).limit(10)).data ?? [],
  });

  return (
    <div>
      <PageHeader title="Nómina" description="Gestión de empleados, períodos y cierre contable conforme a la legislación dominicana" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Link to="/nomina/empleados"><Card className="p-5 hover:bg-secondary transition-colors"><div className="flex items-center gap-3"><Users className="h-6 w-6 text-primary" /><div><div className="font-semibold">Empleados</div><div className="text-sm text-muted-foreground">{empleados ?? 0} activos</div></div></div></Card></Link>
        <Link to="/nomina/periodos"><Card className="p-5 hover:bg-secondary transition-colors"><div className="flex items-center gap-3"><CalendarDays className="h-6 w-6 text-primary" /><div><div className="font-semibold">Períodos</div><div className="text-sm text-muted-foreground">Procesar y cerrar nóminas</div></div></div></Card></Link>
        <Link to="/nomina/configuracion"><Card className="p-5 hover:bg-secondary transition-colors"><div className="flex items-center gap-3"><Settings className="h-6 w-6 text-primary" /><div><div className="font-semibold">Configuración</div><div className="text-sm text-muted-foreground">Tasas TSS · ISR · Catálogos</div></div></div></Card></Link>
        <Link to="/nomina/prestamos"><Card className="p-5 hover:bg-secondary transition-colors"><div className="flex items-center gap-3"><Banknote className="h-6 w-6 text-primary" /><div><div className="font-semibold">Préstamos</div><div className="text-sm text-muted-foreground">Adelantos descontables</div></div></div></Card></Link>
        <Link to="/nomina/ausencias"><Card className="p-5 hover:bg-secondary transition-colors"><div className="flex items-center gap-3"><CalendarOff className="h-6 w-6 text-primary" /><div><div className="font-semibold">Ausencias</div><div className="text-sm text-muted-foreground">Vacaciones y licencias</div></div></div></Card></Link>
        <Link to="/nomina/terminaciones"><Card className="p-5 hover:bg-secondary transition-colors"><div className="flex items-center gap-3"><UserMinus className="h-6 w-6 text-primary" /><div><div className="font-semibold">Terminaciones</div><div className="text-sm text-muted-foreground">Prestaciones laborales</div></div></div></Card></Link>
        <Link to="/nomina/regalia"><Card className="p-5 hover:bg-secondary transition-colors"><div className="flex items-center gap-3"><Gift className="h-6 w-6 text-primary" /><div><div className="font-semibold">Regalía Pascual</div><div className="text-sm text-muted-foreground">Generar nómina anual</div></div></div></Card></Link>
        <Link to="/nomina/reportes"><Card className="p-5 hover:bg-secondary transition-colors"><div className="flex items-center gap-3"><FileBarChart className="h-6 w-6 text-primary" /><div><div className="font-semibold">Reportes</div><div className="text-sm text-muted-foreground">IR-3 · TSS · DGT-3</div></div></div></Card></Link>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Nóminas recientes</h2>
        <Link to="/nomina/periodos/nueva"><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nueva nómina</Button></Link>
      </div>
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>
            <th className="text-left p-3">Nombre</th><th className="text-left p-3">Período</th><th className="text-left p-3">Estado</th>
            <th className="text-right p-3">Neto</th><th className="text-right p-3">Aportes patronales</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {(nominas ?? []).map((n: any) => (
              <tr key={n.id} className="border-t border-border">
                <td className="p-3">{n.nombre}</td>
                <td className="p-3 text-xs">{fmtDate(n.periodo_inicio)} – {fmtDate(n.periodo_fin)}</td>
                <td className="p-3 capitalize">{n.estado}</td>
                <td className="p-3 text-right">{fmtMoney(n.total_neto)}</td>
                <td className="p-3 text-right">{fmtMoney(n.total_aportes_patronales)}</td>
                <td className="p-3 text-right"><Link to="/nomina/periodos/$id" params={{ id: n.id }}><Button variant="ghost" size="sm">Ver</Button></Link></td>
              </tr>
            ))}
            {(!nominas || nominas.length === 0) && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Aún no hay nóminas procesadas.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}