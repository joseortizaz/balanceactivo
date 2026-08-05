import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ROLES = ["administrador", "contador", "agente_facturacion"] as const;

export const addMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      email: z.string().trim().email().max(255),
      nombre: z.string().trim().min(1).max(120),
      role: z.enum(ROLES),
      password: z.string().min(8).max(72),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verificar que el llamante es administrador y obtener tenant
    const { data: profile } = await supabase
      .from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
    const tenantId = profile?.tenant_id;
    if (!tenantId) throw new Error("Tenant no encontrado");

    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "administrador");
    if (!isAdmin) throw new Error("Solo administradores pueden agregar miembros");

    // Crear o reutilizar usuario
    let newUserId: string | null = null;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      email_confirm: true,
      password: data.password,
      user_metadata: { nombre: data.nombre, invited_to_tenant: tenantId },
    });
    if (createErr) {
      // Si ya existe, buscarlo
      const { data: list } = await supabaseAdmin.auth.admin.listUsers();
      const existing = list?.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
      if (!existing) throw new Error(createErr.message);
      newUserId = existing.id;
      // Asignar la contraseña provisional al usuario existente
      await supabaseAdmin.auth.admin.updateUserById(newUserId, { password: data.password });
    } else {
      newUserId = created.user!.id;
    }

    // Forzar perfil al tenant correcto (handle_new_user pudo crear uno separado)
    await supabaseAdmin.from("profiles").upsert({
      id: newUserId, tenant_id: tenantId, nombre: data.nombre, email: data.email,
      debe_cambiar_password: true,
    }, { onConflict: "id" });

    // Asignar rol dentro del tenant del administrador
    await supabaseAdmin.from("user_roles").upsert({
      user_id: newUserId, tenant_id: tenantId, role: data.role,
    }, { onConflict: "user_id,role" });

    return { ok: true, userId: newUserId };
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      userId: z.string().uuid(),
      role: z.enum(ROLES),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r) => r.role === "administrador")) {
      throw new Error("Solo administradores");
    }
    const { data: profile } = await supabase
      .from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
    const tenantId = profile?.tenant_id;
    if (!tenantId) throw new Error("Tenant no encontrado");

    // Confirmar que el miembro pertenece al mismo tenant
    const { data: target } = await supabaseAdmin.from("profiles")
      .select("tenant_id").eq("id", data.userId).maybeSingle();
    if (target?.tenant_id !== tenantId) throw new Error("Miembro de otro tenant");

    // Reemplazar roles del miembro
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("tenant_id", tenantId);
    await supabaseAdmin.from("user_roles").insert({
      user_id: data.userId, tenant_id: tenantId, role: data.role,
    });
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.userId === userId) throw new Error("No puedes eliminarte a ti mismo");
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r) => r.role === "administrador")) {
      throw new Error("Solo administradores");
    }
    const { data: profile } = await supabase
      .from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
    const tenantId = profile?.tenant_id!;
    const { data: target } = await supabaseAdmin.from("profiles")
      .select("tenant_id").eq("id", data.userId).maybeSingle();
    if (target?.tenant_id !== tenantId) throw new Error("Miembro de otro tenant");

    // No permitir eliminar super administradores
    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", data.userId);
    if ((targetRoles ?? []).some((r) => r.role === "super_admin")) {
      throw new Error("No se puede eliminar a un super administrador");
    }

    // Quitar roles del tenant
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("tenant_id", tenantId);
    // Quitar el perfil (es lo que lista la gestión de equipo)
    const { error: profErr } = await supabaseAdmin
      .from("profiles").delete().eq("id", data.userId).eq("tenant_id", tenantId);
    if (profErr) throw new Error(profErr.message);

    // Eliminar la cuenta de acceso si ya no pertenece a ningún tenant
    const { data: otherProfiles } = await supabaseAdmin
      .from("profiles").select("id").eq("id", data.userId).limit(1);
    if (!otherProfiles || otherProfiles.length === 0) {
      await supabaseAdmin.auth.admin.deleteUser(data.userId);
    }
    return { ok: true };
  });

export const resetMemberPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), password: z.string().min(8).max(72) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r) => r.role === "administrador")) {
      throw new Error("Solo administradores pueden restablecer contraseñas");
    }
    const { data: profile } = await supabase
      .from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
    const tenantId = profile?.tenant_id;
    if (!tenantId) throw new Error("Tenant no encontrado");

    const { data: target } = await supabaseAdmin.from("profiles")
      .select("tenant_id, email").eq("id", data.userId).maybeSingle();
    if (!target || target.tenant_id !== tenantId) throw new Error("Miembro de otro tenant");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles")
      .update({ debe_cambiar_password: true }).eq("id", data.userId);
    return { ok: true };
  });