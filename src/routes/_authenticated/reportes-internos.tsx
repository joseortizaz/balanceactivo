import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FileSpreadsheet, TrendingUp, TrendingDown, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtMoney } from "@/lib/format";
import { downloadXlsx } from "@/lib/dgii";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/reportes-internos")({
  component: ReportesInternos,
  head: () => ({
    meta: [
      { title: "Reportes de ingresos y gastos | Balance Activo" },
      { name: "description", content: "Reportes internos de ingresos, gastos y rentabilidad por período, con productos más rentables y desglose de gastos." },
      { property: "og:title", content: "Reportes de ingresos y gastos | Balance Activo" },
      { property: "og:description", content: "Analiza ingresos, gastos y productos más rentables por mes, trimestre, semestre, año o período personalizado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Preset = "mensual" | "trimestral" | "semestral" | "anual" | "personalizado";

const iso = (d: Date) => d.toISOString().slice(0, 10);

function rango(preset: Preset, anio: number, indice: number) {
  if (preset === "mensual") return { inicio: iso(new Date(Date.UTC(anio, indice, 1))), fin: iso(new Date(Date.UTC(anio, indice + 1, 0))) };
  if (preset === "trimestral") return { inicio: iso(new Date(Date.UTC(anio, indice * 3, 1))), fin: iso(new Date(Date.UTC(anio, indice * 3 + 3, 0))) };
  if (preset === "semestral") return { inicio: iso(new Date(Date.UTC(anio, indice * 6, 1))), fin: iso(new Date(Date.UTC(anio, indice * 6 + 6, 0))) };
  return { inicio: iso(new Date(Date.UTC(anio, 0, 1))), fin: iso(new Date(Date.UTC(anio, 12, 0))) };
}

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const CATEGORIAS: Record<string, string> = {
  "01_personal": "Gastos de personal",
  "02_trabajos_suministros": "Trabajos, suministros y servicios",
  "03_arrendamientos": "Arrendamientos",
  "04_activos_fijos": "Activos fijos",
  "05_operacionales": "Gastos operacionales",
  "06_financieros": "Gastos financieros",
  "07_seguros": "Seguros",
  "08_combustibles": "Combustibles",
  "09_otros": "Otros gastos",
};

function ReportesInternos() {
  const { hasRole } = useAuth();
  const now = new Date();
  const [preset, setPreset] = useState<Preset>("mensual");
  const [anio, setAnio] = useState(now.getFullYear());
  const [indice, setIndice] = useState(now.getMonth());
  const [desde, setDesde] = useState(iso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))));
  const [hasta, setHasta] = useState(iso(now));

  const { inicio, fin } = useMemo(() => {
    if (preset === "personalizado") return { inicio: desde, fin: hasta };
    return rango(preset, anio, indice);
  }, [preset, anio, indice, desde, hasta]);

  const opciones = preset === "mensual"
    ? MESES.map((m, i) => ({ v: i, l: m }))
    : preset === "trimestral"
      ? [0, 1, 2, 3].map((i) => ({ v: i, l: `Trimestre ${i + 1}` }))
      : preset === "semestral"
        ? [0, 1].map((i) => ({ v: i, l: `Semestre ${i + 1}` }))
        : [];

  const { data: ingresos = [], isLoading: loadIng } = useQuery({
    queryKey: ["ri-ingresos", inicio, fin],
    queryFn: async () => (await supabase.from("facturas")
      .select("id, fecha, ncf, subtotal, itbis, total, estado, condicion_pago, clientes(razon_social)")
      .gte("fecha", inicio).lte("fecha", fin).neq("estado", "anulada").order("fecha")).data ?? [],
  });

  const { data: lineas = [] } = useQuery({
    queryKey: ["ri-lineas", inicio, fin, ingresos.length],
    enabled: ingresos.length >= 0,
    queryFn: async () => {
      const ids = ingresos.map((f: any) => f.id);
      if (!ids.length) return [];
      const out: any[] = [];
      for (let i = 0; i < ids.length; i += 200) {
        const { data } = await supabase.from("factura_lineas")
          .select("descripcion, producto_id, cantidad, subtotal, total")
          .in("factura_id", ids.slice(i, i + 200));
        out.push(...(data ?? []));
      }
      return out;
    },
  });

  const { data: gastos = [], isLoading: loadGas, error: errGastos } = useQuery({
    queryKey: ["ri-gastos", inicio, fin],
    queryFn: async () => {
      const res = await supabase.from("gastos")
        .select("fecha, concepto, categoria, subtotal, itbis, total, estado, proveedores(razon_social), cuentas_contables!gastos_cuenta_gasto_id_fkey(codigo, nombre)")
        .gte("fecha", inicio).lte("fecha", fin).neq("estado", "anulado").order("fecha");
      if (res.error) throw res.error;
      return res.data ?? [];
    },
  });

  const totIng = ingresos.reduce((s, f: any) => s + Number(f.subtotal), 0);
  const totGas = gastos.reduce((s, g: any) => s + Number(g.subtotal), 0);
  const margen = totIng - totGas;

  // Ranking de productos / servicios
  const productos = useMemo(() => {
    const m = new Map<string, { nombre: string; cantidad: number; ingreso: number }>();
    for (const l of lineas as any[]) {
      const key = l.producto_id ?? `desc:${l.descripcion}`;
      const cur = m.get(key) ?? { nombre: l.descripcion, cantidad: 0, ingreso: 0 };
      cur.cantidad += Number(l.cantidad);
      cur.ingreso += Number(l.subtotal);
      m.set(key, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.ingreso - a.ingreso);
  }, [lineas]);

  const porCategoria = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of gastos as any[]) m.set(g.categoria, (m.get(g.categoria) ?? 0) + Number(g.subtotal));
    return Array.from(m.entries()).map(([k, v]) => ({ categoria: CATEGORIAS[k] ?? k, monto: v })).sort((a, b) => b.monto - a.monto);
  }, [gastos]);

  const porProveedor = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of gastos as any[]) {
      const n = g.proveedores?.razon_social ?? "Sin proveedor";
      m.set(n, (m.get(n) ?? 0) + Number(g.subtotal));
    }
    return Array.from(m.entries()).map(([k, v]) => ({ proveedor: k, monto: v })).sort((a, b) => b.monto - a.monto);
  }, [gastos]);

  const etiqueta = `${inicio} al ${fin}`;

  const exportarResumen = () => downloadXlsx(
    `Reporte_Ingresos_Gastos_${inicio}_${fin}.xlsx`, "Resumen",
    ["Concepto", "Monto"],
    [
      ["Período", `${inicio} a ${fin}`],
      ["Ingresos (sin ITBIS)", totIng],
      ["ITBIS facturado", ingresos.reduce((s, f: any) => s + Number(f.itbis), 0)],
      ["Total facturado", ingresos.reduce((s, f: any) => s + Number(f.total), 0)],
      ["Gastos (sin ITBIS)", totGas],
      ["ITBIS en compras", gastos.reduce((s, g: any) => s + Number(g.itbis), 0)],
      ["Total gastos", gastos.reduce((s, g: any) => s + Number(g.total), 0)],
      ["Resultado (ingresos - gastos)", margen],
    ],
  );

  if (!hasRole("administrador")) {
    return (
      <div>
        <PageHeader title="Reportes internos" description="Ingresos, gastos y rentabilidad" />
        <Card className="p-6 text-sm text-muted-foreground">
          Esta sección está disponible únicamente para administradores de la empresa.
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Reportes de ingresos y gastos"
        description="Análisis interno por período con productos más rentables y desglose de gastos"
      />

      <Card className="p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Label>Tipo de período</Label>
          <Select value={preset} onValueChange={(v) => setPreset(v as Preset)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mensual">Mensual</SelectItem>
              <SelectItem value="trimestral">Trimestral</SelectItem>
              <SelectItem value="semestral">Semestral</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
              <SelectItem value="personalizado">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {preset !== "personalizado" && (
          <div className="w-28">
            <Label>Año</Label>
            <Input type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value) || now.getFullYear())} />
          </div>
        )}

        {opciones.length > 0 && (
          <div className="w-44">
            <Label>Período</Label>
            <Select value={String(indice)} onValueChange={(v) => setIndice(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {opciones.map((o) => <SelectItem key={o.v} value={String(o.v)}>{o.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {preset === "personalizado" && (
          <>
            <div><Label>Desde</Label><Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
            <div><Label>Hasta</Label><Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
          </>
        )}

        <div className="text-sm text-muted-foreground ml-auto">Del {etiqueta}</div>
        <Button size="sm" variant="outline" onClick={exportarResumen}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />Resumen Excel
        </Button>
      </Card>

      {errGastos && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          No se pudieron cargar los gastos: {(errGastos as any).message ?? String(errGastos)}
          {String((errGastos as any).message ?? "").toLowerCase().includes("relationship") && (
            <> — probablemente falta aplicar la migración que agrega las foreign keys de <code>gastos.proveedor_id</code> y <code>gastos.cuenta_gasto_id</code>.</>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3 mb-4">
        <Kpi label="Ingresos (sin ITBIS)" value={totIng} icon={TrendingUp} tone="success" loading={loadIng} />
        <Kpi label="Gastos (sin ITBIS)" value={totGas} icon={TrendingDown} tone="danger" loading={loadGas} />
        <Kpi label="Resultado del período" value={margen} icon={Scale} tone={margen >= 0 ? "success" : "danger"} />
      </div>

      <Tabs defaultValue="ingresos">
        <TabsList>
          <TabsTrigger value="ingresos">Ingresos</TabsTrigger>
          <TabsTrigger value="productos">Productos más rentables</TabsTrigger>
          <TabsTrigger value="gastos">Gastos</TabsTrigger>
          <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
        </TabsList>

        <TabsContent value="ingresos">
          <Bloque
            titulo="Detalle de ingresos facturados"
            resumen={`${ingresos.length} facturas · Subtotal ${fmtMoney(totIng)}`}
            encabezados={["Fecha", "NCF", "Cliente", "Condición", "Subtotal", "ITBIS", "Total"]}
            filas={ingresos.map((f: any) => [f.fecha, f.ncf, f.clientes?.razon_social ?? "—", f.condicion_pago, fmtMoney(f.subtotal), fmtMoney(f.itbis), fmtMoney(f.total)])}
            onExport={() => downloadXlsx(`Ingresos_${inicio}_${fin}.xlsx`, "Ingresos",
              ["Fecha", "NCF", "Cliente", "Condición", "Subtotal", "ITBIS", "Total"],
              ingresos.map((f: any) => [f.fecha, f.ncf, f.clientes?.razon_social ?? "", f.condicion_pago, Number(f.subtotal), Number(f.itbis), Number(f.total)]))}
          />
        </TabsContent>

        <TabsContent value="productos">
          <Bloque
            titulo="Productos y servicios con mayores ingresos"
            resumen={`${productos.length} ítems facturados en el período`}
            encabezados={["#", "Producto / servicio", "Cantidad", "Ingreso", "% del total"]}
            filas={productos.map((p, i) => [
              i + 1, p.nombre, p.cantidad, fmtMoney(p.ingreso),
              totIng > 0 ? `${((p.ingreso / totIng) * 100).toFixed(1)}%` : "—",
            ])}
            onExport={() => downloadXlsx(`Productos_${inicio}_${fin}.xlsx`, "Productos",
              ["Producto / servicio", "Cantidad", "Ingreso", "% del total"],
              productos.map((p) => [p.nombre, p.cantidad, p.ingreso, totIng > 0 ? Number(((p.ingreso / totIng) * 100).toFixed(2)) : 0]))}
          />
        </TabsContent>

        <TabsContent value="gastos">
          <div className="grid gap-4 lg:grid-cols-2">
            <Bloque
              titulo="Gastos por categoría"
              resumen={`Total ${fmtMoney(totGas)}`}
              encabezados={["Categoría", "Monto", "% del total"]}
              filas={porCategoria.map((c) => [c.categoria, fmtMoney(c.monto), totGas > 0 ? `${((c.monto / totGas) * 100).toFixed(1)}%` : "—"])}
              onExport={() => downloadXlsx(`Gastos_categoria_${inicio}_${fin}.xlsx`, "Categorías",
                ["Categoría", "Monto"], porCategoria.map((c) => [c.categoria, c.monto]))}
            />
            <Bloque
              titulo="Gastos por proveedor"
              resumen={`${porProveedor.length} proveedores`}
              encabezados={["Proveedor", "Monto", "% del total"]}
              filas={porProveedor.map((p) => [p.proveedor, fmtMoney(p.monto), totGas > 0 ? `${((p.monto / totGas) * 100).toFixed(1)}%` : "—"])}
              onExport={() => downloadXlsx(`Gastos_proveedor_${inicio}_${fin}.xlsx`, "Proveedores",
                ["Proveedor", "Monto"], porProveedor.map((p) => [p.proveedor, p.monto]))}
            />
          </div>
          <Bloque
            titulo="Detalle de gastos"
            resumen={`${gastos.length} gastos · Subtotal ${fmtMoney(totGas)}`}
            encabezados={["Fecha", "Proveedor", "Concepto", "Cuenta", "Subtotal", "ITBIS", "Total"]}
            filas={gastos.map((g: any) => [
              g.fecha, g.proveedores?.razon_social ?? "—", g.concepto,
              g.cuentas_contables ? `${g.cuentas_contables.codigo} ${g.cuentas_contables.nombre}` : "—",
              fmtMoney(g.subtotal), fmtMoney(g.itbis), fmtMoney(g.total),
            ])}
            onExport={() => downloadXlsx(`Gastos_${inicio}_${fin}.xlsx`, "Gastos",
              ["Fecha", "Proveedor", "Concepto", "Categoría", "Cuenta", "Subtotal", "ITBIS", "Total"],
              gastos.map((g: any) => [
                g.fecha, g.proveedores?.razon_social ?? "", g.concepto,
                CATEGORIAS[g.categoria] ?? g.categoria,
                g.cuentas_contables ? `${g.cuentas_contables.codigo} ${g.cuentas_contables.nombre}` : "",
                Number(g.subtotal), Number(g.itbis), Number(g.total),
              ]))}
          />
        </TabsContent>

        <TabsContent value="comparativo">
          <Bloque
            titulo="Ingresos vs. gastos por mes"
            resumen={`Resultado acumulado ${fmtMoney(margen)}`}
            encabezados={["Mes", "Ingresos", "Gastos", "Resultado"]}
            filas={mensualizar(ingresos, gastos).map((r) => [r.mes, fmtMoney(r.ingresos), fmtMoney(r.gastos), fmtMoney(r.resultado)])}
            onExport={() => downloadXlsx(`Comparativo_${inicio}_${fin}.xlsx`, "Comparativo",
              ["Mes", "Ingresos", "Gastos", "Resultado"],
              mensualizar(ingresos, gastos).map((r) => [r.mes, r.ingresos, r.gastos, r.resultado]))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function mensualizar(ingresos: any[], gastos: any[]) {
  const m = new Map<string, { ingresos: number; gastos: number }>();
  for (const f of ingresos) {
    const k = String(f.fecha).slice(0, 7);
    const c = m.get(k) ?? { ingresos: 0, gastos: 0 };
    c.ingresos += Number(f.subtotal); m.set(k, c);
  }
  for (const g of gastos) {
    const k = String(g.fecha).slice(0, 7);
    const c = m.get(k) ?? { ingresos: 0, gastos: 0 };
    c.gastos += Number(g.subtotal); m.set(k, c);
  }
  return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, v]) => ({ mes, ingresos: v.ingresos, gastos: v.gastos, resultado: v.ingresos - v.gastos }));
}

function Kpi({ label, value, icon: Icon, tone, loading }: {
  label: string; value: number; icon: React.ComponentType<{ className?: string }>;
  tone: "success" | "danger"; loading?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{label}</div>
        <Icon className={`h-4 w-4 ${tone === "success" ? "text-emerald-600" : "text-destructive"}`} />
      </div>
      <div className="text-2xl font-semibold mt-1">{loading ? "…" : fmtMoney(value)}</div>
    </Card>
  );
}

function Bloque({ titulo, resumen, encabezados, filas, onExport }: {
  titulo: string; resumen: string; encabezados: string[]; filas: (string | number)[][]; onExport: () => void;
}) {
  return (
    <Card className="p-0 mt-4 overflow-hidden">
      <div className="p-4 bg-secondary flex flex-wrap gap-3 items-center justify-between">
        <div>
          <div className="font-semibold">{titulo}</div>
          <div className="text-xs text-muted-foreground">{resumen}</div>
        </div>
        <Button size="sm" variant="outline" onClick={onExport} disabled={filas.length === 0}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />Exportar Excel
        </Button>
      </div>
      {filas.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground">Sin datos en el período.</div>
      ) : (
        <div className="overflow-x-auto max-h-[520px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border">
                {encabezados.map((h, i) => (
                  <th key={i} className={`p-2 ${i >= encabezados.length - 3 ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((row, i) => (
                <tr key={i} className="border-b border-border">
                  {row.map((c, j) => (
                    <td key={j} className={`p-2 ${j >= row.length - 3 ? "text-right font-mono" : ""}`}>{c}</td>
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
