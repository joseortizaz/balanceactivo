import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function exigirSuperAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  if (!(data ?? []).some((r) => r.role === "super_admin")) {
    throw new Error("Solo el super administrador puede hacer esto");
  }
}

// Datos de las cuentas de acceso (correo, alta, último ingreso, confirmación)
// que el cliente no puede leer directamente: viven en auth.users.
export const infoCuentasAcceso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirSuperAdmin(context.userId);
    const out: Record<string, { creada: string; ultimoIngreso: string | null; confirmada: boolean }> = {};
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      for (const u of data.users) {
        if (!u.email) continue;
        out[u.email.toLowerCase()] = {
          creada: u.created_at,
          ultimoIngreso: u.last_sign_in_at ?? null,
          confirmada: Boolean(u.email_confirmed_at),
        };
      }
      if (data.users.length < 200) break;
    }
    return out;
  });

// Elimina una empresa dudosa o sin datos verificables, junto con las cuentas de
// acceso que pertenecen solo a ella. Se niega si tiene facturas, clientes u
// otros datos, o si es la empresa de la plataforma.
export const eliminarEmpresa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      tenantId: z.string().uuid(),
      motivo: z.string().trim().max(300).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await exigirSuperAdmin(userId);

    const { data: tenant } = await supabaseAdmin
      .from("tenants").select("id, razon_social, rnc").eq("id", data.tenantId).maybeSingle();
    if (!tenant) throw new Error("La empresa ya no existe");
    const { data: tEmail } = await (supabaseAdmin as any)
      .from("tenants").select("email_registro, origen").eq("id", data.tenantId).maybeSingle();

    // Nunca la empresa del propio super administrador
    const { data: saRoles } = await supabaseAdmin
      .from("user_roles").select("user_id").eq("tenant_id", data.tenantId).eq("role", "super_admin");
    if ((saRoles ?? []).length > 0) throw new Error("No se puede eliminar la empresa de la plataforma");
    const { data: miPerfil } = await supabaseAdmin
      .from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
    if (!miPerfil?.tenant_id) throw new Error("No se encontró la empresa de la plataforma");

    // Solo si no tiene datos de negocio
    const tablas = ["facturas", "cobros", "clientes", "proveedores", "asientos_contables"] as const;
    for (const t of tablas) {
      const { count } = await (supabaseAdmin as any)
        .from(t).select("id", { count: "exact", head: true }).eq("tenant_id", data.tenantId);
      if ((count ?? 0) > 0) {
        throw new Error(`No se puede eliminar: la empresa tiene datos (${t}). Suspéndela en su lugar.`);
      }
    }

    // Cuentas de acceso que pertenecen a esta empresa
    const { data: perfiles } = await supabaseAdmin
      .from("profiles").select("id, email").eq("tenant_id", data.tenantId);
    const correos = (perfiles ?? []).map((p) => p.email).filter(Boolean);

    // Registrar ANTES de borrar, en la empresa de la plataforma (el log propio de
    // la empresa se borra con ella).
    await supabaseAdmin.from("logs_auditoria").insert({
      tenant_id: miPerfil.tenant_id,
      user_id: userId,
      accion: "empresa_eliminada",
      tabla_afectada: "tenants",
      registro_id: data.tenantId,
      detalles: {
        razon_social: tenant.razon_social,
        rnc: tenant.rnc,
        email_registro: tEmail?.email_registro ?? null,
        origen: tEmail?.origen ?? null,
        correos_eliminados: correos,
        motivo: data.motivo ?? null,
      },
    });

    // Primero la empresa (arrastra perfiles, roles y su propio log); después las
    // cuentas de acceso, que ya no tienen registros que las referencien.
    const { error: delErr } = await supabaseAdmin.from("tenants").delete().eq("id", data.tenantId);
    if (delErr) throw new Error(delErr.message);

    const noEliminadas: string[] = [];
    for (const p of perfiles ?? []) {
      const { data: esSuper } = await supabaseAdmin
        .from("user_roles").select("role").eq("user_id", p.id).eq("role", "super_admin");
      if ((esSuper ?? []).length > 0) continue;
      const { error } = await supabaseAdmin.auth.admin.deleteUser(p.id);
      if (error) noEliminadas.push(p.email ?? p.id);
    }
    if (noEliminadas.length) {
      throw new Error(`La empresa se eliminó, pero no se pudo borrar la cuenta de acceso de: ${noEliminadas.join(", ")}`);
    }
    return { ok: true, correos };
  });
