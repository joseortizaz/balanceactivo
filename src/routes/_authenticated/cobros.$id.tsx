import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileDown, Printer } from "lucide-react";
import { fmtDate, fmtMoney } from "@/lib/format";
import { ReciboPreview } from "@/components/ReciboPreview";
import { generateReciboPdf } from "@/lib/recibo-pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cobros/$id")({ component: VerRecibo });

const metodoLabel = (m: string) =>
  (({ efectivo: "Efectivo", transferencia: "Transferencia", deposito: "Depósito", cheque: "Cheque" }) as any)[m] ?? m;

function VerRecibo() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["recibo-view", id],
    queryFn: async () => {
      const { data: c } = await (supabase as any)
        .from("cobros")
        .select("*, facturas(ncf, total, monto_pagado, estado, clientes(razon_social, documento, email, telefono, direccion)), bancos(nombre)")
        .eq("id", id)
        .maybeSingle();
      const { data: tenantRows } = await supabase
        .from("tenants")
        .select("razon_social, nombre_comercial, rnc, direccion, telefono, logo_url")
        .limit(1);
      const tenant = (tenantRows ?? [])[0] ?? null;
      let logoUrl: string | null = null;
      if (tenant?.logo_url) {
        const { data: sig } = await supabase.storage
          .from("tenant-assets")
          .createSignedUrl(tenant.logo_url, 3600);
        logoUrl = sig?.signedUrl ?? null;
      }
      return { c, tenant, logoUrl };
    },
  });

  if (isLoading) return <div className="p-6 text-muted-foreground">Cargando…</div>;
  if (!data?.c) return <div className="p-6 text-muted-foreground">Recibo no encontrado</div>;

  const c: any = data.c;
  const t: any = data.tenant ?? {};
  const f: any = c.facturas ?? {};
  const cli: any = f.clientes ?? {};
  const total = Number(f.total ?? 0);
  const pagado = Number(f.monto_pagado ?? 0);
  const recNum = `REC-${String(c.id).slice(0, 8).toUpperCase()}`;
  const estado = c.estado === "anulado" ? "ANULADO" : "PAGADO";

  const previewData = {
    companyName: t.nombre_comercial || t.razon_social || "",
    companyRnc: t.rnc,
    companyAddress: t.direccion,
    companyPhone: t.telefono,
    companyEmail: null,
    companyLogoUrl: data.logoUrl,
    receiptNumber: recNum,
    fechaEmision: fmtDate(c.fecha),
    estado,
    clienteNombre: cli.razon_social || "—",
    clienteDocumento: cli.documento,
    clienteEmail: cli.email,
    clienteTelefono: cli.telefono,
    clienteDireccion: cli.direccion,
    invoiceNcf: f.ncf ?? "—",
    invoiceTotal: total,
    montoPagado: Number(c.monto ?? 0),
    saldoPendiente: Math.max(total - pagado, 0),
    metodoPago: metodoLabel(c.metodo ?? ""),
    bancoNombre: c.bancos?.nombre ?? null,
    nota: c.nota,
  };

  const descargarPdf = async () => {
    try {
      const doc = await generateReciboPdf({
        companyName: previewData.companyName,
        companyRnc: previewData.companyRnc,
        companyAddress: previewData.companyAddress,
        companyPhone: previewData.companyPhone,
        companyLogoUrl: previewData.companyLogoUrl,
        receiptNumber: recNum,
        paymentDate: fmtDate(c.fecha),
        estado,
        clientName: previewData.clienteNombre,
        clientDocumento: previewData.clienteDocumento,
        clientEmail: previewData.clienteEmail,
        clientTelefono: previewData.clienteTelefono,
        clientDireccion: previewData.clienteDireccion,
        invoiceNcf: previewData.invoiceNcf,
        invoiceTotal: fmtMoney(previewData.invoiceTotal),
        amountPaid: fmtMoney(previewData.montoPagado),
        amountPending: fmtMoney(previewData.saldoPendiente),
        paymentMethod: previewData.metodoPago,
        bankName: previewData.bancoNombre,
        note: previewData.nota,
      });
      doc.save(`${recNum}.pdf`);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al generar PDF");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link to="/cobros"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Volver</Button></Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />Imprimir
          </Button>
          <Button size="sm" onClick={descargarPdf}>
            <FileDown className="h-4 w-4 mr-1" />Descargar PDF
          </Button>
        </div>
      </div>
      <ReciboPreview d={previewData} />
    </div>
  );
}