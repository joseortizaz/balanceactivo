import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileCheck, Pencil, FileDown } from "lucide-react";
import { fmtMoney, fmtDate } from "@/lib/format";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { generateFacturaPdf } from "@/lib/factura-pdf";

export const Route = createFileRoute("/_authenticated/cotizaciones/")({ component: Cotizaciones });

function Cotizaciones() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["cotizaciones"],
    queryFn: async () => (await supabase.from("cotizaciones").select("*, clientes(razon_social)").order("created_at", { ascending: false })).data ?? [],
  });

  const cambiarEstado = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: "borrador"|"enviada"|"aprobada"|"rechazada"|"convertida"|"vencida" }) => {
      const { error } = await supabase.from("cotizaciones").update({ estado }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cotizaciones"] }); toast.success("Estado actualizado"); },
    onError: (e: any) => toast.error(e.message),
  });

  const descargarPdf = async (cotizacionId: string) => {
    try {
      const [{ data: cot }, { data: lineas }, { data: tenantRows }] = await Promise.all([
        supabase.from("cotizaciones").select("*, clientes(razon_social, documento, email, telefono, direccion)").eq("id", cotizacionId).maybeSingle(),
        supabase.from("cotizacion_lineas").select("descripcion, cantidad, precio, subtotal").eq("cotizacion_id", cotizacionId),
        supabase.from("tenants").select("razon_social, nombre_comercial, rnc, direccion, telefono, logo_url").limit(1),
      ]);
      if (!cot) return toast.error("Cotización no encontrada");
      const t: any = (tenantRows ?? [])[0] ?? {};
      const c: any = (cot as any).clientes ?? {};
      let logoUrl: string | null = null;
      if (t.logo_url) {
        const { data: sig } = await supabase.storage.from("tenant-assets").createSignedUrl(t.logo_url, 3600);
        logoUrl = sig?.signedUrl ?? null;
      }
      const validoHasta = new Date(new Date(cot.fecha + "T00:00:00Z").getTime() + Number(cot.validez_dias || 0) * 86400000)
        .toISOString().slice(0, 10);
      const doc = await generateFacturaPdf({
        documentTitle: "COTIZACIÓN",
        clienteLabel: "COTIZAR A",
        companyName: t.nombre_comercial || t.razon_social || "",
        companyRnc: t.rnc,
        companyAddress: t.direccion,
        companyPhone: t.telefono,
        companyEmail: null,
        companyLogoUrl: logoUrl,
        ncf: cot.numero,
        fechaEmision: fmtDate(cot.fecha),
        condicionTexto: `Válida por ${cot.validez_dias} días (vence ${fmtDate(validoHasta)})`,
        estado: cot.estado,
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
        subtotal: Number(cot.subtotal),
        descuento: Number(cot.descuento ?? 0),
        itbis: Number(cot.itbis ?? 0),
        total: Number(cot.total),
      });
      doc.save(`${cot.numero}.pdf`);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al generar PDF");
    }
  };

  const convertir = async (id: string) => {
    const { data: fid, error } = await supabase.rpc("convertir_cotizacion_a_factura", {
      _cotizacion_id: id, _tipo_ncf: "B02", _condicion: "contado", _cuotas: null,
    });
    if (error) return toast.error(error.message);
    toast.success("Cotización convertida a factura");
    qc.invalidateQueries({ queryKey: ["cotizaciones"] });
    navigate({ to: "/facturas" });
  };

  const colorEstado = (e: string) => ({
    borrador: "text-muted-foreground", enviada: "text-blue-600", aprobada: "text-green-600",
    rechazada: "text-destructive", convertida: "text-primary", vencida: "text-amber-600",
  } as Record<string,string>)[e] ?? "";

  return (
    <div>
      <PageHeader title="Cotizaciones" description="Presupuestos enviados a clientes antes de facturar"
        action={<Link to="/cotizaciones/nueva" search={{ id: undefined }}><Button><Plus className="h-4 w-4 mr-2" />Nueva cotización</Button></Link>} />
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>
            <th className="text-left p-3">Número</th><th className="text-left p-3">Fecha</th><th className="text-left p-3">Cliente</th>
            <th className="text-right p-3">Total</th><th className="text-left p-3">Estado</th><th className="text-right p-3">Acciones</th>
          </tr></thead>
          <tbody>
            {(data ?? []).map((c: any) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-mono">{c.numero}</td>
                <td className="p-3">{fmtDate(c.fecha)}</td>
                <td className="p-3">{c.clientes?.razon_social}</td>
                <td className="p-3 text-right font-semibold">{fmtMoney(c.total)}</td>
                <td className="p-3"><span className={colorEstado(c.estado)}>{c.estado}</span></td>
                <td className="p-3 text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => descargarPdf(c.id)}>
                    <FileDown className="h-3 w-3 mr-1" />PDF
                  </Button>
                  {c.estado === "borrador" && (
                    <Link to="/cotizaciones/nueva" search={{ id: c.id }}>
                      <Button size="sm" variant="ghost"><Pencil className="h-3 w-3 mr-1" />Editar</Button>
                    </Link>
                  )}
                  {c.estado === "borrador" && <Button size="sm" variant="outline" onClick={() => cambiarEstado.mutate({ id: c.id, estado: "enviada" })}>Enviar</Button>}
                  {c.estado === "enviada" && <Button size="sm" variant="outline" onClick={() => cambiarEstado.mutate({ id: c.id, estado: "aprobada" })}>Aprobar</Button>}
                  {(c.estado === "aprobada" || c.estado === "enviada") && (
                    <Button size="sm" onClick={() => convertir(c.id)}><FileCheck className="h-3 w-3 mr-1" />Facturar</Button>
                  )}
                </td>
              </tr>
            ))}
            {(!data || data.length === 0) && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Sin cotizaciones</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}