import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, DollarSign, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/gastos")({ component: Gastos });

const CATEGORIAS: { v: string; l: string }[] = [
  { v: "01_personal", l: "01 - Personal" },
  { v: "02_trabajos_suministros", l: "02 - Trabajos / Suministros" },
  { v: "03_arrendamientos", l: "03 - Arrendamientos" },
  { v: "04_activos_fijos", l: "04 - Activos Fijos" },
  { v: "05_operacionales", l: "05 - Operacionales" },
  { v: "06_financieros", l: "06 - Financieros" },
  { v: "07_seguros", l: "07 - Seguros" },
  { v: "08_combustibles", l: "08 - Combustibles" },
  { v: "09_otros", l: "09 - Otros" },
];

const NCF_TIPOS = [
  { v: "B01", l: "B01 - Crédito Fiscal" },
  { v: "B11", l: "B11 - Comprobante Único de Ingresos" },
  { v: "B14", l: "B14 - Regímenes Especiales" },
  { v: "B15", l: "B15 - Gubernamental" },
  { v: "E31", l: "E31 - Factura de Crédito Fiscal Electrónica" },
  { v: "E32", l: "E32 - Factura de Consumo Electrónica" },
  { v: "E34", l: "E34 - Nota de Crédito Electrónica" },
  { v: "E41", l: "E41 - Compras Electrónico" },
  { v: "E43", l: "E43 - Gastos Menores Electrónico" },
  { v: "E44", l: "E44 - Regímenes Especiales Electrónico" },
  { v: "E45", l: "E45 - Gubernamental Electrónico" },
  { v: "E47", l: "E47 - Pagos al Exterior Electrónico" },
];

