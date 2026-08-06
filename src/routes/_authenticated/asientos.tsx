import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { fmtMoney, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/asientos")({ component: Asientos });

function Asientos() {
  const { data } = useQuery({
    queryKey: ["asientos"],
    queryFn: async () => (await supabase.from("asientos_contables").select("*, asiento_lineas(*, cuentas_contables(codigo, nombre))").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  return (
    <div>
      <PageHeader title="Asientos Contables" description="Generados automáticamente a partir de facturas y cobros" />
      <div className="space-y-3">
        {(data ?? []).map((a: any) => (
          <Card key={a.id} className="p-4">
            <div className="flex justify-between mb-2">
              <div>
                <div className="font-semibold">
                  {a.concepto}
                  {a.origen === "anulacion_factura" && (
                    <span className="ml-2 text-xs rounded px-1.5 py-0.5 bg-destructive/10 text-destructive align-middle">Reversión</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{fmtDate(a.fecha)} · {a.origen}</div>
              </div>
              <div className="text-right text-sm"><div>Débito: {fmtMoney(a.total_debito)}</div><div>Crédito: {fmtMoney(a.total_credito)}</div></div>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {(a.asiento_lineas ?? []).map((l: any) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="py-1.5 font-mono text-xs">{l.cuentas_contables?.codigo}</td>
                    <td className="py-1.5">{l.cuentas_contables?.nombre}</td>
                    <td className="py-1.5 text-right">{Number(l.debito) > 0 ? fmtMoney(l.debito) : ""}</td>
                    <td className="py-1.5 text-right">{Number(l.credito) > 0 ? fmtMoney(l.credito) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}
        {(!data || data.length === 0) && <div className="text-muted-foreground">Aún no hay asientos.</div>}
      </div>
    </div>
  );
}