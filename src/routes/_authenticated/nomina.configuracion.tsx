import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/nomina/configuracion")({ component: Config });

function Config() {
  const qc = useQueryClient();
  const auth = useAuth();

  const { data: tasas } = useQuery({
    queryKey: ["tss-tasas"],
    queryFn: async () => (await (supabase as any).from("tss_tasas").select("*").order("vigente_desde", { ascending: false }).limit(1).maybeSingle()).data,
  });
  const { data: escalas } = useQuery({
    queryKey: ["isr-escalas"],
    queryFn: async () => (await (supabase as any).from("isr_escalas").select("*").order("anio", { ascending: false }).order("tramo")).data ?? [],
  });
  const { data: deps } = useQuery({ queryKey: ["departamentos-all"], queryFn: async () => (await (supabase as any).from("departamentos").select("*").order("nombre")).data ?? [] });
  const { data: cargos } = useQuery({ queryKey: ["cargos-all"], queryFn: async () => (await (supabase as any).from("cargos").select("*").order("nombre")).data ?? [] });

  const [t, setT] = useState<any>(null);
  useEffect(() => { if (tasas) setT(tasas); }, [tasas]);

  const guardarTasas = async () => {
    const { error } = await (supabase as any).from("tss_tasas").update({
      sfs_empleado: t.sfs_empleado, sfs_empleador: t.sfs_empleador,
      afp_empleado: t.afp_empleado, afp_empleador: t.afp_empleador,
      srl_empleador: t.srl_empleador, infotep_empleador: t.infotep_empleador,
      salario_minimo_cotizable: t.salario_minimo_cotizable, tope_sfs: t.tope_sfs, tope_afp: t.tope_afp,
    }).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Tasas actualizadas");
    qc.invalidateQueries({ queryKey: ["tss-tasas"] });
  };

  const [nuevoDep, setNuevoDep] = useState("");
  const [nuevoCargo, setNuevoCargo] = useState("");

  const addDep = async () => {
    if (!nuevoDep) return;
    const { error } = await (supabase as any).from("departamentos").insert({ nombre: nuevoDep, tenant_id: auth.tenantId });
    if (error) return toast.error(error.message);
    setNuevoDep(""); qc.invalidateQueries({ queryKey: ["departamentos-all"] }); qc.invalidateQueries({ queryKey: ["departamentos"] });
  };
  const addCargo = async () => {
    if (!nuevoCargo) return;
    const { error } = await (supabase as any).from("cargos").insert({ nombre: nuevoCargo, tenant_id: auth.tenantId });
    if (error) return toast.error(error.message);
    setNuevoCargo(""); qc.invalidateQueries({ queryKey: ["cargos-all"] }); qc.invalidateQueries({ queryKey: ["cargos"] });
  };
  const del = async (table: string, id: string, key: string) => {
    const { error } = await (supabase as any).from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: [key] });
  };

  return (
    <div>
      <PageHeader title="Configuración de Nómina" description="Tasas TSS, escala ISR, departamentos y cargos" />
      <Tabs defaultValue="tss">
        <TabsList>
          <TabsTrigger value="tss">Tasas TSS</TabsTrigger>
          <TabsTrigger value="isr">Escala ISR</TabsTrigger>
          <TabsTrigger value="catalogos">Departamentos y Cargos</TabsTrigger>
        </TabsList>

        <TabsContent value="tss">
          {t && (
            <Card className="p-5 space-y-4 max-w-3xl">
              <p className="text-sm text-muted-foreground">Tasas vigentes (Ley 87-01). Valores en porcentaje.</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["sfs_empleado", "SFS empleado (%)"], ["sfs_empleador", "SFS empleador (%)"],
                  ["afp_empleado", "AFP empleado (%)"], ["afp_empleador", "AFP empleador (%)"],
                  ["srl_empleador", "SRL empleador (%)"], ["infotep_empleador", "INFOTEP empleador (%)"],
                  ["tope_sfs", "Tope SFS (RD$ mensual)"], ["tope_afp", "Tope AFP (RD$ mensual)"],
                  ["salario_minimo_cotizable", "Salario mínimo cotizable"],
                ].map(([k, l]) => (
                  <div key={k}><Label>{l}</Label><Input type="number" step="0.0001" value={t[k] ?? 0} onChange={(e) => setT({ ...t, [k]: Number(e.target.value) })} /></div>
                ))}
              </div>
              <Button onClick={guardarTasas}>Guardar tasas</Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="isr">
          <Card className="p-0 overflow-x-auto max-w-3xl">
            <table className="w-full text-sm">
              <thead className="bg-secondary"><tr>
                <th className="text-left p-3">Año</th><th className="text-left p-3">Tramo</th>
                <th className="text-right p-3">Desde</th><th className="text-right p-3">Hasta</th>
                <th className="text-right p-3">Tasa</th><th className="text-right p-3">Cuota fija</th>
              </tr></thead>
              <tbody>
                {(escalas ?? []).map((e: any) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="p-3">{e.anio}</td><td className="p-3">{e.tramo}</td>
                    <td className="p-3 text-right">{Number(e.desde).toLocaleString("es-DO")}</td>
                    <td className="p-3 text-right">{e.hasta ? Number(e.hasta).toLocaleString("es-DO") : "—"}</td>
                    <td className="p-3 text-right">{(Number(e.tasa) * 100).toFixed(2)}%</td>
                    <td className="p-3 text-right">{Number(e.cuota_fija).toLocaleString("es-DO")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="text-xs text-muted-foreground mt-2">Escala anual del Art. 296 del Código Tributario. Editable directamente en la base de datos por el administrador.</p>
        </TabsContent>

        <TabsContent value="catalogos">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="font-semibold mb-3">Departamentos</h3>
              <div className="flex gap-2 mb-3">
                <Input placeholder="Nombre del departamento" value={nuevoDep} onChange={(e) => setNuevoDep(e.target.value)} />
                <Button size="sm" onClick={addDep}><Plus className="h-4 w-4" /></Button>
              </div>
              <ul className="space-y-1">
                {(deps ?? []).map((d: any) => (
                  <li key={d.id} className="flex items-center justify-between text-sm border-b border-border py-1.5">
                    <span>{d.nombre}</span>
                    <Button variant="ghost" size="sm" onClick={() => del("departamentos", d.id, "departamentos-all")}><Trash2 className="h-4 w-4" /></Button>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold mb-3">Cargos</h3>
              <div className="flex gap-2 mb-3">
                <Input placeholder="Nombre del cargo" value={nuevoCargo} onChange={(e) => setNuevoCargo(e.target.value)} />
                <Button size="sm" onClick={addCargo}><Plus className="h-4 w-4" /></Button>
              </div>
              <ul className="space-y-1">
                {(cargos ?? []).map((c: any) => (
                  <li key={c.id} className="flex items-center justify-between text-sm border-b border-border py-1.5">
                    <span>{c.nombre}</span>
                    <Button variant="ghost" size="sm" onClick={() => del("cargos", c.id, "cargos-all")}><Trash2 className="h-4 w-4" /></Button>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}