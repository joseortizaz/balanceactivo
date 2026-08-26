import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { validarRNC } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/configuracion")({ component: Configuracion });

function Configuracion() {
  const auth = useAuth();
  const qc = useQueryClient();
  const { data: tenant } = useQuery({
    queryKey: ["tenant", auth.tenantId],
    enabled: !!auth.tenantId,
    queryFn: async () => (await supabase.from("tenants").select("*").eq("id", auth.tenantId!).single()).data,
  });
  const { data: ncfs } = useQuery({
    queryKey: ["ncfs", auth.tenantId],
    enabled: !!auth.tenantId,
    queryFn: async () => (await supabase.from("ncf_secuencias").select("*").order("tipo")).data ?? [],
  });
  const { data: bancos } = useQuery({
    queryKey: ["bancos", auth.tenantId],
    enabled: !!auth.tenantId,
    queryFn: async () => (await (supabase as any).from("bancos").select("*").order("nombre")).data ?? [],
  });
  const [nuevoBanco, setNuevoBanco] = useState("");

  const [form, setForm] = useState<any>({});
  useEffect(() => { if (tenant) setForm(tenant); }, [tenant]);

  if (!auth.hasRole("administrador")) {
    return <div className="text-muted-foreground">Solo el administrador puede ver esta sección.</div>;
  }

  const save = async () => {
    if (form.rnc && !validarRNC(form.rnc)) return toast.error("RNC inválido: debe tener 9 (empresa) u 11 (persona) dígitos");
    const { error } = await supabase.from("tenants").update({
      rnc: form.rnc, razon_social: form.razon_social, nombre_comercial: form.nombre_comercial,
      regimen_fiscal: form.regimen_fiscal, direccion: form.direccion, telefono: form.telefono,
      itbis_tasa_principal: form.itbis_tasa_principal, itbis_tasa_reducida: form.itbis_tasa_reducida,
      retencion_isr_servicios: form.retencion_isr_servicios, retencion_isr_alquileres: form.retencion_isr_alquileres,
      dias_aviso_cuota: form.dias_aviso_cuota,
    }).eq("id", auth.tenantId!);
    if (error) return toast.error(error.message);
    toast.success("Configuración guardada");
    qc.invalidateQueries({ queryKey: ["tenant"] });
  };

  const saveNcf = async (id: string, patch: any) => {
    const { error } = await supabase.from("ncf_secuencias").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Secuencia NCF actualizada");
    qc.invalidateQueries({ queryKey: ["ncfs"] });
  };

  const addBanco = async () => {
    const nombre = nuevoBanco.trim();
    if (!nombre) return;
    const { error } = await (supabase as any).from("bancos").insert({ tenant_id: auth.tenantId, nombre });
    if (error) return toast.error(error.message);
    setNuevoBanco("");
    qc.invalidateQueries({ queryKey: ["bancos"] });
  };
  const toggleBanco = async (id: string, activo: boolean) => {
    const { error } = await (supabase as any).from("bancos").update({ activo: !activo }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["bancos"] });
  };

  return (
    <div>
      <PageHeader title="Configuración Fiscal" description="Datos de la empresa, NCF e impuestos por defecto" />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="font-semibold mb-4">Datos de la empresa</h2>
          <div className="space-y-3">
            <div><Label htmlFor="cfg-rnc">RNC</Label><Input id="cfg-rnc" value={form.rnc ?? ""} onChange={(e) => setForm({ ...form, rnc: e.target.value })} placeholder="9 u 11 dígitos" /></div>
            <div><Label htmlFor="cfg-razon-social">Razón social</Label><Input id="cfg-razon-social" value={form.razon_social ?? ""} onChange={(e) => setForm({ ...form, razon_social: e.target.value })} /></div>
            <div><Label htmlFor="cfg-nombre-comercial">Nombre comercial</Label><Input id="cfg-nombre-comercial" value={form.nombre_comercial ?? ""} onChange={(e) => setForm({ ...form, nombre_comercial: e.target.value })} /></div>
            <div>
              <Label htmlFor="cfg-regimen">Régimen fiscal</Label>
              <Select value={form.regimen_fiscal ?? "ordinario"} onValueChange={(v) => setForm({ ...form, regimen_fiscal: v })}>
                <SelectTrigger id="cfg-regimen"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ordinario">Régimen Ordinario</SelectItem>
                  <SelectItem value="rst">RST (Simplificado)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label htmlFor="cfg-direccion">Dirección</Label><Input id="cfg-direccion" value={form.direccion ?? ""} onChange={(e) => setForm({ ...form, direccion: e.target.value })} /></div>
            <div><Label htmlFor="cfg-telefono">Teléfono</Label><Input id="cfg-telefono" value={form.telefono ?? ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="cfg-itbis-principal">ITBIS principal (%)</Label><Input id="cfg-itbis-principal" type="number" step="0.01" value={form.itbis_tasa_principal ?? 18} onChange={(e) => setForm({ ...form, itbis_tasa_principal: Number(e.target.value) })} /></div>
              <div><Label htmlFor="cfg-itbis-reducido">ITBIS reducido (%)</Label><Input id="cfg-itbis-reducido" type="number" step="0.01" value={form.itbis_tasa_reducida ?? 16} onChange={(e) => setForm({ ...form, itbis_tasa_reducida: Number(e.target.value) })} /></div>
              <div><Label htmlFor="cfg-isr-servicios">Retención ISR servicios (%)</Label><Input id="cfg-isr-servicios" type="number" step="0.01" value={form.retencion_isr_servicios ?? 10} onChange={(e) => setForm({ ...form, retencion_isr_servicios: Number(e.target.value) })} /></div>
              <div><Label htmlFor="cfg-isr-alquileres">Retención ISR alquileres (%)</Label><Input id="cfg-isr-alquileres" type="number" step="0.01" value={form.retencion_isr_alquileres ?? 10} onChange={(e) => setForm({ ...form, retencion_isr_alquileres: Number(e.target.value) })} /></div>
            </div>
            <Button onClick={save} className="w-full">Guardar cambios</Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-1">Recordatorios de cobro</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Días de anticipación con que se avisa por correo a un cliente antes de que venza una cuota.
            Los avisos de mora (cuota ya vencida) se envían aparte, una sola vez por cuota.
          </p>
          <div className="space-y-3">
            <div>
              <Label htmlFor="cfg-dias-aviso">Días de anticipación</Label>
              <Input
                id="cfg-dias-aviso"
                type="number"
                min={0}
                step="1"
                value={form.dias_aviso_cuota ?? 5}
                onChange={(e) => setForm({ ...form, dias_aviso_cuota: Number(e.target.value) })}
              />
            </div>
            <Button onClick={save} className="w-full">Guardar cambios</Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-4">Secuencias NCF</h2>
          <p className="text-sm text-muted-foreground mb-4">Configura los rangos autorizados por la DGII.</p>
          <div className="space-y-3">
            {(ncfs ?? []).map((n: any) => (
              <div key={n.id} className="border border-border rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">{n.tipo}</div>
                  <div className="text-xs text-muted-foreground">{n.tipo === "B01" ? "Crédito Fiscal" : n.tipo === "B02" ? "Consumo" : n.tipo === "B04" ? "Nota de Crédito" : "Gubernamental"}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">Prefijo</Label><Input defaultValue={n.prefijo} onBlur={(e) => saveNcf(n.id, { prefijo: e.target.value })} /></div>
                  <div><Label className="text-xs">Actual</Label><Input type="number" defaultValue={n.secuencia_actual} onBlur={(e) => saveNcf(n.id, { secuencia_actual: Number(e.target.value) })} /></div>
                  <div><Label className="text-xs">Hasta</Label><Input type="number" defaultValue={n.secuencia_hasta} onBlur={(e) => saveNcf(n.id, { secuencia_hasta: Number(e.target.value) })} /></div>
                </div>
                <div className="mt-2">
                  <Label className="text-xs">Fecha de vencimiento</Label>
                  <Input
                    type="date"
                    defaultValue={n.fecha_vencimiento ?? ""}
                    onBlur={(e) => saveNcf(n.id, { fecha_vencimiento: e.target.value || null })}
                  />
                  {n.fecha_vencimiento && new Date(n.fecha_vencimiento) < new Date(new Date().toDateString()) && (
                    <div className="text-xs text-destructive mt-1">Secuencia vencida</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold mb-1">Bancos / Entidades financieras</h2>
          <p className="text-sm text-muted-foreground mb-4">Estas entidades estarán disponibles al registrar cobros y pagos.</p>
          <div className="flex gap-2 mb-4">
            <Label htmlFor="cfg-nuevo-banco" className="sr-only">Nombre del banco</Label>
            <Input id="cfg-nuevo-banco" placeholder="Nombre del banco" value={nuevoBanco} onChange={(e) => setNuevoBanco(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addBanco()} />
            <Button onClick={addBanco}>Agregar</Button>
          </div>
          <div className="space-y-2">
            {(bancos ?? []).map((b: any) => (
              <div key={b.id} className="flex items-center justify-between border border-border rounded-md p-2 px-3">
                <span className={b.activo ? "" : "text-muted-foreground line-through"}>{b.nombre}</span>
                <Button size="sm" variant="ghost" onClick={() => toggleBanco(b.id, b.activo)}>{b.activo ? "Desactivar" : "Activar"}</Button>
              </div>
            ))}
            {(!bancos || bancos.length === 0) && <div className="text-sm text-muted-foreground">Aún no has registrado bancos.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}