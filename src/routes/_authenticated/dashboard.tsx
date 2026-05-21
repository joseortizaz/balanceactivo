import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { FileText, Wallet, AlertCircle, Receipt } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const start = new Date(); start.setDate(1);
      const startIso = start.toISOString().slice(0, 10);
      const [{ data: ventas }, { data: cxc }, { data: recientes }] = await Promise.all([
        supabase.from("facturas").select("fecha, total, itbis").gte("fecha", startIso),
        supabase.from("facturas").select("id, ncf, total, monto_pagado, fecha, fecha_vencimiento, estado").eq("estado", "pendiente"),
        supabase.from("facturas").select("id, ncf, total, fecha, estado").order("created_at", { ascending: false }).limit(10),
      ]);
      const ventasMes = (ventas ?? []).reduce((s, f) => s + Number(f.total), 0);
      const itbisMes = (ventas ?? []).reduce((s, f) => s + Number(f.itbis), 0);
      const cxcTotal = (cxc ?? []).reduce((s, f) => s + (Number(f.total) - Number(f.monto_pagado)), 0);
      const porDia = new Map<string, number>();
      (ventas ?? []).forEach((f) => porDia.set(f.fecha, (porDia.get(f.fecha) ?? 0) + Number(f.total)));
      const chart = Array.from(porDia.entries()).sort().map(([fecha, total]) => ({ fecha: fecha.slice(8), total }));
      return { ventasMes, itbisMes, cxcTotal, recientes: recientes ?? [], chart, cxcCount: cxc?.length ?? 0 };
    },
  });

  return (
    <div>
      <SubscriptionBanner />
      <PageHeader title="Dashboard" description="Resumen de tu actividad fiscal del mes"
        action={<Link to="/facturas/nueva"><Button><Receipt className="h-4 w-4 mr-2" />Nueva factura</Button></Link>} />
      {isLoading ? <div className="text-muted-foreground">Cargando…</div> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Stat icon={FileText} label="Ventas del mes" value={fmtMoney(data!.ventasMes)} />
            <Stat icon={Wallet} label="ITBIS por pagar" value={fmtMoney(data!.itbisMes)} />
            <Stat icon={AlertCircle} label="Cuentas por cobrar" value={fmtMoney(data!.cxcTotal)} sub={`${data!.cxcCount} facturas`} />
            <Stat icon={Receipt} label="Facturas mes" value={String(data!.chart.reduce((s, x) => s + 1, 0))} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="font-semibold mb-3">Ventas por día</div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data!.chart}>
                    <XAxis dataKey="fecha" />
                    <YAxis />
                    <Tooltip formatter={(v: number) => fmtMoney(v)} />
                    <Bar dataKey="total" fill="oklch(0.45 0.16 255)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-5">
              <div className="font-semibold mb-3">Últimos NCF emitidos</div>
              <div className="space-y-2">
                {data!.recientes.map((f) => (
                  <div key={f.id} className="flex justify-between py-2 border-b border-border last:border-0 text-sm">
                    <div>
                      <div className="font-mono font-medium">{f.ncf}</div>
                      <div className="text-muted-foreground text-xs">{fmtDate(f.fecha)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{fmtMoney(f.total)}</div>
                      <div className="text-xs text-muted-foreground">{f.estado}</div>
                    </div>
                  </div>
                ))}
                {data!.recientes.length === 0 && <div className="text-sm text-muted-foreground">Sin facturas aún.</div>}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        </div>
        <Icon className="h-5 w-5 text-primary" />
      </div>
    </Card>
  );
}