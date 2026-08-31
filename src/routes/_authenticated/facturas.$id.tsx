import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileDown, Printer, Ban, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate } from "@/lib/format";
import { FacturaPreview } from "@/components/FacturaPreview";
import { generateFacturaPdf } from "@/lib/factura-pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/facturas/$id")({ component: VerFactura });

function VerFactura() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [motivoOpen, setMotivoOpen] = useState(false);
  const [accion, setAccion] = useState<"anular" | "cerrar" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["factura-view", id],
    queryFn: async () => {
      const [{ data: f }, { data: lineas }, { data: tenantRows }] = await Promise.all([
        supabase.from("facturas").select("*, clientes(razon_social, documento, email, telefono, direccion)").eq("id", id).maybeSingle(),
        supabase.from("factura_lineas").select("descripcion, cantidad, precio, subtotal").eq("factura_id", id),
        supabase.from("tenants").select("razon_social, nombre_comercial, rnc, direccion, telefono, logo_url").limit(1),
      ]);
      const tenant = (tenantRows ?? [])[0] ?? null;
      let logoUrl: string | null = null;
      if (tenant?.logo_url) {
        const { data: sig } = await supabase.storage
          .from("tenant-assets")
          .createSignedUrl(tenant.logo_url, 3600);
        logoUrl = sig?.signedUrl ?? null;
      }
      return { f, lineas: lineas ?? [], tenant, logoUrl };
    },
  });

  if (isLoading) return <div className="p-6 text-muted-foreground">Cargando…</div>;
  if (!data?.f) return <div className="p-6 text-muted-foreground">Factura no encontrada</div>;

  const f: any = data.f;
  const t: any = data.tenant ?? {};
  const c: any = f.clientes ?? {};

  const previewData = {
    companyName: t.nombre_comercial || t.razon_social || "",
    companyRnc: t.rnc,
    companyAddress: t.direccion,
    companyPhone: t.telefono,
    companyEmail: null,
    companyLogoUrl: data.logoUrl,
    ncf: f.ncf,
    fechaEmision: fmtDate(f.fecha),
    fechaVencimiento: f.fecha_vencimiento ? fmtDate(f.fecha_vencimiento) : null,
    estado: f.estado,
    clienteNombre: c.razon_social || "—",
    clienteDocumento: c.documento,
    clienteEmail: c.email,
    clienteTelefono: c.telefono,
    clienteDireccion: c.direccion,
    lineas: data.lineas.map((l: any) => ({
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
  };

  const descargarPdf = async () => {
    try {
      const doc = await generateFacturaPdf(previewData);
      doc.save(`${f.ncf}.pdf`);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al generar PDF");
    }
  };

  const abrirMotivo = (acc: "anular" | "cerrar") => {
    setAccion(acc); setMotivo(""); setMotivoOpen(true);
  };

  const confirmarMotivo = async () => {
    if (!accion) return;
    if (motivo.trim().length < 3) return toast.error("Motivo requerido (mínimo 3 caracteres)");
    setSaving(true);
    const fn = accion === "anular" ? "anular_factura" : "cerrar_factura";
    const { error } = await supabase.rpc(fn as any, { _factura_id: id, _motivo: motivo.trim() });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(accion === "anular" ? "Factura anulada" : "Factura cerrada");
    setMotivoOpen(false);
    qc.invalidateQueries({ queryKey: ["factura-view", id] });
    qc.invalidateQueries({ queryKey: ["facturas"] });
  };

  const puedeAnularOCerrar = f.estado !== "anulada" && f.estado !== "cerrada";

  return (
    <div>
      <div className="flex items-center justify-between mb-4 print:hidden flex-wrap gap-2">
        <Link to="/facturas"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Volver</Button></Link>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />Imprimir
          </Button>
          <Button size="sm" onClick={descargarPdf}>
            <FileDown className="h-4 w-4 mr-1" />Descargar PDF
          </Button>
          {puedeAnularOCerrar && f.estado !== "pagada" && (
            <Button size="sm" variant="outline" className="text-muted-foreground" onClick={() => abrirMotivo("cerrar")}>
              <Lock className="h-4 w-4 mr-1" />Cerrar
            </Button>
          )}
          {puedeAnularOCerrar && (
            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => abrirMotivo("anular")}>
              <Ban className="h-4 w-4 mr-1" />Anular
            </Button>
          )}
        </div>
      </div>
      {f.motivo_estado && (
        <div className="mb-4 rounded-md border border-border bg-secondary/50 p-3 text-sm text-muted-foreground print:hidden">
          <span className="font-medium text-foreground">
            {f.estado === "anulada" ? "Motivo de anulación: " : f.estado === "cerrada" ? "Motivo de cierre: " : "Motivo: "}
          </span>
          {f.motivo_estado}
        </div>
      )}
      <FacturaPreview d={previewData} />

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
    </div>
  );
}
