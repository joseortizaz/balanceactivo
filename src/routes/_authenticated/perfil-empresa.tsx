import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Upload, KeyRound, Building2, Users, UserPlus } from "lucide-react";
import { addMember, updateMemberRole, removeMember, resetMemberPassword } from "@/lib/team.functions";

export const Route = createFileRoute("/_authenticated/perfil-empresa")({ component: PerfilEmpresa });

type Role = "administrador" | "contador" | "agente_facturacion";

function PerfilEmpresa() {
  const auth = useAuth();
  const isAdmin = auth.roles.includes("administrador");

  return (
    <div>
      <PageHeader title="Perfil de la Empresa" description="Configura tu empresa, equipo y seguridad" />
      <Tabs defaultValue="empresa">
        <TabsList>
          <TabsTrigger value="empresa"><Building2 className="h-4 w-4 mr-2" />Empresa</TabsTrigger>
          <TabsTrigger value="equipo"><Users className="h-4 w-4 mr-2" />Equipo</TabsTrigger>
          <TabsTrigger value="seguridad"><KeyRound className="h-4 w-4 mr-2" />Seguridad</TabsTrigger>
        </TabsList>
        <TabsContent value="empresa"><EmpresaTab canEdit={isAdmin} /></TabsContent>
        <TabsContent value="equipo"><EquipoTab canEdit={isAdmin} /></TabsContent>
        <TabsContent value="seguridad"><SeguridadTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function EmpresaTab({ canEdit }: { canEdit: boolean }) {
  const auth = useAuth();
  const qc = useQueryClient();
  const logoRef = useRef<HTMLInputElement>(null);
  const firmaRef = useRef<HTMLInputElement>(null);

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant", auth.tenantId],
    enabled: !!auth.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").eq("id", auth.tenantId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const signedUrl = async (path: string | null) => {
    if (!path) return null;
    const { data } = await supabase.storage.from("tenant-assets").createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  };

  const { data: logoUrl } = useQuery({
    queryKey: ["asset", tenant?.logo_url],
    enabled: !!tenant?.logo_url,
    queryFn: () => signedUrl(tenant!.logo_url),
  });
  const { data: firmaUrl } = useQuery({
    queryKey: ["asset", tenant?.firma_url],
    enabled: !!tenant?.firma_url,
    queryFn: () => signedUrl(tenant!.firma_url),
  });

  const uploadAsset = async (file: File, kind: "logo" | "firma") => {
    if (!auth.tenantId) return;
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${auth.tenantId}/${kind}.${ext}`;
    const { error } = await supabase.storage.from("tenant-assets").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { toast.error(error.message); return; }
    const update = kind === "logo" ? { logo_url: path } : { firma_url: path };
    const { error: upErr } = await supabase.from("tenants").update(update).eq("id", auth.tenantId);
    if (upErr) { toast.error(upErr.message); return; }
    toast.success(`${kind === "logo" ? "Logo" : "Firma"} actualizada`);
    qc.invalidateQueries({ queryKey: ["tenant"] });
  };

  const removeAsset = async (kind: "logo" | "firma") => {
    if (!auth.tenantId || !tenant) return;
    const path = kind === "logo" ? tenant.logo_url : tenant.firma_url;
    if (path) await supabase.storage.from("tenant-assets").remove([path]);
    const update = kind === "logo" ? { logo_url: null } : { firma_url: null };
    await supabase.from("tenants").update(update).eq("id", auth.tenantId);
    qc.invalidateQueries({ queryKey: ["tenant"] });
    toast.success("Eliminada");
  };

  const saveInfo = async (form: FormData) => {
    if (!auth.tenantId) return;
    const payload = {
      razon_social: String(form.get("razon_social") ?? "").trim(),
      nombre_comercial: String(form.get("nombre_comercial") ?? "").trim() || null,
      rnc: String(form.get("rnc") ?? "").trim() || null,
      telefono: String(form.get("telefono") ?? "").trim() || null,
      direccion: String(form.get("direccion") ?? "").trim() || null,
    };
    if (!payload.razon_social) { toast.error("Razón social requerida"); return; }
    const { error } = await supabase.from("tenants").update(payload).eq("id", auth.tenantId);
    if (error) { toast.error(error.message); return; }
    toast.success("Datos guardados");
    qc.invalidateQueries({ queryKey: ["tenant"] });
  };

  if (isLoading) return <div className="text-muted-foreground mt-4">Cargando…</div>;
  if (!tenant) return <div className="text-muted-foreground mt-4">Sin datos</div>;

  return (
    <div className="grid gap-4 mt-4 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-2">
        <h3 className="font-semibold mb-4">Información fiscal</h3>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(e) => { e.preventDefault(); saveInfo(new FormData(e.currentTarget)); }}
        >
          <Field name="razon_social" label="Razón social *" defaultValue={tenant.razon_social ?? ""} disabled={!canEdit} />
          <Field name="nombre_comercial" label="Nombre comercial" defaultValue={tenant.nombre_comercial ?? ""} disabled={!canEdit} />
          <Field name="rnc" label="RNC" defaultValue={tenant.rnc ?? ""} disabled={!canEdit} />
          <Field name="telefono" label="Teléfono" defaultValue={tenant.telefono ?? ""} disabled={!canEdit} />
          <div className="md:col-span-2">
            <Field name="direccion" label="Dirección" defaultValue={tenant.direccion ?? ""} disabled={!canEdit} />
          </div>
          {canEdit && <div className="md:col-span-2"><Button type="submit">Guardar</Button></div>}
        </form>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-4">Identidad visual</h3>
        <AssetSlot
          label="Logo de la empresa"
          url={logoUrl ?? null}
          canEdit={canEdit}
          onPick={() => logoRef.current?.click()}
          onRemove={() => removeAsset("logo")}
        />
        <input ref={logoRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => e.target.files?.[0] && uploadAsset(e.target.files[0], "logo")} />
        <div className="h-4" />
        <AssetSlot
          label="Firma para facturas"
          url={firmaUrl ?? null}
          canEdit={canEdit}
          onPick={() => firmaRef.current?.click()}
          onRemove={() => removeAsset("firma")}
        />
        <input ref={firmaRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => e.target.files?.[0] && uploadAsset(e.target.files[0], "firma")} />
      </Card>
    </div>
  );
}

function Field({ name, label, defaultValue, disabled }: { name: string; label: string; defaultValue?: string; disabled?: boolean }) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} disabled={disabled} className="mt-1" />
    </div>
  );
}

function AssetSlot({ label, url, canEdit, onPick, onRemove }: { label: string; url: string | null; canEdit: boolean; onPick: () => void; onRemove: () => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2 border border-dashed border-border rounded-md p-3 flex items-center gap-3 bg-secondary/30">
        {url ? (
          <img src={url} alt={label} className="h-16 w-16 object-contain bg-background rounded" />
        ) : (
          <div className="h-16 w-16 flex items-center justify-center bg-background rounded text-xs text-muted-foreground">Sin imagen</div>
        )}
        {canEdit && (
          <div className="flex flex-col gap-1">
            <Button type="button" size="sm" variant="outline" onClick={onPick}>
              <Upload className="h-3 w-3 mr-1" />{url ? "Reemplazar" : "Subir"}
            </Button>
            {url && (
              <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
                <Trash2 className="h-3 w-3 mr-1" />Eliminar
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EquipoTab({ canEdit }: { canEdit: boolean }) {
  const generarPasswordProvisional = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    const bytes = new Uint32Array(10);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => chars[b % chars.length]).join("") + "#1";
  };
  const auth = useAuth();
  const qc = useQueryClient();
  const addFn = useServerFn(addMember);
  const updateFn = useServerFn(updateMemberRole);
  const removeFn = useServerFn(removeMember);
  const resetFn = useServerFn(resetMemberPassword);

  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [role, setRole] = useState<Role>("agente_facturacion");
  const [password, setPassword] = useState(() => generarPasswordProvisional());
  const [credenciales, setCredenciales] = useState<{ email: string; password: string } | null>(null);

  const { data: miembros, isLoading } = useQuery({
    queryKey: ["equipo", auth.tenantId],
    enabled: !!auth.tenantId,
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles").select("id, nombre, email").eq("tenant_id", auth.tenantId!);
      const ids = (profiles ?? []).map((p) => p.id);
      if (ids.length === 0) return [];
      const { data: roles } = await supabase
        .from("user_roles").select("user_id, role").in("user_id", ids);
      return (profiles ?? []).map((p) => ({
        ...p,
        roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as Role),
      }));
    },
  });

  const add = useMutation({
    mutationFn: () => addFn({ data: { email, nombre, role, password } }),
    onSuccess: () => {
      toast.success("Miembro creado. Comparte la contraseña provisional.");
      setCredenciales({ email, password });
      setEmail(""); setNombre(""); setRole("agente_facturacion");
      setPassword(generarPasswordProvisional());
      qc.invalidateQueries({ queryKey: ["equipo"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeRole = useMutation({
    mutationFn: (v: { userId: string; role: Role }) => updateFn({ data: v }),
    onSuccess: () => { toast.success("Rol actualizado"); qc.invalidateQueries({ queryKey: ["equipo"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const drop = useMutation({
    mutationFn: (userId: string) => removeFn({ data: { userId } }),
    onSuccess: () => { toast.success("Acceso revocado"); qc.invalidateQueries({ queryKey: ["equipo"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reset = useMutation({
    mutationFn: (v: { userId: string; email: string; password: string }) =>
      resetFn({ data: { userId: v.userId, password: v.password } }),
    onSuccess: (_d, v) => {
      setCredenciales({ email: v.email, password: v.password });
      toast.success("Contraseña provisional restablecida");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 mt-4 lg:grid-cols-3">
      {canEdit && (
        <Card className="p-5 lg:col-span-1">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><UserPlus className="h-4 w-4" />Agregar miembro</h3>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!email || !nombre) { toast.error("Completa los campos"); return; } if (password.length < 8) { toast.error("La contraseña debe tener al menos 8 caracteres"); return; } add.mutate(); }}>
            <div><Label>Nombre</Label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-1" required /></div>
            <div><Label>Correo</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" required /></div>
            <div>
              <Label>Rol</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contador">Contador</SelectItem>
                  <SelectItem value="agente_facturacion">Agente de Facturación</SelectItem>
                  <SelectItem value="administrador">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contraseña provisional</Label>
              <div className="flex gap-2 mt-1">
                <Input value={password} onChange={(e) => setPassword(e.target.value)} required />
                <Button type="button" variant="outline" onClick={() => setPassword(generarPasswordProvisional())}>
                  Generar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                El miembro deberá cambiarla en su primer acceso.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={add.isPending}>
              {add.isPending ? "Creando…" : "Crear usuario"}
            </Button>
          </form>
          {credenciales && (
            <div className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-sm">
              <div className="font-medium mb-1">Credenciales provisionales</div>
              <div className="text-muted-foreground break-all">Usuario: {credenciales.email}</div>
              <div className="text-muted-foreground break-all">Contraseña: {credenciales.password}</div>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`Usuario: ${credenciales.email}\nContraseña: ${credenciales.password}`);
                    toast.success("Copiado");
                  }}
                >
                  Copiar
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setCredenciales(null)}>Ocultar</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card className={`p-5 ${canEdit ? "lg:col-span-2" : "lg:col-span-3"}`}>
        <h3 className="font-semibold mb-4">Miembros del equipo</h3>
        {isLoading ? <div className="text-muted-foreground">Cargando…</div> : (
          <div className="space-y-2">
            {(miembros ?? []).map((m) => {
              const primary = (m.roles[0] ?? "agente_facturacion") as Role;
              const isSelf = m.id === auth.user?.id;
              return (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{m.nombre}{isSelf && <span className="text-xs text-muted-foreground ml-2">(tú)</span>}</div>
                    <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEdit && !isSelf ? (
                      <Select value={primary} onValueChange={(v) => changeRole.mutate({ userId: m.id, role: v as Role })}>
                        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contador">Contador</SelectItem>
                          <SelectItem value="agente_facturacion">Agente de Facturación</SelectItem>
                          <SelectItem value="administrador">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm text-muted-foreground capitalize">{primary.replace("_", " ")}</span>
                    )}
                    {canEdit && !isSelf && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Restablecer contraseña provisional"
                          disabled={reset.isPending}
                          onClick={() => {
                            if (!confirm("¿Generar una nueva contraseña provisional para este miembro?")) return;
                            reset.mutate({ userId: m.id, email: m.email ?? "", password: generarPasswordProvisional() });
                          }}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("¿Revocar acceso?")) drop.mutate(m.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {(miembros ?? []).length === 0 && <div className="text-sm text-muted-foreground">Sin miembros.</div>}
          </div>
        )}
      </Card>
    </div>
  );
}

function SeguridadTab() {
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 8) { toast.error("Mínimo 8 caracteres"); return; }
    if (pwd !== pwd2) { toast.error("Las contraseñas no coinciden"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Contraseña actualizada");
    setPwd(""); setPwd2("");
  };

  return (
    <Card className="p-5 mt-4 max-w-lg">
      <h3 className="font-semibold mb-4">Cambiar contraseña</h3>
      <form className="space-y-3" onSubmit={submit}>
        <div><Label>Nueva contraseña</Label><Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="mt-1" required minLength={8} /></div>
        <div><Label>Confirmar contraseña</Label><Input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} className="mt-1" required minLength={8} /></div>
        <Button type="submit" disabled={loading}>{loading ? "Guardando…" : "Actualizar contraseña"}</Button>
      </form>
    </Card>
  );
}