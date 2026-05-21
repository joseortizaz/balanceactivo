import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { today } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/nomina/periodos/nueva")({ component: Nueva });

function Nueva() {
  const auth = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState<any>({
    nombre: `Nómina ${new Date().toLocaleDateString("es-DO", { month: "long", year: "numeric" })}`,
    forma_pago: "mensual",
    periodo_inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    periodo_fin: today(),
    fecha_pago: today(),
  });

  const crear = async () => {
    const { data, error } = await (supabase as any).from("nominas").insert({ ...f, tenant_id: auth.tenantId, created_by: auth.user?.id }).select().single();
    if (error) return toast.error(error.message);
    toast.success("Nómina creada en borrador");
    nav({ to: "/nomina/periodos/$id", params: { id: data.id } });
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Nueva nómina" description="Crear un nuevo período en borrador" />
      <Card className="p-5 space-y-4">
        <div><Label>Nombre</Label><Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></div>
        <div><Label>Forma de pago</Label>
          <Select value={f.forma_pago} onValueChange={(v) => setF({ ...f, forma_pago: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="mensual">Mensual</SelectItem><SelectItem value="quincenal">Quincenal</SelectItem><SelectItem value="semanal">Semanal</SelectItem></SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">Solo se incluirán empleados con esta forma de pago.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Inicio</Label><Input type="date" value={f.periodo_inicio} onChange={(e) => setF({ ...f, periodo_inicio: e.target.value })} /></div>
          <div><Label>Fin</Label><Input type="date" value={f.periodo_fin} onChange={(e) => setF({ ...f, periodo_fin: e.target.value })} /></div>
          <div><Label>Fecha de pago</Label><Input type="date" value={f.fecha_pago} onChange={(e) => setF({ ...f, fecha_pago: e.target.value })} /></div>
        </div>
        <Button onClick={crear} className="w-full">Crear borrador</Button>
      </Card>
    </div>
  );
}