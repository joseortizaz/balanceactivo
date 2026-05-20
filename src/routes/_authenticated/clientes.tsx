import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { validarRNC, validarCedula } from "@/lib/format";
import { PROVINCIAS_RD } from "@/lib/provincias-rd";

export const Route = createFileRoute("/_authenticated/clientes")({ component: Clientes });

const empty = { tipo_documento: "rnc_empresa", documento: "", razon_social: "", direccion: "", provincia: "", telefono: "", email: "" };

function Clientes() {
  const qc = useQueryClient();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [f, setF] = useState<any>(empty);
  const { data } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => (await supabase.from("clientes").select("*").order("razon_social")).data ?? [],
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((c: any) =>
      [c.razon_social, c.documento, c.email, c.telefono, c.provincia]
        .filter(Boolean).some((v: string) => v.toLowerCase().includes(q)),
    );
  }, [data, search]);

  const abrirNuevo = () => { setEditId(null); setF(empty); setOpen(true); };
  const abrirEditar = (c: any) => {
    setEditId(c.id);
    setF({
      tipo_documento: c.tipo_documento, documento: c.documento ?? "", razon_social: c.razon_social ?? "",
      direccion: c.direccion ?? "", provincia: c.provincia ?? "", telefono: c.telefono ?? "", email: c.email ?? "",
    });
    setOpen(true);
  };

  const guardar = async () => {
    if (!f.razon_social || !f.documento) return toast.error("Razón social y documento obligatorios");
    if ((f.tipo_documento === "rnc_empresa" && !validarRNC(f.documento)) ||
        (f.tipo_documento === "rnc_persona" && !validarRNC(f.documento)) ||
        (f.tipo_documento === "cedula" && !validarCedula(f.documento))) {
      return toast.error("Documento con formato inválido");
    }
    if (editId) {
      const { error } = await supabase.from("clientes").update(f).eq("id", editId);
      if (error) return toast.error(error.message);
      toast.success("Cliente actualizado");
    } else {
      const { error } = await supabase.from("clientes").insert({ ...f, tenant_id: auth.tenantId });
      if (error) return toast.error(error.message);
      toast.success("Cliente creado");
    }
    setOpen(false);
    setEditId(null);
    setF(empty);
    qc.invalidateQueries({ queryKey: ["clientes"] });
  };

  return (
    <div>
      <PageHeader title="Clientes" description="Gestiona tu cartera de clientes"
        action={
          <Button onClick={abrirNuevo}><Plus className="h-4 w-4 mr-2" />Nuevo cliente</Button>
        } />

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setF(empty); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Editar cliente" : "Nuevo cliente"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                <div>
                  <Label>Tipo de documento</Label>
                  <Select value={f.tipo_documento} onValueChange={(v) => setF({ ...f, tipo_documento: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rnc_empresa">RNC Empresa (9 dígitos)</SelectItem>
                      <SelectItem value="rnc_persona">RNC Persona Física (11)</SelectItem>
                      <SelectItem value="cedula">Cédula (11)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Documento</Label><Input value={f.documento} onChange={(e) => setF({ ...f, documento: e.target.value })} /></div>
                <div><Label>Razón social</Label><Input value={f.razon_social} onChange={(e) => setF({ ...f, razon_social: e.target.value })} /></div>
                <div><Label>Dirección</Label><Input value={f.direccion} onChange={(e) => setF({ ...f, direccion: e.target.value })} /></div>
                <div>
                  <Label>Provincia</Label>
                  <Select value={f.provincia || undefined} onValueChange={(v) => setF({ ...f, provincia: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecciona una provincia" /></SelectTrigger>
                    <SelectContent>
                      {PROVINCIAS_RD.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Teléfono</Label><Input value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
                <Button onClick={guardar} className="w-full">{editId ? "Actualizar" : "Guardar"}</Button>
              </div>
            </DialogContent>
          </Dialog>

      <div className="relative mb-3 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por razón social, documento, email, provincia…"
          value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>
            <th className="text-left p-3">Documento</th>
            <th className="text-left p-3">Razón social</th>
            <th className="text-left p-3">Provincia</th>
            <th className="text-left p-3">Teléfono</th>
            <th className="text-left p-3">Email</th>
            <th className="text-right p-3">Acciones</th>
          </tr></thead>
          <tbody>
            {filtered.map((c: any) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-mono">{c.documento}</td>
                <td className="p-3">{c.razon_social}</td>
                <td className="p-3">{c.provincia ?? ""}</td>
                <td className="p-3">{c.telefono}</td>
                <td className="p-3">{c.email}</td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => abrirEditar(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Sin clientes</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}