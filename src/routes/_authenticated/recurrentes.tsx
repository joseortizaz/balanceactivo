import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/recurrentes")({ component: Recurrentes });

type Linea = { descripcion: string; cantidad: number; precio: number; tasa_itbis: number };

function Recurrentes() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: items } = useQuery({
    queryKey: ["recurrentes"],
    queryFn: async () => (await supabase.from("facturas_recurrentes").select("*, clientes(razon_social)").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: clientes } = useQuery({ queryKey: ["clientes-sel"], queryFn: async () => (await supabase.from("clientes").select("id, razon_social").order("razon_social")).data ?? [] });

  const [form, setForm] = useState({
    nombre: "", cliente_id: "", tipo_ncf: "B02" as const, condicion_pago: "contado" as "contado"|"credito",
    frecuencia: "mensual" as "diaria"|"semanal"|"quincenal"|"mensual"|"bimestral"|"trimestral"|"anual",
    proxima_emision: new Date().toISOString().slice(0,10),
    fecha_fin: "", num_cuotas: 1,
    tipo_descuento: "monto" as "monto"|"porcentaje", descuento_valor: 0,
  });
  const [lineas, setLineas] = useState<Linea[]>([{ descripcion: "", cantidad: 1, precio: 0, tasa_itbis: 18 }]);

  const guardar = async () => {
    if (!form.nombre || !form.cliente_id) return toast.error("Nombre y cliente requeridos");
    const { data: rec, error } = await supabase.from("facturas_recurrentes").insert({
      nombre: form.nombre, cliente_id: form.cliente_id, tipo_ncf: form.tipo_ncf,
      condicion_pago: form.condicion_pago, frecuencia: form.frecuencia,
      proxima_emision: form.proxima_emision, fecha_inicio: form.proxima_emision,
      fecha_fin: form.fecha_fin || null, num_cuotas: form.num_cuotas,
      tipo_descuento: form.tipo_descuento, descuento_valor: form.descuento_valor,
      tenant_id: (await supabase.from("profiles").select("tenant_id").eq("id", (await supabase.auth.getUser()).data.user!.id).single()).data!.tenant_id,
    }).select().single();
    if (error) return toast.error(error.message);

    await supabase.from("factura_recurrente_lineas").insert(
      lineas.map((l) => ({ ...l, recurrente_id: rec.id, tenant_id: rec.tenant_id }))
    );
    toast.success("Plantilla recurrente creada");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["recurrentes"] });
  };

  const toggleActivo = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from("facturas_recurrentes").update({ activo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurrentes"] }),
  });

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar plantilla?")) return;
    await supabase.from("facturas_recurrentes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["recurrentes"] });
  };

  const ejecutarAhora = async () => {
    const { data, error } = await supabase.rpc("generar_facturas_recurrentes");
    if (error) return toast.error(error.message);
    toast.success(`Proceso ejecutado: ${data ?? 0} plantillas avanzaron`);
    qc.invalidateQueries({ queryKey: ["recurrentes"] });
  };

  const setLinea = (i: number, p: Partial<Linea>) => setLineas(lineas.map((l, idx) => idx === i ? { ...l, ...p } : l));

  return (
    <div>
      <PageHeader title="Facturas recurrentes" description="Plantillas que se emiten automáticamente según la frecuencia"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={ejecutarAhora}><RefreshCw className="h-4 w-4 mr-2" />Ejecutar pendientes</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nueva plantilla</Button></DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Nueva factura recurrente</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>Nombre de la plantilla</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Renta mensual oficina" /></div>
                  <div className="col-span-2">
                    <Label>Cliente</Label>
                    <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                      <SelectContent>
                        {(clientes ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.razon_social}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Frecuencia</Label>
                    <Select value={form.frecuencia} onValueChange={(v) => setForm({ ...form, frecuencia: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diaria">Diaria</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="quincenal">Quincenal</SelectItem>
                        <SelectItem value="mensual">Mensual</SelectItem>
                        <SelectItem value="bimestral">Bimestral</SelectItem>
                        <SelectItem value="trimestral">Trimestral</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo NCF</Label>
                    <Select value={form.tipo_ncf} onValueChange={(v) => setForm({ ...form, tipo_ncf: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="B01">B01 - Crédito Fiscal</SelectItem>
                        <SelectItem value="B02">B02 - Consumo</SelectItem>
                        <SelectItem value="B15">B15 - Gubernamental</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Próxima emisión</Label><Input type="date" value={form.proxima_emision} onChange={(e) => setForm({ ...form, proxima_emision: e.target.value })} /></div>
                  <div><Label>Fecha fin (opcional)</Label><Input type="date" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} /></div>
                  <div>
                    <Label>Condición</Label>
                    <Select value={form.condicion_pago} onValueChange={(v) => setForm({ ...form, condicion_pago: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contado">Contado</SelectItem>
                        <SelectItem value="credito">Crédito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label># Cuotas</Label><Input type="number" min={1} value={form.num_cuotas} onChange={(e) => setForm({ ...form, num_cuotas: Number(e.target.value) })} /></div>
                  <div>
                    <Label>Tipo descuento</Label>
                    <Select value={form.tipo_descuento} onValueChange={(v) => setForm({ ...form, tipo_descuento: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monto">Monto fijo</SelectItem>
                        <SelectItem value="porcentaje">Porcentaje</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Valor descuento</Label><Input type="number" step="0.01" value={form.descuento_valor} onChange={(e) => setForm({ ...form, descuento_valor: Number(e.target.value) })} /></div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label>Líneas de la factura</Label>
                    <Button size="sm" variant="outline" onClick={() => setLineas([...lineas, { descripcion: "", cantidad: 1, precio: 0, tasa_itbis: 18 }])}><Plus className="h-4 w-4 mr-1" />Agregar</Button>
                  </div>
                  {lineas.map((l, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                      <div className="col-span-5"><Input placeholder="Descripción" value={l.descripcion} onChange={(e) => setLinea(i, { descripcion: e.target.value })} /></div>
                      <div className="col-span-2"><Input type="number" value={l.cantidad} onChange={(e) => setLinea(i, { cantidad: Number(e.target.value) })} /></div>
                      <div className="col-span-3"><Input type="number" step="0.01" value={l.precio} onChange={(e) => setLinea(i, { precio: Number(e.target.value) })} /></div>
                      <div className="col-span-2"><Input type="number" value={l.tasa_itbis} onChange={(e) => setLinea(i, { tasa_itbis: Number(e.target.value) })} /></div>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-3" onClick={guardar}>Crear plantilla</Button>
              </DialogContent>
            </Dialog>
          </div>
        }
      />
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>
            <th className="text-left p-3">Nombre</th><th className="text-left p-3">Cliente</th>
            <th className="text-left p-3">Frecuencia</th><th className="text-left p-3">Próxima emisión</th>
            <th className="text-center p-3">Activo</th><th className="text-right p-3">Acciones</th>
          </tr></thead>
          <tbody>
            {(items ?? []).map((r: any) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 font-medium">{r.nombre}</td>
                <td className="p-3">{r.clientes?.razon_social}</td>
                <td className="p-3 capitalize">{r.frecuencia}</td>
                <td className="p-3">{fmtDate(r.proxima_emision)}</td>
                <td className="p-3 text-center"><Switch checked={r.activo} onCheckedChange={(v) => toggleActivo.mutate({ id: r.id, activo: v })} /></td>
                <td className="p-3 text-right"><Button variant="ghost" size="icon" onClick={() => eliminar(r.id)}><Trash2 className="h-4 w-4" /></Button></td>
              </tr>
            ))}
            {(!items || items.length === 0) && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Sin plantillas recurrentes</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}