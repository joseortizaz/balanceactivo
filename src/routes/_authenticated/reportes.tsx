import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtMoney } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import {
  tipoIdDgii, fechaDgii, montoDgii, docDgii, rangoMes, downloadText,
  nombreArchivo, nombreArchivoXlsx, downloadXlsx, linea, categoriaA606,
} from "@/lib/dgii";


export const Route = createFileRoute("/_authenticated/reportes")({ component: Reportes });

function Reportes() {
  const now = new Date();
  const [mes, setMes] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const { inicio, fin, periodoDgii } = useMemo(() => rangoMes(mes), [mes]);

  return (
    <div>
      <PageHeader
        title="Reportes DGII"
        description="Formatos 606, 607, 608, IT-1 e IR-17 con exportación TXT para Oficina Virtual"
      />
      <Card className="p-4 mb-4 flex items-end gap-3">
        <div><Label>Período</Label><Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></div>
        <div className="text-sm text-muted-foreground">Del {inicio} al {fin}</div>
      </Card>

      <Tabs defaultValue="607">
        <TabsList>
          <TabsTrigger value="606">606 Compras</TabsTrigger>
          <TabsTrigger value="607">607 Ventas</TabsTrigger>
          <TabsTrigger value="608">608 Anulados</TabsTrigger>
          <TabsTrigger value="it1">IT-1 ITBIS</TabsTrigger>
          <TabsTrigger value="ir17">IR-17 Retenciones</TabsTrigger>
        </TabsList>
        <TabsContent value="606"><Reporte606 inicio={inicio} fin={fin} periodoDgii={periodoDgii} /></TabsContent>
        <TabsContent value="607"><Reporte607 inicio={inicio} fin={fin} periodoDgii={periodoDgii} /></TabsContent>
        <TabsContent value="608"><Reporte608 inicio={inicio} fin={fin} periodoDgii={periodoDgii} /></TabsContent>
        <TabsContent value="it1"><ReporteIT1 inicio={inicio} fin={fin} /></TabsContent>
        <TabsContent value="ir17"><ReporteIR17 inicio={inicio} fin={fin} /></TabsContent>
      </Tabs>
    </div>
  );
}

type Props = { inicio: string; fin: string; periodoDgii: string };

function useTenantRnc() {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: ["tenant-rnc", tenantId],
    enabled: !!tenantId,
    queryFn: async () => (await supabase.from("tenants").select("rnc").eq("id", tenantId!).maybeSingle()).data?.rnc ?? "",
  }).data ?? "";
}

// -------------------- 606: Compras --------------------
function Reporte606({ inicio, fin, periodoDgii }: Props) {
  const rnc = useTenantRnc();
  const { data } = useQuery({
    queryKey: ["reporte-606", inicio, fin],
    queryFn: async () => (await supabase
      .from("gastos")
      .select("*, proveedores(razon_social, documento, tipo_documento)")
      .gte("fecha", inicio).lte("fecha", fin)
      .neq("estado", "anulado")
      .order("fecha")
    ).data ?? [],
  });

  const gastos = data ?? [];
  const totales = gastos.reduce((s, g: any) => ({
    monto: s.monto + Number(g.subtotal),
    itbis: s.itbis + Number(g.itbis),
    itbisRet: s.itbisRet + Number(g.itbis_retenido),
    isrRet: s.isrRet + Number(g.isr_retenido),
    total: s.total + Number(g.total),
  }), { monto: 0, itbis: 0, itbisRet: 0, isrRet: 0, total: 0 });

  const exportarTxt = () => {
    // Header: 606|RNC|PERIODO|CANTIDAD_REGISTROS|TOTAL_MONTO_FACTURADO
    const header = linea("606", docDgii(rnc), periodoDgii, gastos.length, montoDgii(totales.monto));
    const lineas = gastos.map((g: any) => linea(
      docDgii(g.proveedores?.documento),
      tipoIdDgii(g.proveedores?.tipo_documento),
      categoriaA606[g.categoria] ?? "09",
      g.ncf ?? "",
      "", // NCF modificado
      fechaDgii(g.fecha),
      g.estado === "pagado" ? fechaDgii(g.fecha) : "",
      "0.00", // Servicios (no discriminado)
      montoDgii(g.subtotal), // Bienes (asumido)
      montoDgii(g.subtotal),
      montoDgii(g.itbis),
      montoDgii(g.itbis_retenido),
      "0.00", "0.00",
      montoDgii(g.itbis),
      "0.00", "0.00",
      montoDgii(g.isr_retenido),
      "0.00", "0.00", "0.00", "0.00",
    ));
    downloadText(nombreArchivo("606", rnc, periodoDgii), [header, ...lineas].join("\r\n") + "\r\n");
  };

  const exportarXlsx = () => downloadXlsx(
    nombreArchivoXlsx("606", rnc, periodoDgii), "606 Compras",
    ["RNC/Cédula", "Tipo ID", "Tipo bien/servicio", "NCF", "Fecha", "Subtotal", "ITBIS", "ITBIS retenido", "ISR retenido", "Total", "Proveedor"],
    gastos.map((g: any) => [
      docDgii(g.proveedores?.documento),
      tipoIdDgii(g.proveedores?.tipo_documento),
      categoriaA606[g.categoria] ?? "09",
      g.ncf ?? "",
      g.fecha,
      Number(g.subtotal), Number(g.itbis), Number(g.itbis_retenido), Number(g.isr_retenido), Number(g.total),
      g.proveedores?.razon_social ?? "",
    ]),
  );

  return (
    <TabaBlock
      titulo="606 · Compras de Bienes y Servicios"
      resumen={`${gastos.length} comprobantes · Subtotal ${fmtMoney(totales.monto)} · ITBIS ${fmtMoney(totales.itbis)} · Retenido ITBIS ${fmtMoney(totales.itbisRet)} · Retenido ISR ${fmtMoney(totales.isrRet)}`}
      onExport={exportarTxt}
      onExportXlsx={exportarXlsx}
      disabled={gastos.length === 0}

      encabezados={["RNC/Céd.", "Tipo", "Cat.", "NCF", "Fecha", "Subtotal", "ITBIS", "ITBIS ret.", "ISR ret.", "Total"]}
      filas={gastos.map((g: any) => [
        g.proveedores?.documento ?? "—",
        tipoIdDgii(g.proveedores?.tipo_documento),
        categoriaA606[g.categoria] ?? "09",
        g.ncf ?? "—",
        g.fecha,
        fmtMoney(g.subtotal), fmtMoney(g.itbis),
        fmtMoney(g.itbis_retenido), fmtMoney(g.isr_retenido),
        fmtMoney(g.total),
      ])}
    />
  );
}

