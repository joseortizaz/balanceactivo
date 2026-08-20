import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/proveedores")({ component: Proveedores });

function Proveedores() {
  const qc = useQueryClient();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const empty = { tipo_documento: "rnc_empresa", documento: "", razon_social: "", nombre_comercial: "", direccion: "", telefono: "", email: "", activo: true };
  const [f, setF] = useState<any>(empty);
  const [editando, setEditando] = useState<any>(null);
  const { data } = useQuery({
    queryKey: ["proveedores"],
    queryFn: async () => (await supabase.from("proveedores").select("*").order("razon_social")).data ?? [],
  });

  const abrirNuevo = () => { setEditando(null); setF(empty); setOpen(true); };
  const abrirEditar = (p: any) => {
    setEditando(p);
    setF({
      tipo_documento: p.tipo_documento, documento: p.documento ?? "", razon_social: p.razon_social ?? "",
      nombre_comercial: p.nombre_comercial ?? "", direccion: p.direccion ?? "", telefono: p.telefono ?? "",
      email: p.email ?? "", activo: p.activo ?? true,
    });
    setOpen(true);
  };

  const guardar = async () => {
    if (!f.razon_social || !f.documento) return toast.error("Razón social y documento obligatorios");
    const payload = {
      tipo_documento: f.tipo_documento,
      documento: f.documento,
      razon_social: f.razon_social,
      nombre_comercial: f.nombre_comercial || null,
      direccion: f.direccion || null,
      telefono: f.telefono || null,
      email: f.email || null,
      activo: f.activo,
    };
    const { error } = editando
      ? await supabase.from("proveedores").update(payload).eq("id", editando.id)
      : await supabase.from("proveedores").insert({ ...payload, tenant_id: auth.tenantId! });
    if (error) return toast.error(error.message);
    toast.success(editando ? "Proveedor actualizado" : "Proveedor creado");
    setOpen(false);
    setEditando(null);
    qc.invalidateQueries({ queryKey: ["proveedores"] });
  };

  return (
    <div>
      <PageHeader title="Proveedores"
        action={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditando(null); }}>
            <DialogTrigger asChild><Button onClick={abrirNuevo}><Plus className="h-4 w-4 mr-2" />Nuevo</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editando ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Tipo</Label>
                  <Select value={f.tipo_documento} onValueChange={(v) => setF({ ...f, tipo_documento: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rnc_empresa">RNC Empresa</SelectItem>
                      <SelectItem value="rnc_persona">RNC Persona</SelectItem>
                      <SelectItem value="cedula">Cédula</SelectItem>
                    </SelectContent>
                  </Select></div>
                <div><Label>Documento</Label><Input value={f.documento} onChange={(e) => setF({ ...f, documento: e.target.value })} /></div>
                <div><Label>Razón social</Label><Input value={f.razon_social} onChange={(e) => setF({ ...f, razon_social: e.target.value })} /></div>
                <div><Label>Nombre comercial</Label><Input value={f.nombre_comercial} onChange={(e) => setF({ ...f, nombre_comercial: e.target.value })} /></div>
                <div><Label>Dirección</Label><Input value={f.direccion} onChange={(e) => setF({ ...f, direccion: e.target.value })} /></div>
                <div><Label>Teléfono</Label><Input value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
                <Button onClick={guardar} className="w-full">Guardar</Button>
              </div>
            </DialogContent>
          </Dialog>} />
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr><th className="text-left p-3">Documento</th><th className="text-left p-3">Razón social</th><th className="text-left p-3">Teléfono</th><th className="text-right p-3">Acciones</th></tr></thead>
          <tbody>
            {(data ?? []).map((c: any) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-mono">{c.documento}</td>
                <td className="p-3">{c.razon_social}</td>
                <td className="p-3">{c.telefono}</td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => abrirEditar(c)}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
                </td>
              </tr>
            ))}
            {(!data || data.length === 0) && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Sin proveedores</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}