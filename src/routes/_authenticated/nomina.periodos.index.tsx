import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { fmtMoney, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/nomina/periodos/")({ component: Periodos });

function Periodos() {
  const { data } = useQuery({
    queryKey: ["nominas"],
    queryFn: async () => (await (supabase as any).from("nominas").select("*").order("periodo_fin", { ascending: false })).data ?? [],
  });
  return (
    <div>
      <PageHeader title="Períodos de Nómina" description="Listado de nóminas procesadas"
        action={<Link to="/nomina/periodos/nueva"><Button><Plus className="h-4 w-4 mr-2" />Nueva nómina</Button></Link>} />
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>
            <th className="text-left p-3">Nombre</th><th className="text-left p-3">Forma</th><th className="text-left p-3">Período</th>
            <th className="text-left p-3">Estado</th><th className="text-right p-3">Bruto</th><th className="text-right p-3">Neto</th><th className="text-right p-3">Patronal</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {(data ?? []).map((n: any) => (
              <tr key={n.id} className="border-t border-border">
                <td className="p-3">{n.nombre}</td>
                <td className="p-3 capitalize">{n.forma_pago}</td>
                <td className="p-3 text-xs">{fmtDate(n.periodo_inicio)} – {fmtDate(n.periodo_fin)}</td>
                <td className="p-3 capitalize">{n.estado}</td>
                <td className="p-3 text-right">{fmtMoney(n.total_ingresos)}</td>
                <td className="p-3 text-right">{fmtMoney(n.total_neto)}</td>
                <td className="p-3 text-right">{fmtMoney(n.total_aportes_patronales)}</td>
                <td className="p-3 text-right"><Link to="/nomina/periodos/$id" params={{ id: n.id }}><Button variant="ghost" size="sm">Ver</Button></Link></td>
              </tr>
            ))}
            {(!data || data.length === 0) && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Aún no hay nóminas.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}