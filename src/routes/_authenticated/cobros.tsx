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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fmtMoney, fmtDate, today } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/cobros")({ component: Cobros });

function Cobros() {
  const qc = useQueryClient();
  const [sel, setSel] = useState<any>(null);
  const [monto, setMonto] = useState(0);
  const [metodo, setMetodo] = useState<string>("efectivo");
  const [fecha, setFecha] = useState<string>(today());
  const [bancoId, setBancoId] = useState<string>("");

  const { data: pendientes } = useQuery({
    queryKey: ["facturas-pendientes"],
    queryFn: async () => (await supabase.from("facturas").select("*, clientes(razon_social)").eq("estado", "pendiente").order("fecha")).data ?? [],
  });

  const { data: bancos } = useQuery({
    queryKey: ["bancos-activos"],
    queryFn: async () => (await (supabase as any).from("bancos").select("id, nombre").eq("activo", true).order("nombre")).data ?? [],
  });

  const requiereBanco = metodo !== "efectivo";

  const registrar = async () => {
    if (!sel || monto <= 0) return toast.error("Monto inválido");
    if (!fecha) return toast.error("Selecciona la fecha del cobro");
    if (requiereBanco && !bancoId) return toast.error("Selecciona el banco");
    const { error } = await (supabase.rpc as any)("registrar_cobro", {
      _factura_id: sel.id,
      _monto: monto,
      _metodo: metodo,
      _fecha: fecha,
      _banco_id: requiereBanco ? bancoId : null,
    });
    if (error) return toast.error(error.message);
    toast.success("Cobro registrado");
    setSel(null);
    qc.invalidateQueries({ queryKey: ["facturas-pendientes"] });
  };

  const openCobro = (f: any) => {
    setSel(f);
    setMonto(Number(f.total) - Number(f.monto_pagado));
    setFecha(today());
    setMetodo("efectivo");
    setBancoId("");
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
                <td className="p-3"><Button size="sm" onClick={() => openCobro(f)}>Cobrar</Button></td>
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
            <div><Label>Fecha del cobro</Label><Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
            <div>
              <Label>Vía de recepción</Label>
              <Select value={metodo} onValueChange={(v) => { setMetodo(v); if (v === "efectivo") setBancoId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="deposito">Depósito</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {requiereBanco && (
              <div>
                <Label>Banco</Label>
                <Select value={bancoId} onValueChange={setBancoId}>
                  <SelectTrigger><SelectValue placeholder={(bancos ?? []).length === 0 ? "Registra bancos en Configuración" : "Selecciona un banco"} /></SelectTrigger>
                  <SelectContent>
                    {(bancos ?? []).map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={registrar} className="w-full">Registrar cobro</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}