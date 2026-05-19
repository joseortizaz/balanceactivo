import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { fmtMoney, fmtDate, today } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/cobros")({ component: Cobros });

function Cobros() {
  const qc = useQueryClient();
  const [sel, setSel] = useState<any>(null);
  const [monto, setMonto] = useState(0);
  const [metodo, setMetodo] = useState("Efectivo");

  const { data: pendientes } = useQuery({
    queryKey: ["facturas-pendientes"],
    queryFn: async () => (await supabase.from("facturas").select("*, clientes(razon_social)").eq("estado", "pendiente").order("fecha")).data ?? [],
  });

  const registrar = async () => {
    if (!sel || monto <= 0) return toast.error("Monto inválido");
    const { error } = await supabase.rpc("registrar_cobro", { _factura_id: sel.id, _monto: monto, _metodo: metodo, _fecha: today() });
    if (error) return toast.error(error.message);
    toast.success("Cobro registrado");
    setSel(null);
    qc.invalidateQueries({ queryKey: ["facturas-pendientes"] });
  };

  return (
    <div>
      <PageHeader title="Cobros" description="Registra pagos de facturas pendientes" />
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>
            <th className="text-left p-3">NCF</th><th className="text-left p-3">Cliente</th><th className="text-left p-3">Fecha</th>
            <th className="text-right p-3">Total</th><th className="text-right p-3">Pagado</th><th className="text-right p-3">Pendiente</th><th></th>
          </tr></thead>
          <tbody>
            {(pendientes ?? []).map((f: any) => (
              <tr key={f.id} className="border-t border-border">
                <td className="p-3 font-mono">{f.ncf}</td>
                <td className="p-3">{f.clientes?.razon_social}</td>
                <td className="p-3">{fmtDate(f.fecha)}</td>
                <td className="p-3 text-right">{fmtMoney(f.total)}</td>
                <td className="p-3 text-right">{fmtMoney(f.monto_pagado)}</td>
                <td className="p-3 text-right font-semibold">{fmtMoney(Number(f.total) - Number(f.monto_pagado))}</td>
                <td className="p-3"><Button size="sm" onClick={() => { setSel(f); setMonto(Number(f.total) - Number(f.monto_pagado)); }}>Cobrar</Button></td>
              </tr>
            ))}
            {(!pendientes || pendientes.length === 0) && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Sin facturas pendientes</td></tr>}
          </tbody>
        </table>
      </Card>

      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar cobro — {sel?.ncf}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Monto</Label><Input type="number" step="0.01" value={monto} onChange={(e) => setMonto(Number(e.target.value))} /></div>
            <div><Label>Método</Label><Input value={metodo} onChange={(e) => setMetodo(e.target.value)} /></div>
            <Button onClick={registrar} className="w-full">Registrar cobro</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}