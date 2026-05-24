import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fmtMoney, fmtDate, today } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { generateReciboPdf } from "@/lib/recibo-pdf";
import { sendTransactionalEmail } from "@/lib/email/send";
import { Download, Mail } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cobros")({ component: Cobros });

function Cobros() {
  const qc = useQueryClient();
  const auth = useAuth();
  const [sel, setSel] = useState<any>(null);
  const [monto, setMonto] = useState(0);
  const [metodo, setMetodo] = useState<string>("efectivo");
  const [fecha, setFecha] = useState<string>(today());
  const [bancoId, setBancoId] = useState<string>("");
  const [nota, setNota] = useState<string>("");
  const [recibo, setRecibo] = useState<any>(null);
  const [emailTo, setEmailTo] = useState<string>("");
  const [sending, setSending] = useState(false);

  const { data: pendientes } = useQuery({
    queryKey: ["facturas-pendientes"],
    queryFn: async () => (await supabase.from("facturas").select("*, clientes(razon_social)").eq("estado", "pendiente").order("fecha")).data ?? [],
  });

  const { data: bancos } = useQuery({
    queryKey: ["bancos-activos"],
    queryFn: async () => (await (supabase as any).from("bancos").select("id, nombre").eq("activo", true).order("nombre")).data ?? [],
  });

  const { data: tenant } = useQuery({
    queryKey: ["tenant-info", auth.tenantId],
    enabled: !!auth.tenantId,
    queryFn: async () => (await supabase.from("tenants").select("*").eq("id", auth.tenantId!).maybeSingle()).data,
  });

  const requiereBanco = metodo !== "efectivo";

  const registrar = async () => {
    if (!sel || monto <= 0) return toast.error("Monto inválido");
    if (!fecha) return toast.error("Selecciona la fecha del cobro");
    if (requiereBanco && !bancoId) return toast.error("Selecciona el banco");
    const { data: cobroId, error } = await (supabase.rpc as any)("registrar_cobro", {
      _factura_id: sel.id,
      _monto: monto,
      _metodo: metodo,
      _fecha: fecha,
      _banco_id: requiereBanco ? bancoId : null,
      _nota: nota || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Cobro registrado");
    const totalFact = Number(sel.total);
    const pagadoPrev = Number(sel.monto_pagado);
    const nuevoPagado = pagadoPrev + Number(monto);
    const bancoNombre = (bancos ?? []).find((b: any) => b.id === bancoId)?.nombre ?? null;
    setRecibo({
      id: cobroId,
      factura: sel,
      monto: Number(monto),
      pendiente: Math.max(totalFact - nuevoPagado, 0),
      totalFact,
      fecha,
      metodo,
      bancoNombre,
      nota,
    });
    setEmailTo(sel.clientes?.email ?? "");
    setSel(null);
    qc.invalidateQueries({ queryKey: ["facturas-pendientes"] });
  };

  const openCobro = (f: any) => {
    setSel(f);
    setMonto(Number(f.total) - Number(f.monto_pagado));
    setFecha(today());
    setMetodo("efectivo");
    setBancoId("");
    setNota("");
  };

  const metodoLabel = (m: string) => ({
    efectivo: "Efectivo", transferencia: "Transferencia", deposito: "Depósito", cheque: "Cheque",
  } as any)[m] ?? m;

  const buildPdfData = () => {
    if (!recibo) return null;
    const recNum = `REC-${String(recibo.id ?? "").slice(0, 8).toUpperCase()}`;
    return {
      companyName: tenant?.razon_social ?? "Empresa",
      companyRnc: tenant?.rnc ?? null,
      companyAddress: tenant?.direccion ?? null,
      companyPhone: tenant?.telefono ?? null,
      clientName: recibo.factura.clientes?.razon_social ?? "Cliente",
      invoiceNcf: recibo.factura.ncf,
      invoiceTotal: fmtMoney(recibo.totalFact),
      amountPaid: fmtMoney(recibo.monto),
      amountPending: fmtMoney(recibo.pendiente),
      paymentDate: fmtDate(recibo.fecha),
      paymentMethod: metodoLabel(recibo.metodo),
      bankName: recibo.bancoNombre,
      note: recibo.nota || null,
      receiptNumber: recNum,
    };
  };

  const descargarPdf = () => {
    const d = buildPdfData();
    if (!d) return;
    const doc = generateReciboPdf(d);
    doc.save(`${d.receiptNumber}-${d.invoiceNcf}.pdf`);
  };

  const enviarEmail = async () => {
    const d = buildPdfData();
    if (!d) return;
    if (!emailTo) return toast.error("Indica el correo del cliente");
    setSending(true);
    try {
      await sendTransactionalEmail({
        templateName: "recibo-cobro",
        recipientEmail: emailTo,
        idempotencyKey: `recibo-${recibo.id}`,
        templateData: d,
      });
      toast.success("Recibo enviado por correo");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo enviar el correo");
    } finally {
      setSending(false);
    }
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
            <div>
              <Label>Nota (opcional)</Label>
              <Textarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Observaciones sobre este cobro" rows={3} />
            </div>
            <Button onClick={registrar} className="w-full">Registrar cobro</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!recibo} onOpenChange={(o) => !o && setRecibo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Recibo de pago</DialogTitle></DialogHeader>
          {recibo && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border p-4 space-y-2 bg-secondary/30">
                <div className="flex justify-between"><span className="text-muted-foreground">Factura</span><span className="font-mono">{recibo.factura.ncf}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><span>{recibo.factura.clientes?.razon_social}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fecha</span><span>{fmtDate(recibo.fecha)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Vía</span><span>{metodoLabel(recibo.metodo)}{recibo.bancoNombre ? ` — ${recibo.bancoNombre}` : ""}</span></div>
                <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Total factura</span><span>{fmtMoney(recibo.totalFact)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Monto abonado</span><span className="font-semibold">{fmtMoney(recibo.monto)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pendiente</span><span>{fmtMoney(recibo.pendiente)}</span></div>
                {recibo.nota && <div className="border-t pt-2"><div className="text-muted-foreground text-xs">Nota</div><div>{recibo.nota}</div></div>}
              </div>
              <div>
                <Label>Correo del cliente</Label>
                <Input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="cliente@correo.com" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={descargarPdf}><Download className="h-4 w-4 mr-2" />Descargar PDF</Button>
                <Button className="flex-1" onClick={enviarEmail} disabled={sending}><Mail className="h-4 w-4 mr-2" />{sending ? "Enviando…" : "Enviar por correo"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}