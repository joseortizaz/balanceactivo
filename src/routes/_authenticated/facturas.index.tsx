import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, FileDown, Search, Ban, Lock, Eye, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { fmtMoney, fmtDate } from "@/lib/format";
import { generateFacturaPdf } from "@/lib/factura-pdf";
import { Label } from "@/components/ui/label";
import { sendTransactionalEmail } from "@/lib/email/send";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/facturas/")({ component: Facturas });

function Facturas() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [motivoOpen, setMotivoOpen] = useState(false);
  const [accion, setAccion] = useState<"anular" | "cerrar" | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailFactura, setEmailFactura] = useState<any>(null);
  const [emailTo, setEmailTo] = useState("");
  const [sending, setSending] = useState(false);
  const { data } = useQuery({
    queryKey: ["facturas"],
    queryFn: async () => (await supabase.from("facturas").select("*, clientes(razon_social, documento, email)").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: lineasAll } = useQuery({
    queryKey: ["factura-lineas-all"],
    queryFn: async () => (await supabase.from("factura_lineas").select("factura_id, descripcion")).data ?? [],
  });

  const lineasPorFactura = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of (lineasAll ?? []) as any[]) {
      m.set(l.factura_id, (m.get(l.factura_id) ?? "") + " " + (l.descripcion ?? ""));
    }
    return m;
  }, [lineasAll]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((f: any) => {
      const cliente = (f.clientes?.razon_social ?? "").toLowerCase();
      const ncf = (f.ncf ?? "").toLowerCase();
      const productos = (lineasPorFactura.get(f.id) ?? "").toLowerCase();
      return cliente.includes(q) || ncf.includes(q) || productos.includes(q);
    });
  }, [data, lineasPorFactura, search]);

  const descargarPdf = async (facturaId: string) => {
    try {
      const [{ data: f }, { data: lineas }, { data: tenantRows }] = await Promise.all([
        supabase.from("facturas").select("*, clientes(razon_social, documento, email, telefono, direccion)").eq("id", facturaId).maybeSingle(),
        supabase.from("factura_lineas").select("descripcion, cantidad, precio, subtotal").eq("factura_id", facturaId),
        supabase.from("tenants").select("razon_social, nombre_comercial, rnc, direccion, telefono, logo_url").limit(1),
      ]);
      if (!f) return toast.error("Factura no encontrada");
      const t: any = (tenantRows ?? [])[0] ?? {};
      const c: any = (f as any).clientes ?? {};
      const doc = await generateFacturaPdf({
        companyName: t.nombre_comercial || t.razon_social || "",
        companyRnc: t.rnc,
        companyAddress: t.direccion,
        companyPhone: t.telefono,
        companyEmail: null,
        companyLogoUrl: t.logo_url,
        ncf: f.ncf,
        fechaEmision: fmtDate(f.fecha),
        fechaVencimiento: f.fecha_vencimiento ? fmtDate(f.fecha_vencimiento) : null,
        estado: f.estado,
        clienteNombre: c.razon_social || "—",
        clienteDocumento: c.documento,
        clienteEmail: c.email,
        clienteTelefono: c.telefono,
        clienteDireccion: c.direccion,
        lineas: (lineas ?? []).map((l: any) => ({
          descripcion: l.descripcion,
          cantidad: Number(l.cantidad),
          precio: Number(l.precio),
          subtotal: Number(l.subtotal),
        })),
        subtotal: Number(f.subtotal),
        descuento: Number(f.descuento ?? 0),
        itbis: Number(f.itbis ?? 0),
        total: Number(f.total),
        montoPagado: Number(f.monto_pagado ?? 0),
        saldoPendiente: Number(f.total) - Number(f.monto_pagado ?? 0),
      });
      doc.save(`${f.ncf}.pdf`);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al generar PDF");
    }
  };

  const abrirEnviarEmail = (f: any) => {
    setEmailFactura(f);
    setEmailTo(f.clientes?.email ?? "");
    setEmailOpen(true);
  };

  const enviarEmail = async () => {
    if (!emailFactura) return;
    if (!emailTo.trim()) return toast.error("Indica un correo de destino");
    setSending(true);
    try {
      const [{ data: f }, { data: lineas }, { data: tenantRows }] = await Promise.all([
        supabase.from("facturas").select("*, clientes(razon_social, email)").eq("id", emailFactura.id).maybeSingle(),
        supabase.from("factura_lineas").select("descripcion, cantidad, subtotal").eq("factura_id", emailFactura.id),
        supabase.from("tenants").select("razon_social, nombre_comercial, rnc, direccion, telefono").limit(1),
      ]);
      if (!f) throw new Error("Factura no encontrada");
      const t: any = (tenantRows ?? [])[0] ?? {};
      const c: any = (f as any).clientes ?? {};
      const total = Number(f.total ?? 0);
      const pagado = Number(f.monto_pagado ?? 0);
      await sendTransactionalEmail({
        templateName: "factura",
        recipientEmail: emailTo.trim(),
        idempotencyKey: `factura:${f.id}:${emailTo.trim()}`,
        templateData: {
          companyName: t.nombre_comercial || t.razon_social || "",
          companyRnc: t.rnc,
          companyAddress: t.direccion,
          companyPhone: t.telefono,
          clientName: c.razon_social || "—",
          ncf: f.ncf,
          fechaEmision: fmtDate(f.fecha),
          fechaVencimiento: f.fecha_vencimiento ? fmtDate(f.fecha_vencimiento) : null,
          estado: f.estado,
          subtotal: fmtMoney(f.subtotal),
          descuento: Number(f.descuento ?? 0) > 0 ? fmtMoney(f.descuento) : null,
          itbis: fmtMoney(f.itbis ?? 0),
          total: fmtMoney(total),
          montoPagado: pagado > 0 ? fmtMoney(pagado) : null,
          saldoPendiente: total - pagado > 0 ? fmtMoney(total - pagado) : null,
          lineas: (lineas ?? []).map((l: any) => ({
            descripcion: l.descripcion,
            cantidad: Number(l.cantidad),
            subtotal: fmtMoney(l.subtotal),
          })),
        },
      });
      toast.success("Factura enviada por correo");
      setEmailOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al enviar la factura");
    } finally {
      setSending(false);
    }
  };

  const abrirMotivo = (id: string, acc: "anular" | "cerrar") => {
    setTargetId(id); setAccion(acc); setMotivo(""); setMotivoOpen(true);
  };
  const confirmarMotivo = async () => {
    if (!targetId || !accion) return;
    if (motivo.trim().length < 3) return toast.error("Motivo requerido (mínimo 3 caracteres)");
    setSaving(true);
    const fn = accion === "anular" ? "anular_factura" : "cerrar_factura";
    const { error } = await supabase.rpc(fn as any, { _factura_id: targetId, _motivo: motivo.trim() });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(accion === "anular" ? "Factura anulada" : "Factura cerrada");
    setMotivoOpen(false);
    qc.invalidateQueries({ queryKey: ["facturas"] });
  };

  return (
    <div>
      <PageHeader title="Facturas" action={<Link to="/facturas/nueva" search={{}}><Button><Plus className="h-4 w-4 mr-2" />Nueva factura</Button></Link>} />
      <div className="relative mb-3 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por cliente, NCF o producto…"
          value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>
            <th className="text-left p-3">NCF</th><th className="text-left p-3">Fecha</th><th className="text-left p-3">Cliente</th>
            <th className="text-right p-3">Subtotal</th><th className="text-right p-3">ITBIS</th><th className="text-right p-3">Total</th>
            <th className="text-left p-3">Estado</th><th className="text-right p-3"></th>
          </tr></thead>
          <tbody>
            {filtered.map((f: any) => (
              <tr key={f.id} className="border-t border-border">
                <td className="p-3 font-mono">{f.ncf}</td>
                <td className="p-3">{fmtDate(f.fecha)}</td>
                <td className="p-3">{f.clientes?.razon_social}</td>
                <td className="p-3 text-right">{fmtMoney(f.subtotal)}</td>
                <td className="p-3 text-right">{fmtMoney(f.itbis)}</td>
                <td className="p-3 text-right font-semibold">{fmtMoney(f.total)}</td>
                <td className="p-3">
                  <span className={
                    f.estado === "pagada" ? "text-green-600" :
                    f.estado === "anulada" ? "text-red-600" :
                    f.estado === "cerrada" ? "text-muted-foreground" : "text-amber-600"
                  }>{f.estado}</span>
                  {f.motivo_estado && <div className="text-xs text-muted-foreground italic mt-0.5">{f.motivo_estado}</div>}
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Link to="/facturas/$id" params={{ id: f.id }}>
                    <Button size="sm" variant="ghost"><Eye className="h-3 w-3 mr-1" />Ver</Button>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => descargarPdf(f.id)}>
                    <FileDown className="h-3 w-3 mr-1" />PDF
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => abrirEnviarEmail(f)}>
                    <Mail className="h-3 w-3 mr-1" />Email
                  </Button>
                  {f.estado !== "anulada" && f.estado !== "cerrada" && (
                    <>
                      <Link to="/facturas/nueva" search={{ id: f.id }}>
                        <Button size="sm" variant="ghost"><Pencil className="h-3 w-3 mr-1" />Editar</Button>
                      </Link>
                      {f.estado !== "pagada" && (
                        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => abrirMotivo(f.id, "cerrar")}>
                          <Lock className="h-3 w-3 mr-1" />Cerrar
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => abrirMotivo(f.id, "anular")}>
                        <Ban className="h-3 w-3 mr-1" />Anular
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Sin facturas</td></tr>}
          </tbody>
        </table>
      </Card>

      <Dialog open={motivoOpen} onOpenChange={setMotivoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{accion === "anular" ? "Anular factura" : "Cerrar factura sin completar el pago"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {accion === "anular"
                ? "Indica el motivo de anulación. Esta acción revierte el asiento contable y restaura el inventario. Quedará registrada en auditoría."
                : "Indica el motivo del cierre. La factura quedará marcada como cerrada con saldo pendiente y se registrará en auditoría."}
            </p>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={4} placeholder="Motivo…" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMotivoOpen(false)}>Cancelar</Button>
            <Button onClick={confirmarMotivo} disabled={saving}
              className={accion === "anular" ? "bg-red-600 hover:bg-red-700 text-white" : ""}>
              {saving ? "Procesando…" : accion === "anular" ? "Anular" : "Cerrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar factura por correo {emailFactura?.ncf ? `— ${emailFactura.ncf}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Se enviará la factura al cliente {emailFactura?.clientes?.razon_social ?? ""}. Puedes editar el correo si lo necesitas.
            </p>
            <div>
              <Label>Correo del cliente</Label>
              <Input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="cliente@correo.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEmailOpen(false)}>Cancelar</Button>
            <Button onClick={enviarEmail} disabled={sending}>
              <Mail className="h-4 w-4 mr-2" />{sending ? "Enviando…" : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}