function Gastos() {
  const qc = useQueryClient();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [pagoOpen, setPagoOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const [f, setF] = useState<any>({
    fecha: new Date().toISOString().slice(0, 10),
    proveedor_id: "",
    ncf: "",
    tipo_ncf_compra: "B01",
    categoria: "05_operacionales",
    concepto: "",
    cuenta_gasto_id: "",
    condicion_pago: "contado",
    fecha_vencimiento: "",
    subtotal: 0,
    itbis: 0,
    total: 0,
    itbis_retenido: 0,
    isr_retenido: 0,
    cuenta_pago_id: "",
    notas: "",
  });

  const [pago, setPago] = useState<any>({ monto: 0, cuenta_pago_id: "", fecha: new Date().toISOString().slice(0, 10), metodo: "Transferencia" });

  const resetForm = () => setF({
    fecha: new Date().toISOString().slice(0, 10), proveedor_id: "", ncf: "", tipo_ncf_compra: "B01",
    categoria: "05_operacionales", concepto: "", cuenta_gasto_id: "", condicion_pago: "contado",
    fecha_vencimiento: "", subtotal: 0, itbis: 0, total: 0, itbis_retenido: 0, isr_retenido: 0,
    cuenta_pago_id: "", notas: "",
  });

  const abrirEdicion = (g: any) => {
    setEditId(g.id);
    setF({
      fecha: g.fecha, proveedor_id: g.proveedor_id, ncf: g.ncf ?? "",
      tipo_ncf_compra: g.tipo_ncf_compra, categoria: g.categoria, concepto: g.concepto,
      cuenta_gasto_id: g.cuenta_gasto_id, condicion_pago: g.condicion_pago,
      fecha_vencimiento: g.fecha_vencimiento ?? "",
      subtotal: Number(g.subtotal),
      itbis: Number(g.itbis),
      total: Number(g.total),
      itbis_retenido: Number(g.itbis_retenido),
      isr_retenido: Number(g.isr_retenido),
      cuenta_pago_id: g.cuenta_pago_id ?? "",
      notas: g.notas ?? "",
    });
    setOpen(true);
  };

  const { data: gastos } = useQuery({
    queryKey: ["gastos"],
    queryFn: async () =>
      (await (supabase as any)
        .from("gastos")
        .select("*")
        .order("fecha", { ascending: false })
        .limit(200)).data ?? [],
  });

  const { data: cuentasAll } = useQuery({
    queryKey: ["cuentas-all"],
    queryFn: async () => (await supabase.from("cuentas_contables").select("id, codigo, nombre")).data ?? [],
  });

  const { data: provAll } = useQuery({
    queryKey: ["prov-all"],
    queryFn: async () => (await supabase.from("proveedores").select("id, razon_social, documento")).data ?? [],
  });

  const { data: proveedores } = useQuery({
    queryKey: ["proveedores-list"],
    queryFn: async () => (await supabase.from("proveedores").select("id, razon_social, documento").eq("activo", true).order("razon_social")).data ?? [],
  });

  const { data: cuentasGasto } = useQuery({
    queryKey: ["cuentas-gasto"],
    queryFn: async () => (await supabase.from("cuentas_contables").select("id, codigo, nombre, tipo").eq("es_movimiento", true).in("tipo", ["gasto", "costo"]).order("codigo")).data ?? [],
  });

  const { data: cuentasPago } = useQuery({
    queryKey: ["cuentas-pago"],
    queryFn: async () => (await supabase.from("cuentas_contables").select("id, codigo, nombre").eq("es_movimiento", true).like("codigo", "1.1.01%").order("codigo")).data ?? [],
  });

  const itbis = Number(f.itbis || 0);
  const total = useMemo(() => Number(f.total || 0) || Number(f.subtotal || 0) + itbis, [f.total, f.subtotal, itbis]);
  const subtotal = useMemo(() => Number((total - itbis).toFixed(2)), [total, itbis]);
  const neto = useMemo(() => total - Number(f.itbis_retenido || 0) - Number(f.isr_retenido || 0), [total, f.itbis_retenido, f.isr_retenido]);

  const setSubtotal = (v: number) => setF((p: any) => ({ ...p, subtotal: v, total: Number((v + Number(p.itbis || 0)).toFixed(2)) }));
  const setItbis = (v: number) => setF((p: any) => ({ ...p, itbis: v, total: Number((Number(p.subtotal || 0) + v).toFixed(2)) }));
  const setTotal = (v: number) => setF((p: any) => ({ ...p, total: v, subtotal: Number((v - Number(p.itbis || 0)).toFixed(2)) }));

  const guardar = async () => {
    if (!f.proveedor_id) return toast.error("Seleccione un proveedor");
    if (!f.cuenta_gasto_id) return toast.error("Seleccione cuenta de gasto");
    if (!f.concepto) return toast.error("Concepto requerido");
    if (total <= 0) return toast.error("El total debe ser > 0");
    if (subtotal < 0) return toast.error("El ITBIS no puede ser mayor que el total");
    if (f.condicion_pago === "contado" && !f.cuenta_pago_id) return toast.error("Seleccione cuenta de pago");

    if (editId) {
      const { error } = await (supabase as any).rpc("actualizar_gasto", {
        _gasto_id: editId, _fecha: f.fecha, _proveedor_id: f.proveedor_id,
        _ncf: f.ncf || "", _tipo_ncf_compra: f.tipo_ncf_compra, _categoria: f.categoria,
        _concepto: f.concepto, _cuenta_gasto_id: f.cuenta_gasto_id,
        _condicion_pago: f.condicion_pago, _fecha_vencimiento: f.fecha_vencimiento || null,
        _subtotal: subtotal, _itbis: itbis, _total: total,
        _itbis_retenido: f.itbis_retenido || 0, _isr_retenido: f.isr_retenido || 0,
        _cuenta_pago_id: f.condicion_pago === "contado" ? f.cuenta_pago_id : null,
        _notas: f.notas || null,
      });
      if (error) return toast.error(error.message);
      toast.success("Gasto actualizado");
      setOpen(false); setEditId(null); resetForm();
      qc.invalidateQueries({ queryKey: ["gastos"] });
      qc.invalidateQueries({ queryKey: ["asientos"] });
      return;
    }

    const { data, error } = await (supabase as any)
      .from("gastos")
      .insert({
        tenant_id: auth.tenantId,
        fecha: f.fecha,
        proveedor_id: f.proveedor_id,
        ncf: f.ncf || null,
        tipo_ncf_compra: f.tipo_ncf_compra,
        categoria: f.categoria,
        concepto: f.concepto,
        cuenta_gasto_id: f.cuenta_gasto_id,
        condicion_pago: f.condicion_pago,
        fecha_vencimiento: f.fecha_vencimiento || null,
        subtotal,
        itbis,
        itbis_retenido: f.itbis_retenido || 0,
        isr_retenido: f.isr_retenido || 0,
        total,
        cuenta_pago_id: f.condicion_pago === "contado" ? f.cuenta_pago_id : null,
        notas: f.notas || null,
        created_by: auth.session?.user.id,
      })
      .select("id")
      .single();
    if (error) return toast.error(error.message);

    const { error: e2 } = await (supabase as any).rpc("registrar_gasto", { _gasto_id: data.id });
    if (e2) return toast.error("Gasto guardado pero falló asiento: " + e2.message);

    toast.success("Gasto registrado");
    setOpen(false);
    resetForm();
    qc.invalidateQueries({ queryKey: ["gastos"] });
    qc.invalidateQueries({ queryKey: ["asientos"] });
  };

  const registrarPago = async (gastoId: string) => {
    if (!pago.cuenta_pago_id) return toast.error("Cuenta de pago requerida");
    if (Number(pago.monto) <= 0) return toast.error("Monto inválido");
    const { error } = await (supabase as any).rpc("registrar_pago_gasto", {
      _gasto_id: gastoId,
      _monto: pago.monto,
      _cuenta_pago_id: pago.cuenta_pago_id,
      _fecha: pago.fecha,
      _metodo: pago.metodo,
    });
    if (error) return toast.error(error.message);
    toast.success("Pago registrado");
    setPagoOpen(null);
    setPago({ monto: 0, cuenta_pago_id: "", fecha: new Date().toISOString().slice(0, 10), metodo: "Transferencia" });
    qc.invalidateQueries({ queryKey: ["gastos"] });
    qc.invalidateQueries({ queryKey: ["asientos"] });
  };

  const filtered = (gastos ?? []).filter((g: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const prov = (provAll ?? []).find((p: any) => p.id === g.proveedor_id);
    return (
      g.concepto?.toLowerCase().includes(s) ||
      g.ncf?.toLowerCase().includes(s) ||
      prov?.razon_social?.toLowerCase().includes(s)
    );
  });

  return (
    <div>
      <PageHeader
        title="Gastos"
        description="Registro de gastos con asiento contable automático"
        action={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); resetForm(); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nuevo gasto</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editId ? "Editar gasto" : "Registrar gasto"}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Fecha</Label><Input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></div>
                <div><Label>Proveedor</Label>
                  <Select value={f.proveedor_id} onValueChange={(v) => setF({ ...f, proveedor_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                    <SelectContent>
                      {(proveedores ?? []).map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.razon_social} ({p.documento})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>NCF</Label><Input value={f.ncf} onChange={(e) => setF({ ...f, ncf: e.target.value })} placeholder="B0100000001" /></div>
                <div><Label>Tipo NCF</Label>
                  <Select value={f.tipo_ncf_compra} onValueChange={(v) => setF({ ...f, tipo_ncf_compra: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{NCF_TIPOS.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Categoría (606 DGII)</Label>
                  <Select value={f.categoria} onValueChange={(v) => setF({ ...f, categoria: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Cuenta de gasto</Label>
                  <Select value={f.cuenta_gasto_id} onValueChange={(v) => setF({ ...f, cuenta_gasto_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                    <SelectContent>
                      {(cuentasGasto ?? []).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.codigo} - {c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Concepto</Label><Input value={f.concepto} onChange={(e) => setF({ ...f, concepto: e.target.value })} /></div>
                <div><Label>Subtotal</Label><Input type="number" step="0.01" value={f.subtotal} onChange={(e) => setSubtotal(parseFloat(e.target.value) || 0)} /></div>
                <div><Label>ITBIS (monto)</Label><Input type="number" step="0.01" value={f.itbis} onChange={(e) => setItbis(parseFloat(e.target.value) || 0)} /></div>
                <div><Label>Total factura</Label><Input type="number" step="0.01" value={f.total} onChange={(e) => setTotal(parseFloat(e.target.value) || 0)} /></div>
                <div />
                <div><Label>ITBIS Retenido</Label><Input type="number" step="0.01" value={f.itbis_retenido} onChange={(e) => setF({ ...f, itbis_retenido: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label>ISR Retenido</Label><Input type="number" step="0.01" value={f.isr_retenido} onChange={(e) => setF({ ...f, isr_retenido: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label>Condición de pago</Label>
                  <Select value={f.condicion_pago} onValueChange={(v) => setF({ ...f, condicion_pago: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contado">Contado</SelectItem>
                      <SelectItem value="credito">Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {f.condicion_pago === "credito" ? (
                  <div><Label>Vencimiento</Label><Input type="date" value={f.fecha_vencimiento} onChange={(e) => setF({ ...f, fecha_vencimiento: e.target.value })} /></div>
                ) : (
                  <div><Label>Cuenta de pago</Label>
                    <Select value={f.cuenta_pago_id} onValueChange={(v) => setF({ ...f, cuenta_pago_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Caja/Banco" /></SelectTrigger>
                      <SelectContent>
                        {(cuentasPago ?? []).map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.codigo} - {c.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="col-span-2"><Label>Notas</Label><Textarea value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} /></div>
                <div className="col-span-2 bg-secondary p-3 rounded-md space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal:</span><span>{fmtMoney(subtotal)}</span></div>
                  <div className="flex justify-between"><span>ITBIS:</span><span>{fmtMoney(itbis)}</span></div>
                  <div className="flex justify-between font-semibold"><span>Total:</span><span>{fmtMoney(total)}</span></div>
                  {(f.itbis_retenido > 0 || f.isr_retenido > 0) && (
                    <div className="flex justify-between text-muted-foreground"><span>Retenciones:</span><span>-{fmtMoney(Number(f.itbis_retenido) + Number(f.isr_retenido))}</span></div>
                  )}
                  <div className="flex justify-between font-bold border-t border-border pt-1"><span>Neto a pagar:</span><span>{fmtMoney(neto)}</span></div>
                </div>
                <Button onClick={guardar} className="col-span-2">{editId ? "Actualizar gasto" : "Guardar gasto"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="mb-3">
        <Input placeholder="Buscar por proveedor, NCF o concepto..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
      </div>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left p-3">Fecha</th>
              <th className="text-left p-3">Proveedor</th>
              <th className="text-left p-3">NCF</th>
              <th className="text-left p-3">Concepto</th>
              <th className="text-left p-3">Cuenta</th>
              <th className="text-right p-3">Total</th>
              <th className="text-right p-3">Pagado</th>
              <th className="text-center p-3">Estado</th>
              <th className="text-center p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((g: any) => {
              const prov = (provAll ?? []).find((p: any) => p.id === g.proveedor_id);
              const ctaGasto = (cuentasAll ?? []).find((c: any) => c.id === g.cuenta_gasto_id);
              return (
              <tr key={g.id} className="border-t border-border">
                <td className="p-3">{fmtDate(g.fecha)}</td>
                <td className="p-3">{prov?.razon_social}</td>
                <td className="p-3 font-mono text-xs">{g.ncf}</td>
                <td className="p-3">{g.concepto}</td>
                <td className="p-3 text-xs">{ctaGasto?.codigo} {ctaGasto?.nombre}</td>
                <td className="p-3 text-right">{fmtMoney(g.total)}</td>
                <td className="p-3 text-right">{fmtMoney(g.monto_pagado)}</td>
                <td className="p-3 text-center">
                  <Badge variant={g.estado === "pagado" ? "default" : g.estado === "anulado" ? "destructive" : "secondary"}>{g.estado}</Badge>
                </td>
                <td className="p-3 text-center">
                  {g.estado !== "anulado" && (
                    <Button size="sm" variant="ghost" className="mr-1" onClick={() => abrirEdicion(g)}>
                      <Pencil className="h-3 w-3 mr-1" />Editar
                    </Button>
                  )}
                  {g.estado === "pendiente" && (
                    <Dialog open={pagoOpen === g.id} onOpenChange={(o) => { setPagoOpen(o ? g.id : null); if (o) setPago({ ...pago, monto: g.total - g.monto_pagado }); }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline"><DollarSign className="h-3 w-3 mr-1" />Pagar</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Registrar pago</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                          <div className="text-sm text-muted-foreground">Saldo: {fmtMoney(g.total - g.monto_pagado)}</div>
                          <div><Label>Fecha</Label><Input type="date" value={pago.fecha} onChange={(e) => setPago({ ...pago, fecha: e.target.value })} /></div>
                          <div><Label>Monto</Label><Input type="number" step="0.01" value={pago.monto} onChange={(e) => setPago({ ...pago, monto: parseFloat(e.target.value) || 0 })} /></div>
                          <div><Label>Cuenta de pago</Label>
                            <Select value={pago.cuenta_pago_id} onValueChange={(v) => setPago({ ...pago, cuenta_pago_id: v })}>
                              <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                              <SelectContent>
                                {(cuentasPago ?? []).map((c: any) => (
                                  <SelectItem key={c.id} value={c.id}>{c.codigo} - {c.nombre}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div><Label>Método</Label><Input value={pago.metodo} onChange={(e) => setPago({ ...pago, metodo: e.target.value })} /></div>
                          <Button onClick={() => registrarPago(g.id)} className="w-full">Registrar pago</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </td>
              </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Sin gastos registrados</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
