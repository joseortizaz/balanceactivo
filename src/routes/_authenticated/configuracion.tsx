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

  const { data: certificado, refetch: refetchCertificado } = useQuery({
    queryKey: ["ecf-certificado", auth.tenantId],
    enabled: !!auth.tenantId,
    queryFn: async () => (await (supabase as any)
      .from("tenant_certificados_digitales")
      .select("id, titular_nombre, titular_documento, entidad_certificadora, valido_desde, valido_hasta, activo, created_at")
      .eq("activo", true)
      .maybeSingle()).data,
  });
  const { data: ecfSecuencias } = useQuery({
    queryKey: ["ecf-secuencias", auth.tenantId],
    enabled: !!auth.tenantId,
    queryFn: async () => (await (supabase as any).from("ecf_secuencias").select("*").order("tipo_ecf")).data ?? [],
  });
  const [certForm, setCertForm] = useState<any>({ titular_nombre: "", titular_documento: "", entidad_certificadora: "", valido_desde: "", valido_hasta: "", passphrase: "" });
  const [certFile, setCertFile] = useState<File | null>(null);
  const [subiendoCert, setSubiendoCert] = useState(false);
  const [nuevaSecEcf, setNuevaSecEcf] = useState<any>({ tipo_ecf: "31", secuencia_desde: 1, secuencia_hasta: 1000, fecha_vencimiento: "" });

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

  const saveEcfAmbiente = async (ambiente: string) => {
    const { error } = await supabase.from("tenants").update({ ecf_ambiente: ambiente } as any).eq("id", auth.tenantId!);
    if (error) return toast.error(error.message);
    toast.success("Ambiente de e-CF actualizado");
    qc.invalidateQueries({ queryKey: ["tenant"] });
  };

  const subirCertificado = async () => {
    if (!certFile) return toast.error("Selecciona el archivo del certificado (.p12/.pfx)");
    if (!certForm.passphrase) return toast.error("Indica la contraseña del certificado");
    if (!certForm.titular_nombre.trim()) return toast.error("Indica el nombre del titular del certificado");
    if (!certForm.valido_hasta) return toast.error("Indica la fecha de vencimiento del certificado");
    setSubiendoCert(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sesión inválida, vuelve a iniciar sesión");
      const fd = new FormData();
      fd.append("certificado", certFile);
      fd.append("passphrase", certForm.passphrase);
      fd.append("titular_nombre", certForm.titular_nombre);
      fd.append("titular_documento", certForm.titular_documento || "");
      fd.append("entidad_certificadora", certForm.entidad_certificadora || "");
      fd.append("valido_desde", certForm.valido_desde || "");
      fd.append("valido_hasta", certForm.valido_hasta);
      const res = await fetch("/api/internal/ecf-certificado", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message || "No se pudo subir el certificado");
      toast.success("Certificado guardado. Balance Activo lo custodiará para firmar tus e-CF.");
      setCertForm({ titular_nombre: "", titular_documento: "", entidad_certificadora: "", valido_desde: "", valido_hasta: "", passphrase: "" });
      setCertFile(null);
      refetchCertificado();
    } catch (e: any) {
      toast.error(e.message ?? "Error al subir el certificado");
    } finally {
      setSubiendoCert(false);
    }
  };

  const agregarSecuenciaEcf = async () => {
    if (!nuevaSecEcf.secuencia_hasta || nuevaSecEcf.secuencia_hasta < nuevaSecEcf.secuencia_desde) {
      return toast.error("Revisa el rango de la secuencia");
    }
    const { error } = await (supabase as any).from("ecf_secuencias").insert({
      tenant_id: auth.tenantId,
      tipo_ecf: nuevaSecEcf.tipo_ecf,
      secuencia_desde: nuevaSecEcf.secuencia_desde,
      secuencia_actual: nuevaSecEcf.secuencia_desde - 1,
      secuencia_hasta: nuevaSecEcf.secuencia_hasta,
      fecha_vencimiento: nuevaSecEcf.fecha_vencimiento || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Secuencia e-NCF registrada");
    qc.invalidateQueries({ queryKey: ["ecf-secuencias"] });
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

        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold mb-1">Facturación Electrónica (e-CF)</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Infraestructura previa para emitir Comprobantes Fiscales Electrónicos ante la DGII.
            Esto NO reemplaza el trámite regulatorio: la DGII exige certificarse primero como
            Emisor Electrónico (Solicitud, Sets de Pruebas, Declaración Jurada y Certificación)
            antes de poder emitir e-CF en producción. Ver README.md para el detalle completo.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Estado ante la DGII:</span>
                <span className={
                  form.ecf_estado === "certificado" ? "text-green-600 font-semibold" :
                  form.ecf_estado === "en_pruebas" ? "text-amber-600 font-semibold" :
                  form.ecf_estado === "suspendido" ? "text-destructive font-semibold" :
                  "text-muted-foreground"
                }>
                  {form.ecf_estado === "certificado" ? "Certificado (puede emitir e-CF)" :
                   form.ecf_estado === "en_pruebas" ? "En pruebas (TesteCF)" :
                   form.ecf_estado === "suspendido" ? "Suspendido" : "No iniciado"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Este estado se actualiza manualmente por ahora, según el avance real del trámite
                en la Oficina Virtual de la DGII. Todavía no hay envío automático de e-CF.
              </p>
              <div>
                <Label htmlFor="cfg-ecf-ambiente">Ambiente</Label>
                <Select value={form.ecf_ambiente ?? "testecf"} onValueChange={(v) => { setForm({ ...form, ecf_ambiente: v }); saveEcfAmbiente(v); }}>
                  <SelectTrigger id="cfg-ecf-ambiente"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="testecf">TesteCF (pruebas)</SelectItem>
                    <SelectItem value="certificacion">Certificación</SelectItem>
                    <SelectItem value="produccion">Producción</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t border-border pt-3 mt-3">
                <div className="font-medium text-sm mb-2">Certificado digital</div>
                {certificado ? (
                  <div className="text-sm space-y-1">
                    <div><span className="text-muted-foreground">Titular:</span> {certificado.titular_nombre}</div>
                    {certificado.entidad_certificadora && <div><span className="text-muted-foreground">Entidad certificadora:</span> {certificado.entidad_certificadora}</div>}
                    <div><span className="text-muted-foreground">Vigente hasta:</span> {certificado.valido_hasta}</div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Balance Activo custodia este certificado de forma cifrada para firmar tus e-CF.
                      Sube uno nuevo abajo para reemplazarlo (por ejemplo, al renovarlo).
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mb-2">Aún no se ha registrado un certificado digital para este tenant.</p>
                )}
                <div className="space-y-2 mt-3">
                  <div>
                    <Label htmlFor="cfg-cert-archivo" className="text-xs">Archivo (.p12 / .pfx)</Label>
                    <Input id="cfg-cert-archivo" type="file" accept=".p12,.pfx" onChange={(e) => setCertFile(e.target.files?.[0] ?? null)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Contraseña</Label><Input type="password" value={certForm.passphrase} onChange={(e) => setCertForm({ ...certForm, passphrase: e.target.value })} /></div>
                    <div><Label className="text-xs">Titular</Label><Input value={certForm.titular_nombre} onChange={(e) => setCertForm({ ...certForm, titular_nombre: e.target.value })} /></div>
                    <div><Label className="text-xs">Documento del titular</Label><Input value={certForm.titular_documento} onChange={(e) => setCertForm({ ...certForm, titular_documento: e.target.value })} /></div>
                    <div><Label className="text-xs">Entidad certificadora</Label><Input value={certForm.entidad_certificadora} onChange={(e) => setCertForm({ ...certForm, entidad_certificadora: e.target.value })} /></div>
                    <div><Label className="text-xs">Válido desde</Label><Input type="date" value={certForm.valido_desde} onChange={(e) => setCertForm({ ...certForm, valido_desde: e.target.value })} /></div>
                    <div><Label className="text-xs">Válido hasta</Label><Input type="date" value={certForm.valido_hasta} onChange={(e) => setCertForm({ ...certForm, valido_hasta: e.target.value })} /></div>
                  </div>
                  <Button size="sm" onClick={subirCertificado} disabled={subiendoCert} className="w-full">
                    {subiendoCert ? "Subiendo…" : "Guardar certificado"}
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <div className="font-medium text-sm mb-2">Secuencias e-NCF asignadas por la DGII</div>
              <p className="text-xs text-muted-foreground mb-3">
                A diferencia del NCF tradicional, estos rangos los asigna la DGII bajo demanda
                (Oficina Virtual) una vez certificados como Emisor Electrónico. Regístralos aquí
                tal como te los entregó la DGII.
              </p>
              <div className="space-y-2 mb-4">
                {(ecfSecuencias ?? []).map((s: any) => (
                  <div key={s.id} className="border border-border rounded-md p-2 text-xs flex items-center justify-between">
                    <span className="font-mono">e-{s.tipo_ecf}</span>
                    <span>{s.secuencia_actual} / {s.secuencia_hasta}</span>
                    <span className={s.activo ? "text-green-600" : "text-muted-foreground"}>{s.activo ? "activa" : "inactiva"}</span>
                  </div>
                ))}
                {(!ecfSecuencias || ecfSecuencias.length === 0) && <div className="text-xs text-muted-foreground">Sin secuencias e-NCF registradas todavía.</div>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Tipo e-CF</Label>
                  <Select value={nuevaSecEcf.tipo_ecf} onValueChange={(v) => setNuevaSecEcf({ ...nuevaSecEcf, tipo_ecf: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="31">31 - Crédito Fiscal</SelectItem>
                      <SelectItem value="32">32 - Consumo</SelectItem>
                      <SelectItem value="33">33 - Nota de Débito</SelectItem>
                      <SelectItem value="34">34 - Nota de Crédito</SelectItem>
                      <SelectItem value="41">41 - Compras</SelectItem>
                      <SelectItem value="43">43 - Gastos Menores</SelectItem>
                      <SelectItem value="44">44 - Regímenes Especiales</SelectItem>
                      <SelectItem value="45">45 - Gubernamental</SelectItem>
                      <SelectItem value="46">46 - Exportaciones</SelectItem>
                      <SelectItem value="47">47 - Pagos al Exterior</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Vencimiento</Label><Input type="date" value={nuevaSecEcf.fecha_vencimiento} onChange={(e) => setNuevaSecEcf({ ...nuevaSecEcf, fecha_vencimiento: e.target.value })} /></div>
                <div><Label className="text-xs">Desde</Label><Input type="number" value={nuevaSecEcf.secuencia_desde} onChange={(e) => setNuevaSecEcf({ ...nuevaSecEcf, secuencia_desde: Number(e.target.value) })} /></div>
                <div><Label className="text-xs">Hasta</Label><Input type="number" value={nuevaSecEcf.secuencia_hasta} onChange={(e) => setNuevaSecEcf({ ...nuevaSecEcf, secuencia_hasta: Number(e.target.value) })} /></div>
              </div>
              <Button size="sm" variant="outline" onClick={agregarSecuenciaEcf} className="w-full mt-2">Registrar secuencia</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}