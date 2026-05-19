import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reportes")({ component: Reportes });

function Reportes() {
  const now = new Date();
  const [mes, setMes] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const inicio = `${mes}-01`;
  const fin = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0).toISOString().slice(0, 10);

  const { data } = useQuery({
    queryKey: ["reporte-607", mes],
    queryFn: async () => (await supabase.from("facturas").select("*, clientes(razon_social, documento, tipo_documento)").gte("fecha", inicio).lte("fecha", fin).neq("estado", "anulada").order("ncf")).data ?? [],
  });

  const grupos = (data ?? []).reduce((acc: Record<string, any[]>, f: any) => {
    (acc[f.tipo_ncf] ??= []).push(f); return acc;
  }, {});

  return (
    <div>
      <PageHeader title="Reporte 607 (Ventas)" description="Vista pre-DGII agrupada por tipo de NCF" />
      <Card className="p-4 mb-4 flex items-end gap-3">
        <div><Label>Período</Label><Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></div>
        <div className="text-sm text-muted-foreground">Del {inicio} al {fin}</div>
      </Card>

      {Object.entries(grupos).map(([tipo, facts]) => {
        const tot = facts.reduce((s, f: any) => ({ subtotal: s.subtotal + Number(f.subtotal), itbis: s.itbis + Number(f.itbis), total: s.total + Number(f.total) }), { subtotal: 0, itbis: 0, total: 0 });
        return (
          <Card key={tipo} className="p-0 mb-4 overflow-hidden">
            <div className="p-3 bg-secondary font-semibold">{tipo} — {facts.length} comprobantes</div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left p-2">NCF</th><th className="text-left p-2">RNC/Cédula</th><th className="text-left p-2">Razón social</th>
                <th className="text-right p-2">Subtotal</th><th className="text-right p-2">ITBIS</th><th className="text-right p-2">Total</th>
              </tr></thead>
              <tbody>
                {facts.map((f: any) => (
                  <tr key={f.id} className="border-b border-border">
                    <td className="p-2 font-mono">{f.ncf}</td>
                    <td className="p-2 font-mono">{f.clientes?.documento}</td>
                    <td className="p-2">{f.clientes?.razon_social}</td>
                    <td className="p-2 text-right">{fmtMoney(f.subtotal)}</td>
                    <td className="p-2 text-right">{fmtMoney(f.itbis)}</td>
                    <td className="p-2 text-right">{fmtMoney(f.total)}</td>
                  </tr>
                ))}
                <tr className="font-semibold bg-secondary/50">
                  <td colSpan={3} className="p-2 text-right">Totales</td>
                  <td className="p-2 text-right">{fmtMoney(tot.subtotal)}</td>
                  <td className="p-2 text-right">{fmtMoney(tot.itbis)}</td>
                  <td className="p-2 text-right">{fmtMoney(tot.total)}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        );
      })}
      {(!data || data.length === 0) && <div className="text-muted-foreground">Sin datos en el período.</div>}
    </div>
  );
}