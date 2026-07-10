import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ROLES = ["administrador", "contador", "agente_facturacion"] as const;

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      email: z.string().trim().email().max(255),
      nombre: z.string().trim().min(1).max(120),
      role: z.enum(ROLES),
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
    if (!isAdmin) throw new Error("Solo administradores pueden invitar miembros");

    // Crear o reutilizar usuario
    let newUserId: string | null = null;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      email_confirm: true,
      password: crypto.randomUUID().replace(/-/g, "") + "Aa1!",
      user_metadata: { nombre: data.nombre, invited_to_tenant: tenantId },
    });
    if (createErr) {
      // Si ya existe, buscarlo
      const { data: list } = await supabaseAdmin.auth.admin.listUsers();
      const existing = list?.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
      if (!existing) throw new Error(createErr.message);
      newUserId = existing.id;
    } else {
      newUserId = created.user!.id;
    }

    // Forzar perfil al tenant correcto (handle_new_user pudo crear uno separado)
    await supabaseAdmin.from("profiles").upsert({
      id: newUserId, tenant_id: tenantId, nombre: data.nombre, email: data.email,
    }, { onConflict: "id" });

    // Asignar rol dentro del tenant del administrador
    await supabaseAdmin.from("user_roles").upsert({
      user_id: newUserId, tenant_id: tenantId, role: data.role,
    }, { onConflict: "user_id,role" });

    // Enviar enlace de recuperación para que defina contraseña
    await supabaseAdmin.auth.admin.generateLink({
      type: "recovery", email: data.email,
    });

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

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("tenant_id", tenantId);
    return { ok: true };
  });

export const resendInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r) => r.role === "administrador")) {
      throw new Error("Solo administradores pueden reenviar invitaciones");
    }
    const { data: profile } = await supabase
      .from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
    const tenantId = profile?.tenant_id;
    if (!tenantId) throw new Error("Tenant no encontrado");

    const { data: target } = await supabaseAdmin.from("profiles")
      .select("tenant_id, email").eq("id", data.userId).maybeSingle();
    if (!target || target.tenant_id !== tenantId) throw new Error("Miembro de otro tenant");
    if (!target.email) throw new Error("El miembro no tiene un correo registrado");

    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery", email: target.email,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });