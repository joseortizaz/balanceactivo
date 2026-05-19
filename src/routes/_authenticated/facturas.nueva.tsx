import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { fmtMoney, today } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/facturas/nueva")({ component: NuevaFactura });

type Linea = { descripcion: string; cantidad: number; precio: number; tasa_itbis: number };

function NuevaFactura() {
  const navigate = useNavigate();
  const { data: clientes } = useQuery({ queryKey: ["clientes-sel"], queryFn: async () => (await supabase.from("clientes").select("id, razon_social, documento").order("razon_social")).data ?? [] });
  const [clienteId, setClienteId] = useState("");
  const [tipoNcf, setTipoNcf] = useState<"B01"|"B02"|"B04"|"B15">("B02");
  const [condicion, setCondicion] = useState<"contado"|"credito">("contado");
  const [fecha, setFecha] = useState(today());
  const [descuento, setDescuento] = useState(0);
  const [lineas, setLineas] = useState<Linea[]>([{ descripcion: "", cantidad: 1, precio: 0, tasa_itbis: 18 }]);
  const [loading, setLoading] = useState(false);

  const totales = useMemo(() => {
    const subtotal = lineas.reduce((s, l) => s + l.cantidad * l.precio, 0);
    const itbis = lineas.reduce((s, l) => s + l.cantidad * l.precio * (l.tasa_itbis / 100), 0);
    return { subtotal, itbis, total: subtotal - descuento + itbis };
  }, [lineas, descuento]);

  const setLinea = (i: number, patch: Partial<Linea>) => setLineas(lineas.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const addLinea = () => setLineas([...lineas, { descripcion: "", cantidad: 1, precio: 0, tasa_itbis: 18 }]);
  const delLinea = (i: number) => setLineas(lineas.filter((_, idx) => idx !== i));

  const guardar = async () => {
    if (!clienteId) return toast.error("Selecciona un cliente");
    if (lineas.some((l) => !l.descripcion || l.cantidad <= 0 || l.precio < 0)) return toast.error("Revisa las líneas");
    setLoading(true);
    const { data, error } = await supabase.rpc("crear_factura", {
      _cliente_id: clienteId, _tipo_ncf: tipoNcf, _condicion: condicion, _fecha: fecha,
      _descuento: descuento, _lineas: lineas as any,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Factura creada con NCF asignado");
    navigate({ to: "/facturas" });
  };

  return (
    <div>
      <PageHeader title="Nueva factura" description="El NCF se asigna automáticamente al guardar" />
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Cliente</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger><SelectValue placeholder="Selecciona cliente" /></SelectTrigger>
                <SelectContent>
                  {(clientes ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.razon_social} — {c.documento}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo NCF</Label>
              <Select value={tipoNcf} onValueChange={(v) => setTipoNcf(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="B01">B01 - Crédito Fiscal</SelectItem>
                  <SelectItem value="B02">B02 - Consumo</SelectItem>
                  <SelectItem value="B15">B15 - Gubernamental</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condición</Label>
              <Select value={condicion} onValueChange={(v) => setCondicion(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contado">Contado</SelectItem>
                  <SelectItem value="credito">Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Fecha</Label><Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
            <div><Label>Descuento</Label><Input type="number" step="0.01" value={descuento} onChange={(e) => setDescuento(Number(e.target.value))} /></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Líneas</Label>
              <Button size="sm" variant="outline" onClick={addLinea}><Plus className="h-4 w-4 mr-1" />Agregar</Button>
            </div>
            <div className="space-y-2">
              {lineas.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5"><Input placeholder="Descripción" value={l.descripcion} onChange={(e) => setLinea(i, { descripcion: e.target.value })} /></div>
                  <div className="col-span-2"><Input type="number" step="0.001" placeholder="Cant" value={l.cantidad} onChange={(e) => setLinea(i, { cantidad: Number(e.target.value) })} /></div>
                  <div className="col-span-2"><Input type="number" step="0.01" placeholder="Precio" value={l.precio} onChange={(e) => setLinea(i, { precio: Number(e.target.value) })} /></div>
                  <div className="col-span-2">
                    <Select value={String(l.tasa_itbis)} onValueChange={(v) => setLinea(i, { tasa_itbis: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="18">ITBIS 18%</SelectItem>
                        <SelectItem value="16">ITBIS 16%</SelectItem>
                        <SelectItem value="0">Exento 0%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1"><Button variant="ghost" size="icon" onClick={() => delLinea(i)}><Trash2 className="h-4 w-4" /></Button></div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5 h-fit space-y-3">
          <h3 className="font-semibold">Resumen</h3>
          <div className="flex justify-between text-sm"><span>Subtotal</span><span>{fmtMoney(totales.subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span>Descuento</span><span>− {fmtMoney(descuento)}</span></div>
          <div className="flex justify-between text-sm"><span>ITBIS</span><span>{fmtMoney(totales.itbis)}</span></div>
          <div className="flex justify-between text-lg font-bold border-t border-border pt-3"><span>Total</span><span>{fmtMoney(totales.total)}</span></div>
          <Button className="w-full" onClick={guardar} disabled={loading}>{loading ? "Guardando…" : "Guardar factura"}</Button>
        </Card>
      </div>
    </div>
  );
}