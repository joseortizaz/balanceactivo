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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/productos")({ component: Productos });

const empty = { codigo: "", nombre: "", descripcion: "", precio: 0, tasa_itbis: 18, unidad: "unidad", activo: true };

function Productos() {
  const qc = useQueryClient();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [f, setF] = useState<any>(empty);

  const { data } = useQuery({
    queryKey: ["productos"],
    queryFn: async () => (await supabase.from("productos" as any).select("*").order("nombre")).data ?? [],
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((p: any) =>
      [p.nombre, p.codigo, p.descripcion, p.unidad].filter(Boolean).some((v: string) => v.toLowerCase().includes(q)),
    );
  }, [data, search]);

  const abrirNuevo = () => { setEditId(null); setF(empty); setOpen(true); };
  const abrirEditar = (p: any) => {
    setEditId(p.id);
    setF({
      codigo: p.codigo ?? "", nombre: p.nombre ?? "", descripcion: p.descripcion ?? "",
      precio: Number(p.precio ?? 0), tasa_itbis: Number(p.tasa_itbis ?? 18),
      unidad: p.unidad ?? "unidad", activo: !!p.activo,
    });
    setOpen(true);
  };

  const guardar = async () => {
    if (!f.nombre) return toast.error("El nombre es obligatorio");
    if (editId) {
      const { error } = await (supabase.from("productos" as any) as any).update(f).eq("id", editId);
      if (error) return toast.error(error.message);
      toast.success("Producto actualizado");
    } else {
      const { error } = await (supabase.from("productos" as any) as any).insert({ ...f, tenant_id: auth.tenantId });
      if (error) return toast.error(error.message);
      toast.success("Producto creado");
    }
    setOpen(false); setEditId(null); setF(empty);
    qc.invalidateQueries({ queryKey: ["productos"] });
    qc.invalidateQueries({ queryKey: ["productos-sel"] });
  };

  return (
    <div>
      <PageHeader title="Productos y servicios" description="Catálogo para facturar"
        action={<Button onClick={abrirNuevo}><Plus className="h-4 w-4 mr-2" />Nuevo producto</Button>} />

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setF(empty); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Editar producto" : "Nuevo producto"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Código / SKU</Label><Input value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} /></div>
              <div><Label>Unidad</Label><Input value={f.unidad} onChange={(e) => setF({ ...f, unidad: e.target.value })} placeholder="unidad, hora, kg…" /></div>
            </div>
            <div><Label>Nombre</Label><Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></div>
            <div><Label>Descripción</Label><Textarea rows={2} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Precio (RD$)</Label><Input type="number" step="0.01" value={f.precio} onChange={(e) => setF({ ...f, precio: Number(e.target.value) })} /></div>
              <div>
                <Label>ITBIS</Label>
                <Select value={String(f.tasa_itbis)} onValueChange={(v) => setF({ ...f, tasa_itbis: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="18">18%</SelectItem>
                    <SelectItem value="16">16%</SelectItem>
                    <SelectItem value="0">Exento 0%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={f.activo ? "1" : "0"} onValueChange={(v) => setF({ ...f, activo: v === "1" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Activo</SelectItem>
                  <SelectItem value="0">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={guardar} className="w-full">{editId ? "Actualizar" : "Guardar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="relative mb-3 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, código…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>
            <th className="text-left p-3">Código</th>
            <th className="text-left p-3">Nombre</th>
            <th className="text-left p-3">Unidad</th>
            <th className="text-right p-3">Precio</th>
            <th className="text-right p-3">ITBIS</th>
            <th className="text-left p-3">Estado</th>
            <th className="text-right p-3">Acciones</th>
          </tr></thead>
          <tbody>
            {filtered.map((p: any) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3 font-mono">{p.codigo}</td>
                <td className="p-3">{p.nombre}</td>
                <td className="p-3">{p.unidad}</td>
                <td className="p-3 text-right">{fmtMoney(p.precio)}</td>
                <td className="p-3 text-right">{Number(p.tasa_itbis)}%</td>
                <td className="p-3">{p.activo ? "Activo" : "Inactivo"}</td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => abrirEditar(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Sin productos</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}