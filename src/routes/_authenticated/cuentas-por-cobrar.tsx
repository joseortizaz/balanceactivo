import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { fmtMoney, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/cuentas-por-cobrar")({ component: CuentasPorCobrar });

type EstadoCobro = "al_dia" | "en_mora" | "saldado" | "anulado";

type CuentaRow = {
  factura_id: string;
  cliente_id: string;
  cliente_nombre: string;
  cliente_email: string | null;
  ncf: string;
  fecha: string;
  total: number;
  monto_pagado: number;
  saldo_pendiente: number;
  estado_factura: string;
  condicion_pago: string;
  proxima_fecha_vencimiento: string | null;
  dias_mora: number;
  estado_cobro: EstadoCobro;
};

const ESTADO_LABEL: Record<EstadoCobro, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  al_dia: { label: "Al día", variant: "secondary" },
  en_mora: { label: "En mora", variant: "destructive" },
  saldado: { label: "Saldado", variant: "default" },
  anulado: { label: "Anulado", variant: "outline" },
};

function CuentasPorCobrar() {
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<"todos" | EstadoCobro>("todos");

  const { data, isLoading, error } = useQuery({
    queryKey: ["cuentas-por-cobrar"],
    queryFn: async () => {
      const res = await supabase
        .from("v_cuentas_por_cobrar")
        .select("*")
        .order("dias_mora", { ascending: false });
      if (res.error) throw res.error;
      return (res.data ?? []) as CuentaRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((c) => {
      if (estado !== "todos" && c.estado_cobro !== estado) return false;
      if (!q) return true;
      return c.cliente_nombre.toLowerCase().includes(q) || c.ncf.toLowerCase().includes(q);
    });
  }, [data, search, estado]);

  const resumen = useMemo(() => {
    const base = { al_dia: 0, en_mora: 0, saldado: 0, anulado: 0, saldoEnMora: 0 };
    for (const c of data ?? []) {
      base[c.estado_cobro]++;
      if (c.estado_cobro === "en_mora") base.saldoEnMora += Number(c.saldo_pendiente);
    }
    return base;
  }, [data]);

  return (
    <div>
      <PageHeader
        title="Cuentas por Cobrar"
        description="Facturas a crédito: estado de cobro, mora y saldo pendiente"
      />

      <div className="grid sm:grid-cols-4 gap-3 mb-5">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Al día</div>
          <div className="text-2xl font-bold">{resumen.al_dia}</div>
        </Card>
        <Card className="p-4 border-destructive/40">
          <div className="text-xs text-muted-foreground">En mora</div>
          <div className="text-2xl font-bold text-destructive">{resumen.en_mora}</div>
          <div className="text-xs text-muted-foreground mt-1">{fmtMoney(resumen.saldoEnMora)} pendiente</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Saldadas</div>
          <div className="text-2xl font-bold">{resumen.saldado}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Anuladas</div>
          <div className="text-2xl font-bold">{resumen.anulado}</div>
        </Card>
      </div>

      <Card className="p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente o NCF…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={estado} onValueChange={(v) => setEstado(v as typeof estado)}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="al_dia">Al día</SelectItem>
              <SelectItem value="en_mora">En mora</SelectItem>
              <SelectItem value="saldado">Saldado</SelectItem>
              <SelectItem value="anulado">Anulado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wide">
              <th className="p-3">Cliente</th>
              <th className="p-3">Factura</th>
              <th className="p-3">Fecha</th>
              <th className="p-3">Total</th>
              <th className="p-3">Saldo pendiente</th>
              <th className="p-3">Próximo vencimiento</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Cargando…</td></tr>
            )}
            {!isLoading && error && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-destructive">
                  No se pudo cargar la información ({(error as Error).message || "error desconocido"}).
                  <br />
                  Si el mensaje menciona "v_cuentas_por_cobrar" o "does not exist", la migración de esta función
                  todavía no se aplicó en la base de datos — hay que correrla desde Supabase antes de que esta
                  página pueda mostrar datos.
                </td>
              </tr>
            )}
            {!isLoading && !error && filtered.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No hay cuentas para este filtro.</td></tr>
            )}
            {filtered.map((c) => {
              const est = ESTADO_LABEL[c.estado_cobro];
              return (
                <tr key={c.factura_id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-medium">{c.cliente_nombre}</div>
                    {c.cliente_email && <div className="text-xs text-muted-foreground">{c.cliente_email}</div>}
                  </td>
                  <td className="p-3">
                    <Link to="/facturas/nueva" search={{ id: c.factura_id }} className="text-primary hover:underline">
                      {c.ncf}
                    </Link>
                  </td>
                  <td className="p-3">{fmtDate(c.fecha)}</td>
                  <td className="p-3">{fmtMoney(c.total)}</td>
                  <td className="p-3 font-medium">{fmtMoney(c.saldo_pendiente)}</td>
                  <td className="p-3">{c.proxima_fecha_vencimiento ? fmtDate(c.proxima_fecha_vencimiento) : "—"}</td>
                  <td className="p-3">
                    <Badge variant={est.variant}>
                      {est.label}
                      {c.estado_cobro === "en_mora" && ` · ${c.dias_mora} día${c.dias_mora === 1 ? "" : "s"}`}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
