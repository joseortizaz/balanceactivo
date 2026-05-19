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
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { validarRNC, validarCedula } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clientes")({ component: Clientes });

function Clientes() {
  const qc = useQueryClient();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({ tipo_documento: "rnc_empresa", documento: "", razon_social: "", direccion: "", telefono: "", email: "" });
  const { data } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => (await supabase.from("clientes").select("*").order("razon_social")).data ?? [],
  });

  const guardar = async () => {
    if (!f.razon_social || !f.documento) return toast.error("Razón social y documento obligatorios");
    if ((f.tipo_documento === "rnc_empresa" && !validarRNC(f.documento)) ||
        (f.tipo_documento === "rnc_persona" && !validarRNC(f.documento)) ||
        (f.tipo_documento === "cedula" && !validarCedula(f.documento))) {
      return toast.error("Documento con formato inválido");
    }
    const { error } = await supabase.from("clientes").insert({ ...f, tenant_id: auth.tenantId });
    if (error) return toast.error(error.message);
    toast.success("Cliente creado");
    setOpen(false);
    setF({ tipo_documento: "rnc_empresa", documento: "", razon_social: "", direccion: "", telefono: "", email: "" });
    qc.invalidateQueries({ queryKey: ["clientes"] });
  };

  return (
    <div>
      <PageHeader title="Clientes" description="Gestiona tu cartera de clientes"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nuevo cliente</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuevo cliente</DialogTitle></DialogHeader>
              <div className="space-y-3">
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
                <div><Label>Teléfono</Label><Input value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
                <Button onClick={guardar} className="w-full">Guardar</Button>
              </div>
            </DialogContent>
          </Dialog>
        } />
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>
            <th className="text-left p-3">Documento</th>
            <th className="text-left p-3">Razón social</th>
            <th className="text-left p-3">Teléfono</th>
            <th className="text-left p-3">Email</th>
          </tr></thead>
          <tbody>
            {(data ?? []).map((c: any) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-mono">{c.documento}</td>
                <td className="p-3">{c.razon_social}</td>
                <td className="p-3">{c.telefono}</td>
                <td className="p-3">{c.email}</td>
              </tr>
            ))}
            {(!data || data.length === 0) && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Sin clientes aún</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}