// -------------------- 607: Ventas --------------------
function Reporte607({ inicio, fin, periodoDgii }: Props) {
  const rnc = useTenantRnc();
  const { data } = useQuery({
    queryKey: ["reporte-607", inicio, fin],
    queryFn: async () => (await supabase
      .from("facturas")
      .select("*, clientes(razon_social, documento, tipo_documento)")
      .gte("fecha", inicio).lte("fecha", fin)
      .neq("estado", "anulada")
      .order("ncf")
    ).data ?? [],
  });

  const facts = data ?? [];
  const totales = facts.reduce((s, f: any) => ({
    subtotal: s.subtotal + Number(f.subtotal),
    itbis: s.itbis + Number(f.itbis),
    total: s.total + Number(f.total),
  }), { subtotal: 0, itbis: 0, total: 0 });

  const exportarTxt = () => {
    // Header: 607|RNC|PERIODO|CANTIDAD|TOTAL
    const header = linea("607", docDgii(rnc), periodoDgii, facts.length, montoDgii(totales.subtotal));
    const lineas = facts.map((f: any) => linea(
      docDgii(f.clientes?.documento),
      f.clientes?.documento ? tipoIdDgii(f.clientes?.tipo_documento) : "",
      f.ncf,
      "", // NCF modificado
      "01", // Tipo ingreso: 01 = Ingresos por operaciones
      fechaDgii(f.fecha),
      "", // Fecha retención
      montoDgii(f.subtotal),
      montoDgii(f.itbis),
      "0.00", "0.00", "0.00", "0.00",
      // Formas de pago (agrupamos en Efectivo/Crédito según condición)
      f.condicion_pago === "contado" ? montoDgii(f.total) : "0.00",
      "0.00", "0.00",
      f.condicion_pago === "credito" ? montoDgii(f.total) : "0.00",
      "0.00", "0.00", "0.00",
    ));
    downloadText(nombreArchivo("607", rnc, periodoDgii), [header, ...lineas].join("\r\n") + "\r\n");
  };

  const exportarXlsx = () => downloadXlsx(
    nombreArchivoXlsx("607", rnc, periodoDgii), "607 Ventas",
    ["NCF", "RNC/Cédula", "Tipo ID", "Cliente", "Fecha", "Condición", "Subtotal", "ITBIS", "Total"],
    facts.map((f: any) => [
      f.ncf,
      docDgii(f.clientes?.documento),
      f.clientes?.documento ? tipoIdDgii(f.clientes?.tipo_documento) : "",
      f.clientes?.razon_social ?? "",
      f.fecha,
      f.condicion_pago ?? "",
      Number(f.subtotal), Number(f.itbis), Number(f.total),
    ]),
  );

  return (
    <TabaBlock
      titulo="607 · Ventas de Bienes y Servicios"
      resumen={`${facts.length} comprobantes · Subtotal ${fmtMoney(totales.subtotal)} · ITBIS ${fmtMoney(totales.itbis)} · Total ${fmtMoney(totales.total)}`}
      onExport={exportarTxt}
      onExportXlsx={exportarXlsx}
      disabled={facts.length === 0}

      encabezados={["NCF", "RNC/Céd.", "Cliente", "Fecha", "Subtotal", "ITBIS", "Total"]}
      filas={facts.map((f: any) => [
        f.ncf,
        f.clientes?.documento ?? "—",
        f.clientes?.razon_social ?? "—",
        f.fecha,
        fmtMoney(f.subtotal), fmtMoney(f.itbis), fmtMoney(f.total),
      ])}
    />
  );
}

