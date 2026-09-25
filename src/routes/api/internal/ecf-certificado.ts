// Subida y registro del certificado digital que Balance Activo custodia
// por tenant para firmar sus e-CF (ver README.md, sección "Facturación
// Electrónica (e-CF)", y src/lib/ecf/crypto.server.ts).
//
// Ruta de servidor interna (no es parte de /api/public/v1, que es la API
// para integraciones externas con API key). Requiere la sesión del propio
// usuario administrador logueado en la app -- ver src/lib/internal-auth.server.ts.
//
// El archivo .p12 se sube directo al bucket privado "certificados-digitales"
// con el cliente service_role: ese bucket no tiene ninguna política de
// acceso para "authenticated", así que no hay forma de subir o leer ahí
// desde el navegador salvo a través de esta ruta.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { corsOptions, jsonError, jsonOk } from "@/lib/api-auth.server";
import { requireAdmin } from "@/lib/internal-auth.server";
import { encryptSecret } from "@/lib/ecf/crypto.server";

const MAX_CERT_SIZE_BYTES = 10 * 1024; // un .p12 típico pesa unos pocos KB

export const Route = createFileRoute("/api/internal/ecf-certificado")({
  server: {
    handlers: {
      OPTIONS: async () => corsOptions(),

      POST: async ({ request }) => {
        const ctx = await requireAdmin(request);
        if (ctx instanceof Response) return ctx;

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return jsonError(400, "invalid_body", "Se esperaba multipart/form-data");
        }

        const file = form.get("certificado");
        const passphrase = form.get("passphrase");
        const titularNombre = form.get("titular_nombre");
        const titularDocumento = form.get("titular_documento");
        const entidadCertificadora = form.get("entidad_certificadora");
        const validoDesde = form.get("valido_desde");
        const validoHasta = form.get("valido_hasta");

        if (!(file instanceof File)) return jsonError(400, "missing_file", "Falta el archivo del certificado (.p12/.pfx)");
        if (typeof passphrase !== "string" || passphrase.length < 1) return jsonError(400, "missing_passphrase", "Falta la contraseña del certificado");
        if (typeof titularNombre !== "string" || !titularNombre.trim()) return jsonError(400, "missing_titular", "Falta el nombre del titular del certificado");
        if (typeof validoHasta !== "string" || !validoHasta) return jsonError(400, "missing_vigencia", "Falta la fecha de vencimiento del certificado");
        if (file.size > MAX_CERT_SIZE_BYTES) return jsonError(400, "file_too_large", `El archivo excede el máximo esperado (${MAX_CERT_SIZE_BYTES} bytes) para un certificado .p12`);

        const ext = file.name.toLowerCase().endsWith(".pfx") ? "pfx" : "p12";
        const storagePath = `${ctx.tenantId}/certificado.${ext}`;
        const bytes = new Uint8Array(await file.arrayBuffer());

        const { error: uploadError } = await supabaseAdmin.storage
          .from("certificados-digitales")
          .upload(storagePath, bytes, { upsert: true, contentType: "application/x-pkcs12" });
        if (uploadError) return jsonError(500, "upload_error", `No se pudo guardar el certificado: ${uploadError.message}`);

        const envelope = encryptSecret(passphrase);

        // Desactiva el certificado anterior (si existe) y registra el nuevo
        // como el activo. Se hace en dos pasos porque el índice único
        // parcial (un solo activo por tenant) no permite un upsert directo
        // sin violar la restricción a mitad de camino.
        const { error: deactivateError } = await supabaseAdmin
          .from("tenant_certificados_digitales")
          .update({ activo: false })
          .eq("tenant_id", ctx.tenantId)
          .eq("activo", true);
        if (deactivateError) return jsonError(500, "db_error", deactivateError.message);

        const { error: insertError } = await supabaseAdmin
          .from("tenant_certificados_digitales")
          .insert({
            tenant_id: ctx.tenantId,
            titular_nombre: titularNombre.trim(),
            titular_documento: typeof titularDocumento === "string" ? titularDocumento.trim() || null : null,
            entidad_certificadora: typeof entidadCertificadora === "string" ? entidadCertificadora.trim() || null : null,
            storage_path: storagePath,
            passphrase_cifrada: envelope.ciphertext,
            passphrase_iv: envelope.iv,
            valido_desde: typeof validoDesde === "string" && validoDesde ? validoDesde : null,
            valido_hasta: validoHasta,
            activo: true,
            created_by: ctx.userId,
          });
        if (insertError) return jsonError(500, "db_error", insertError.message);

        return jsonOk({ ok: true });
      },
    },
  },
});
