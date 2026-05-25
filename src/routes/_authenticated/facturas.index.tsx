import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, FileDown } from "lucide-react";
import { fmtMoney, fmtDate } from "@/lib/format";
import { generateFacturaPdf } from "@/lib/factura-pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/facturas/")({ component: Facturas });

function Facturas() {
  const { data } = useQuery({
    queryKey: ["facturas"],
    queryFn: async () => (await supabase.from("facturas").select("*, clientes(razon_social, documento)").order("created_at", { ascending: false })).data ?? [],
  });

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

  return (
    <div>
      <PageHeader title="Facturas" action={<Link to="/facturas/nueva"><Button><Plus className="h-4 w-4 mr-2" />Nueva factura</Button></Link>} />
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>
            <th className="text-left p-3">NCF</th><th className="text-left p-3">Fecha</th><th className="text-left p-3">Cliente</th>
            <th className="text-right p-3">Subtotal</th><th className="text-right p-3">ITBIS</th><th className="text-right p-3">Total</th>
            <th className="text-left p-3">Estado</th><th className="text-right p-3"></th>
          </tr></thead>
          <tbody>
            {(data ?? []).map((f: any) => (
              <tr key={f.id} className="border-t border-border">
                <td className="p-3 font-mono">{f.ncf}</td>
                <td className="p-3">{fmtDate(f.fecha)}</td>
                <td className="p-3">{f.clientes?.razon_social}</td>
                <td className="p-3 text-right">{fmtMoney(f.subtotal)}</td>
                <td className="p-3 text-right">{fmtMoney(f.itbis)}</td>
                <td className="p-3 text-right font-semibold">{fmtMoney(f.total)}</td>
                <td className="p-3"><span className={f.estado === "pagada" ? "text-green-600" : "text-amber-600"}>{f.estado}</span></td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => descargarPdf(f.id)}>
                    <FileDown className="h-3 w-3 mr-1" />PDF
                  </Button>
                  {Number(f.monto_pagado ?? 0) === 0 && f.estado !== "anulada" && (
                    <Link to="/facturas/nueva" search={{ id: f.id }}>
                      <Button size="sm" variant="ghost"><Pencil className="h-3 w-3 mr-1" />Editar</Button>
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {(!data || data.length === 0) && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Sin facturas</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}