// -------------------- 608: Comprobantes anulados --------------------
function Reporte608({ inicio, fin, periodoDgii }: Props) {
  const rnc = useTenantRnc();
  const { data } = useQuery({
    queryKey: ["reporte-608", inicio, fin],
    queryFn: async () => (await supabase
      .from("facturas")
      .select("ncf, fecha, motivo_estado")
      .gte("fecha", inicio).lte("fecha", fin)
      .eq("estado", "anulada")
      .order("ncf")
    ).data ?? [],
  });
  const facts = data ?? [];

  const exportarTxt = () => {
    const header = linea("608", docDgii(rnc), periodoDgii, facts.length);
    const lineas = facts.map((f: any) => linea(
      f.ncf, fechaDgii(f.fecha),
      "02", // 02 = Errores de impresión / genérico
    ));
    downloadText(nombreArchivo("608", rnc, periodoDgii), [header, ...lineas].join("\r\n") + "\r\n");
  };

  return (
    <TabaBlock
      titulo="608 · Comprobantes anulados"
      resumen={`${facts.length} comprobantes anulados en el período`}
      onExport={exportarTxt}
      disabled={facts.length === 0}
      encabezados={["NCF", "Fecha", "Motivo"]}
      filas={facts.map((f: any) => [f.ncf, f.fecha, f.motivo_estado ?? "—"])}
    />
  );
}

// -------------------- IT-1: Declaración mensual ITBIS --------------------
function ReporteIT1({ inicio, fin }: { inicio: string; fin: string }) {
  const { data: ventas } = useQuery({
    queryKey: ["it1-ventas", inicio, fin],
    queryFn: async () => (await supabase.from("facturas")
      .select("subtotal, itbis, total").gte("fecha", inicio).lte("fecha", fin).neq("estado", "anulada")).data ?? [],
  });
  const { data: compras } = useQuery({
    queryKey: ["it1-compras", inicio, fin],
    queryFn: async () => (await supabase.from("gastos")
      .select("subtotal, itbis, itbis_retenido, total").gte("fecha", inicio).lte("fecha", fin).neq("estado", "anulado")).data ?? [],
  });

  const v = (ventas ?? []).reduce((s, f: any) => ({
    base: s.base + Number(f.subtotal),
    debito: s.debito + Number(f.itbis),
  }), { base: 0, debito: 0 });

  const c = (compras ?? []).reduce((s, g: any) => ({
    base: s.base + Number(g.subtotal),
    credito: s.credito + Number(g.itbis),
    retenido: s.retenido + Number(g.itbis_retenido),
  }), { base: 0, credito: 0, retenido: 0 });

  const saldo = v.debito - c.credito - c.retenido;

  return (
    <Card className="p-5 mt-4">
      <h3 className="font-semibold mb-4">IT-1 · Declaración Jurada del ITBIS</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Resumen mensual con los montos que se declaran en el formulario IT-1. Verifica con tu contador antes de presentar.
      </p>
      <div className="grid gap-2 max-w-xl">
        <RowIT label="Total ventas gravadas" value={v.base} />
        <RowIT label="ITBIS facturado (débito fiscal)" value={v.debito} strong />
        <RowIT label="Total compras gravadas" value={c.base} />
        <RowIT label="ITBIS pagado en compras (crédito fiscal)" value={c.credito} />
        <RowIT label="ITBIS retenido a terceros" value={c.retenido} />
        <div className="border-t border-border my-2" />
        <RowIT
          label={saldo >= 0 ? "ITBIS a pagar" : "Saldo a favor"}
          value={Math.abs(saldo)}
          strong
          tone={saldo >= 0 ? "danger" : "success"}
        />
      </div>
    </Card>
  );
}

