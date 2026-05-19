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

export const Route = createFileRoute("/_authenticated/cuentas")({ component: Cuentas });

function Cuentas() {
  const qc = useQueryClient();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({ codigo: "", nombre: "", tipo: "activo", nivel: 4, es_movimiento: true });
  const { data } = useQuery({
    queryKey: ["cuentas"],
    queryFn: async () => (await supabase.from("cuentas_contables").select("*").order("codigo")).data ?? [],
  });

  const guardar = async () => {
    const { error } = await supabase.from("cuentas_contables").insert({ ...f, tenant_id: auth.tenantId });
    if (error) return toast.error(error.message);
    toast.success("Cuenta creada");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["cuentas"] });
  };

  const toggle = async (id: string, activo: boolean) => {
    await supabase.from("cuentas_contables").update({ activo: !activo }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["cuentas"] });
  };

  return (
    <div>
      <PageHeader title="Catálogo de Cuentas" description="Estructura contable jerárquica de 5 niveles"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nueva cuenta</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nueva cuenta</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Código</Label><Input value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} placeholder="1.1.05.01" /></div>
                <div><Label>Nombre</Label><Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></div>
                <div><Label>Tipo</Label>
                  <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["activo","pasivo","capital","ingreso","costo","gasto"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Nivel</Label><Input type="number" min={1} max={5} value={f.nivel} onChange={(e) => setF({ ...f, nivel: Number(e.target.value) })} /></div>
                <Button onClick={guardar} className="w-full">Guardar</Button>
              </div>
            </DialogContent>
          </Dialog>} />
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>
            <th className="text-left p-3">Código</th><th className="text-left p-3">Nombre</th><th className="text-left p-3">Tipo</th><th className="text-left p-3">Nivel</th><th className="text-left p-3">Estado</th>
          </tr></thead>
          <tbody>
            {(data ?? []).map((c: any) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-mono">{c.codigo}</td>
                <td className="p-3" style={{ paddingLeft: `${c.nivel * 12}px` }}>{c.nombre}</td>
                <td className="p-3 capitalize">{c.tipo}</td>
                <td className="p-3">{c.nivel}</td>
                <td className="p-3">
                  <Button size="sm" variant="ghost" onClick={() => toggle(c.id, c.activo)}>{c.activo ? "Activa" : "Inactiva"}</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}