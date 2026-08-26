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
import { Plus, Pencil, Search, ArrowDownToLine, ArrowUpFromLine, History } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/productos")({ component: Productos });

const empty = { codigo: "", nombre: "", descripcion: "", precio: 0, tasa_itbis: 18, unidad: "unidad", activo: true, stock: 0, stock_minimo: 0, controla_inventario: true };

function Productos() {
  const qc = useQueryClient();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [f, setF] = useState<any>(empty);
  const [movOpen, setMovOpen] = useState(false);
  const [movProd, setMovProd] = useState<any>(null);
  const [movTipo, setMovTipo] = useState<"entrada"|"salida"|"ajuste">("entrada");
  const [movCantidad, setMovCantidad] = useState(0);
  const [movMotivo, setMovMotivo] = useState("");
  const [histOpen, setHistOpen] = useState(false);
  const [histProd, setHistProd] = useState<any>(null);

  const { data } = useQuery({
    queryKey: ["productos"],
    queryFn: async () => (await supabase.from("productos").select("*").order("nombre")).data ?? [],
  });

  const { data: movs } = useQuery({
    queryKey: ["mov-inv", histProd?.id],
    enabled: !!histProd?.id,
    queryFn: async () => (await (supabase as any).from("movimientos_inventario").select("*").eq("producto_id", histProd.id).order("created_at", { ascending: false }).limit(50)).data ?? [],
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
      stock: Number(p.stock ?? 0), stock_minimo: Number(p.stock_minimo ?? 0),
      controla_inventario: p.controla_inventario !== false,
    });
    setOpen(true);
  };

  const guardar = async () => {
    if (!f.nombre) return toast.error("El nombre es obligatorio");
    if (editId) {
      const { stock: _ignored, ...patch } = f;
      const { error } = await supabase.from("productos").update(patch).eq("id", editId);
      if (error) return toast.error(error.message);
      toast.success("Producto actualizado");
    } else {
      const { error } = await supabase.from("productos").insert({ ...f, tenant_id: auth.tenantId });
      if (error) return toast.error(error.message);
      toast.success("Producto creado");
    }
    setOpen(false); setEditId(null); setF(empty);
    qc.invalidateQueries({ queryKey: ["productos"] });
    qc.invalidateQueries({ queryKey: ["productos-sel"] });
  };

  const abrirMov = (p: any, tipo: "entrada"|"salida"|"ajuste") => {
    setMovProd(p); setMovTipo(tipo); setMovCantidad(0); setMovMotivo(""); setMovOpen(true);
  };
  const guardarMov = async () => {
    if (!movProd) return;
    if (movCantidad <= 0 && movTipo !== "ajuste") return toast.error("Cantidad debe ser mayor a 0");
    if (movTipo === "ajuste" && movCantidad < 0) return toast.error("Stock no puede ser negativo");
    const { error } = await (supabase as any).rpc("registrar_movimiento_inventario", {
      _producto_id: movProd.id, _tipo: movTipo, _cantidad: movCantidad, _motivo: movMotivo || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Movimiento registrado");
    setMovOpen(false);
    qc.invalidateQueries({ queryKey: ["productos"] });
    qc.invalidateQueries({ queryKey: ["productos-sel"] });
  };
  const abrirHistorial = (p: any) => { setHistProd(p); setHistOpen(true); };

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
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Inventario</Label>
                <Select value={f.controla_inventario ? "1" : "0"} onValueChange={(v) => setF({ ...f, controla_inventario: v === "1" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Controlar stock</SelectItem>
                    <SelectItem value="0">No controlar (servicio)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Stock inicial</Label>
                <Input type="number" step="0.001" value={f.stock} disabled={!!editId} onChange={(e) => setF({ ...f, stock: Number(e.target.value) })} />
                {editId && <p className="text-[10px] text-muted-foreground mt-1">Usa entradas/salidas para modificar</p>}
              </div>
              <div>
                <Label>Stock mínimo</Label>
                <Input type="number" step="0.001" value={f.stock_minimo} onChange={(e) => setF({ ...f, stock_minimo: Number(e.target.value) })} />
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

      <Dialog open={movOpen} onOpenChange={setMovOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movTipo === "entrada" ? "Entrada de inventario" : movTipo === "salida" ? "Salida de inventario" : "Ajuste de inventario"}
              {movProd && ` — ${movProd.nombre}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Stock actual: <span className="font-semibold text-foreground">{Number(movProd?.stock ?? 0)}</span> {movProd?.unidad}</p>
            <div>
              <Label>{movTipo === "ajuste" ? "Stock final (cantidad real en existencia)" : "Cantidad"}</Label>
              <Input type="number" step="0.001" value={movCantidad} onChange={(e) => setMovCantidad(Number(e.target.value))} />
            </div>
            <div>
              <Label>Motivo / Nota</Label>
              <Textarea rows={2} value={movMotivo} onChange={(e) => setMovMotivo(e.target.value)} placeholder="Compra, devolución, conteo físico, etc." />
            </div>
            <Button onClick={guardarMov} className="w-full">Registrar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={histOpen} onOpenChange={setHistOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Historial de movimientos {histProd && `— ${histProd.nombre}`}</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary"><tr>
                <th className="text-left p-2">Fecha</th>
                <th className="text-left p-2">Tipo</th>
                <th className="text-right p-2">Cantidad</th>
                <th className="text-right p-2">Stock antes</th>
                <th className="text-right p-2">Stock después</th>
                <th className="text-left p-2">Motivo</th>
              </tr></thead>
              <tbody>
                {(movs ?? []).map((m: any) => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="p-2">{new Date(m.created_at).toLocaleString("es-DO")}</td>
                    <td className="p-2 capitalize">{m.tipo.replace("_", " ")}</td>
                    <td className="p-2 text-right">{Number(m.cantidad)}</td>
                    <td className="p-2 text-right">{Number(m.stock_anterior)}</td>
                    <td className="p-2 text-right font-semibold">{Number(m.stock_nuevo)}</td>
                    <td className="p-2">{m.motivo ?? "—"}</td>
                  </tr>
                ))}
                {(!movs || movs.length === 0) && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Sin movimientos</td></tr>}
              </tbody>
            </table>
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
            <th className="text-right p-3">Stock</th>
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
                <td className="p-3 text-right">
                  {p.controla_inventario === false ? (
                    <span className="text-muted-foreground text-xs">N/A</span>
                  ) : (
                    <span className={Number(p.stock) <= Number(p.stock_minimo ?? 0) ? "text-destructive font-semibold" : "font-semibold"}>
                      {Number(p.stock)}
                    </span>
                  )}
                </td>
                <td className="p-3">{p.activo ? "Activo" : "Inactivo"}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  {p.controla_inventario !== false && (
                    <>
                      <Button size="sm" variant="ghost" title="Entrada" onClick={() => abrirMov(p, "entrada")}>
                        <ArrowDownToLine className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Salida" onClick={() => abrirMov(p, "salida")}>
                        <ArrowUpFromLine className="h-4 w-4 text-orange-600" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Historial" onClick={() => abrirHistorial(p)}>
                        <History className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" title="Editar" onClick={() => abrirEditar(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Sin productos</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}