function RowIT({ label, value, strong, tone }: { label: string; value: number; strong?: boolean; tone?: "danger" | "success" }) {
  const color = tone === "danger" ? "text-destructive" : tone === "success" ? "text-emerald-600" : "";
  return (
    <div className={`flex justify-between py-1 ${strong ? "font-semibold" : ""} ${color}`}>
      <span>{label}</span><span>{fmtMoney(value)}</span>
    </div>
  );
}

// -------------------- IR-17: Retenciones a asalariados --------------------
function ReporteIR17({ inicio, fin }: { inicio: string; fin: string }) {
  const { data } = useQuery({
    queryKey: ["ir17", inicio, fin],
    queryFn: async () => {
      const { data: noms } = await supabase.from("nominas")
        .select("id, fecha_pago, periodo_inicio, periodo_fin")
        .gte("fecha_pago", inicio).lte("fecha_pago", fin)
        .in("estado", ["cerrada", "pagada"]);
      const ids = (noms ?? []).map((n) => n.id);
      if (ids.length === 0) return { detalle: [] as any[], nominas: [] };
      const { data: det } = await supabase.from("nomina_detalle")
        .select("empleado_id, salario_base, total_ingresos, isr, afp, sfs, empleados(nombres, apellidos, cedula)")
        .in("nomina_id", ids);
      return { detalle: det ?? [], nominas: noms ?? [] };
    },
  });

  // Agrupar por empleado
  const porEmpleado = new Map<string, { nombre: string; cedula: string; ingresos: number; afp: number; sfs: number; isr: number }>();
  for (const d of data?.detalle ?? []) {
    const emp = (d as any).empleados;
    const key = d.empleado_id;
    const cur = porEmpleado.get(key) ?? { nombre: `${emp?.nombres ?? ""} ${emp?.apellidos ?? ""}`.trim(), cedula: emp?.cedula ?? "", ingresos: 0, afp: 0, sfs: 0, isr: 0 };
    cur.ingresos += Number(d.total_ingresos);
    cur.afp += Number(d.afp);
    cur.sfs += Number(d.sfs);
    cur.isr += Number(d.isr);
    porEmpleado.set(key, cur);
  }
  const filas = Array.from(porEmpleado.values());
  const totalIsr = filas.reduce((s, f) => s + f.isr, 0);

  return (
    <Card className="p-5 mt-4">
      <h3 className="font-semibold mb-2">IR-17 · Retenciones de asalariados</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Retenciones de ISR aplicadas en nóminas cerradas/pagadas del período. Total retenido: <b>{fmtMoney(totalIsr)}</b>
      </p>
      {filas.length === 0 ? (
        <div className="text-sm text-muted-foreground">Sin nóminas en el período.</div>
      ) : (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left p-2">Cédula</th>
            <th className="text-left p-2">Empleado</th>
            <th className="text-right p-2">Ingresos</th>
            <th className="text-right p-2">AFP</th>
            <th className="text-right p-2">SFS</th>
            <th className="text-right p-2">ISR retenido</th>
          </tr></thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i} className="border-b border-border">
                <td className="p-2 font-mono">{f.cedula}</td>
                <td className="p-2">{f.nombre}</td>
                <td className="p-2 text-right">{fmtMoney(f.ingresos)}</td>
                <td className="p-2 text-right">{fmtMoney(f.afp)}</td>
                <td className="p-2 text-right">{fmtMoney(f.sfs)}</td>
                <td className="p-2 text-right">{fmtMoney(f.isr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

// -------------------- Layout auxiliar --------------------
function TabaBlock({
  titulo, resumen, onExport, onExportXlsx, disabled, encabezados, filas,
}: {
  titulo: string; resumen: string; onExport: () => void; onExportXlsx?: () => void; disabled?: boolean;
  encabezados: string[]; filas: (string | number)[][];
}) {
  return (
    <Card className="p-0 mt-4 overflow-hidden">
      <div className="p-4 bg-secondary flex flex-wrap gap-3 items-center justify-between">
        <div>
          <div className="font-semibold">{titulo}</div>
          <div className="text-xs text-muted-foreground">{resumen}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onExport} disabled={disabled}>
            <Download className="h-4 w-4 mr-2" />Exportar TXT DGII
          </Button>
          {onExportXlsx && (
            <Button size="sm" variant="outline" onClick={onExportXlsx} disabled={disabled}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />Exportar Excel
            </Button>
          )}
        </div>
      </div>

      {filas.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground">Sin datos en el período.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              {encabezados.map((h, i) => (
                <th key={i} className={`p-2 ${i >= encabezados.length - 5 ? "text-right" : "text-left"}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filas.map((row, i) => (
                <tr key={i} className="border-b border-border">
                  {row.map((c, j) => (
                    <td key={j} className={`p-2 ${j >= row.length - 5 ? "text-right font-mono" : ""}`}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}