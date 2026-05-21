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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/nomina/empleados")({ component: Empleados });

const FORM_INIT: any = {
  nombres: "", apellidos: "", cedula: "", fecha_nacimiento: "", sexo: "M", estado_civil: "",
  direccion: "", telefono: "", email: "",
  banco: "", cuenta_bancaria: "", tipo_cuenta: "ahorro",
  departamento_id: null, cargo_id: null,
  tipo_contrato: "indefinido", forma_pago: "mensual", salario_base: 0,
  fecha_ingreso: new Date().toISOString().slice(0, 10), dependientes: 0, estado: "activo",
};

function Empleados() {
  const qc = useQueryClient();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [f, setF] = useState<any>(FORM_INIT);

  const { data: empleados } = useQuery({
    queryKey: ["empleados"],
    queryFn: async () => (await (supabase as any).from("empleados").select("*, departamentos(nombre), cargos(nombre)").order("apellidos")).data ?? [],
  });
  const { data: deps } = useQuery({ queryKey: ["departamentos"], queryFn: async () => (await (supabase as any).from("departamentos").select("*").eq("activo", true).order("nombre")).data ?? [] });
  const { data: cargos } = useQuery({ queryKey: ["cargos"], queryFn: async () => (await (supabase as any).from("cargos").select("*").eq("activo", true).order("nombre")).data ?? [] });

  const abrirNuevo = () => { setEditId(null); setF(FORM_INIT); setOpen(true); };
  const abrirEditar = (e: any) => {
    setEditId(e.id);
    setF({ ...e, fecha_nacimiento: e.fecha_nacimiento ?? "", fecha_ingreso: e.fecha_ingreso ?? "" });
    setOpen(true);
  };

  const guardar = async () => {
    if (!f.nombres || !f.apellidos || !f.cedula) return toast.error("Nombres, apellidos y cédula son obligatorios");
    const payload: any = { ...f, tenant_id: auth.tenantId, salario_base: Number(f.salario_base) || 0, dependientes: Number(f.dependientes) || 0 };
    if (!payload.fecha_nacimiento) payload.fecha_nacimiento = null;
    if (!payload.departamento_id) payload.departamento_id = null;
    if (!payload.cargo_id) payload.cargo_id = null;
    delete payload.departamentos; delete payload.cargos;
    const op = editId
      ? (supabase as any).from("empleados").update(payload).eq("id", editId)
      : (supabase as any).from("empleados").insert(payload);
    const { error } = await op;
    if (error) return toast.error(error.message);
    toast.success(editId ? "Empleado actualizado" : "Empleado creado");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["empleados"] });
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (empleados ?? []).filter((e: any) =>
      !q || `${e.nombres} ${e.apellidos} ${e.cedula} ${e.email ?? ""}`.toLowerCase().includes(q),
    );
  }, [empleados, search]);

  return (
    <div>
      <PageHeader title="Empleados" description="Gestión del personal de la empresa"
        action={<Button onClick={abrirNuevo}><Plus className="h-4 w-4 mr-2" />Nuevo empleado</Button>} />
      <div className="mb-3 max-w-sm">
        <Input placeholder="Buscar por nombre, cédula o email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>
            <th className="text-left p-3">Cédula</th><th className="text-left p-3">Nombre</th><th className="text-left p-3">Cargo</th><th className="text-left p-3">Depto.</th>
            <th className="text-right p-3">Salario</th><th className="text-left p-3">Pago</th><th className="text-left p-3">Estado</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {filtered.map((e: any) => (
              <tr key={e.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs">{e.cedula}</td>
                <td className="p-3">{e.apellidos}, {e.nombres}</td>
                <td className="p-3">{e.cargos?.nombre ?? "—"}</td>
                <td className="p-3">{e.departamentos?.nombre ?? "—"}</td>
                <td className="p-3 text-right">{fmtMoney(e.salario_base)}</td>
                <td className="p-3 capitalize">{e.forma_pago}</td>
                <td className="p-3 capitalize">{e.estado}</td>
                <td className="p-3 text-right"><Button variant="ghost" size="sm" onClick={() => abrirEditar(e)}><Pencil className="h-4 w-4" /></Button></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Sin empleados.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Editar empleado" : "Nuevo empleado"}</DialogTitle></DialogHeader>
          <Tabs defaultValue="personal">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="laboral">Laboral</TabsTrigger>
              <TabsTrigger value="bancario">Bancario</TabsTrigger>
              <TabsTrigger value="otros">Otros</TabsTrigger>
            </TabsList>
            <TabsContent value="personal" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nombres *</Label><Input value={f.nombres} onChange={(e) => setF({ ...f, nombres: e.target.value })} /></div>
                <div><Label>Apellidos *</Label><Input value={f.apellidos} onChange={(e) => setF({ ...f, apellidos: e.target.value })} /></div>
                <div><Label>Cédula *</Label><Input value={f.cedula} onChange={(e) => setF({ ...f, cedula: e.target.value })} /></div>
                <div><Label>Fecha de nacimiento</Label><Input type="date" value={f.fecha_nacimiento ?? ""} onChange={(e) => setF({ ...f, fecha_nacimiento: e.target.value })} /></div>
                <div><Label>Sexo</Label>
                  <Select value={f.sexo ?? "M"} onValueChange={(v) => setF({ ...f, sexo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="M">Masculino</SelectItem><SelectItem value="F">Femenino</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Estado civil</Label><Input value={f.estado_civil ?? ""} onChange={(e) => setF({ ...f, estado_civil: e.target.value })} /></div>
                <div className="col-span-2"><Label>Dirección</Label><Input value={f.direccion ?? ""} onChange={(e) => setF({ ...f, direccion: e.target.value })} /></div>
                <div><Label>Teléfono</Label><Input value={f.telefono ?? ""} onChange={(e) => setF({ ...f, telefono: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={f.email ?? ""} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
              </div>
            </TabsContent>
            <TabsContent value="laboral" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Departamento</Label>
                  <Select value={f.departamento_id ?? ""} onValueChange={(v) => setF({ ...f, departamento_id: v || null })}>
                    <SelectTrigger><SelectValue placeholder="Seleccione…" /></SelectTrigger>
                    <SelectContent>{(deps ?? []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Cargo</Label>
                  <Select value={f.cargo_id ?? ""} onValueChange={(v) => setF({ ...f, cargo_id: v || null })}>
                    <SelectTrigger><SelectValue placeholder="Seleccione…" /></SelectTrigger>
                    <SelectContent>{(cargos ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Tipo de contrato</Label>
                  <Select value={f.tipo_contrato} onValueChange={(v) => setF({ ...f, tipo_contrato: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="indefinido">Indefinido</SelectItem><SelectItem value="fijo">Fijo</SelectItem><SelectItem value="obra">Obra o servicio</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Forma de pago</Label>
                  <Select value={f.forma_pago} onValueChange={(v) => setF({ ...f, forma_pago: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="mensual">Mensual</SelectItem><SelectItem value="quincenal">Quincenal</SelectItem><SelectItem value="semanal">Semanal</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Salario base (RD$)</Label><Input type="number" min={0} step="0.01" value={f.salario_base} onChange={(e) => setF({ ...f, salario_base: e.target.value })} /></div>
                <div><Label>Fecha de ingreso</Label><Input type="date" value={f.fecha_ingreso} onChange={(e) => setF({ ...f, fecha_ingreso: e.target.value })} /></div>
                <div><Label>Estado</Label>
                  <Select value={f.estado} onValueChange={(v) => setF({ ...f, estado: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="activo">Activo</SelectItem><SelectItem value="suspendido">Suspendido</SelectItem><SelectItem value="terminado">Terminado</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="bancario" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Banco</Label><Input value={f.banco ?? ""} onChange={(e) => setF({ ...f, banco: e.target.value })} /></div>
                <div><Label>Cuenta</Label><Input value={f.cuenta_bancaria ?? ""} onChange={(e) => setF({ ...f, cuenta_bancaria: e.target.value })} /></div>
                <div><Label>Tipo de cuenta</Label>
                  <Select value={f.tipo_cuenta ?? "ahorro"} onValueChange={(v) => setF({ ...f, tipo_cuenta: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="ahorro">Ahorro</SelectItem><SelectItem value="corriente">Corriente</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="otros" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Dependientes</Label><Input type="number" min={0} value={f.dependientes} onChange={(e) => setF({ ...f, dependientes: e.target.value })} /></div>
              </div>
            </TabsContent>
          </Tabs>
          <Button onClick={guardar} className="w-full mt-4">{editId ? "Actualizar" : "Crear empleado"}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}