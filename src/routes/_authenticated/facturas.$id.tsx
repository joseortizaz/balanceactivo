import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileDown, Printer } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { FacturaPreview } from "@/components/FacturaPreview";
import { generateFacturaPdf } from "@/lib/factura-pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/facturas/$id")({ component: VerFactura });

function VerFactura() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["factura-view", id],
    queryFn: async () => {
      const [{ data: f }, { data: lineas }, { data: tenantRows }] = await Promise.all([
        supabase.from("facturas").select("*, clientes(razon_social, documento, email, telefono, direccion)").eq("id", id).maybeSingle(),
        supabase.from("factura_lineas").select("descripcion, cantidad, precio, subtotal").eq("factura_id", id),
        supabase.from("tenants").select("razon_social, nombre_comercial, rnc, direccion, telefono, logo_url").limit(1),
      ]);
      return { f, lineas: lineas ?? [], tenant: (tenantRows ?? [])[0] ?? null };
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link to="/facturas"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Volver</Button></Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />Imprimir
          </Button>
          <Button size="sm" onClick={descargarPdf}>
            <FileDown className="h-4 w-4 mr-1" />Descargar PDF
          </Button>
        </div>
      </div>
      <FacturaPreview d={previewData} />
    </div>
  );
}