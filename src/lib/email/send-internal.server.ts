// Envío de correos transaccionales invocado desde el SERVIDOR (cron, jobs
// internos) en vez de desde el navegador de un usuario autenticado.
//
// Deliberadamente NO reutiliza src/routes/lovable/email/transactional/send.ts
// (la ruta HTTP que usa sendTransactionalEmail() desde el cliente): esa ruta
// exige un JWT de un usuario con sesión iniciada, algo que no existe en un
// job que corre solo, disparado por un cron. En vez de reescribir esa ruta
// para aceptar dos modos de autenticación (arriesgando romper el flujo que
// ya funciona hoy, sin poder correr un build para verificarlo), esta función
// duplica el mismo pipeline (supresión → token de unsubscribe → render →
// encolar) pero operando directamente con el service role. Si algún día se
// unifica, este es el lugar por donde empezar.

import * as React from "react";
import { render } from "@react-email/components";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TEMPLATES } from "@/lib/email-templates/registry";

const SITE_NAME = "balanceactivo";
const SENDER_DOMAIN = "notify.balanceactivo.net";
const FROM_DOMAIN = "balanceactivo.net";

function redactEmail(email: string | null | undefined): string {
  if (!email) return "***";
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "***";
  return `${localPart[0]}***@${domain}`;
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface SendInternalParams {
  templateName: string;
  recipientEmail: string;
  templateData?: Record<string, unknown>;
  idempotencyKey?: string;
}

export type SendInternalResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Envía (encola) un correo transaccional usando el service role, sin
 * requerir un usuario autenticado. Pensado para jobs de servidor (cron).
 */
export async function sendTransactionalEmailInternal(
  supabaseAdmin: SupabaseClient<any>,
  { templateName, recipientEmail, templateData = {}, idempotencyKey }: SendInternalParams,
): Promise<SendInternalResult> {
  const template = TEMPLATES[templateName];
  if (!template) {
    return { ok: false, reason: `Template '${templateName}' no encontrado` };
  }

  const effectiveRecipient = template.to || recipientEmail;
  if (!effectiveRecipient) {
    return { ok: false, reason: "recipientEmail requerido" };
  }

  const messageId = crypto.randomUUID();
  const finalIdempotencyKey = idempotencyKey || messageId;

  // 1. Supresión (fail-closed: si no se puede verificar, no se envía)
  const { data: suppressed, error: suppressionError } = await supabaseAdmin
    .from("suppressed_emails")
    .select("id")
    .eq("email", effectiveRecipient.toLowerCase())
    .maybeSingle();

  if (suppressionError) {
    console.error("[email interno] Falló chequeo de supresión — no se envía", {
      error: suppressionError,
      recipient_redacted: redactEmail(effectiveRecipient),
    });
    return { ok: false, reason: "No se pudo verificar la lista de supresión" };
  }

  if (suppressed) {
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: "suppressed",
    });
    return { ok: false, reason: "email_suppressed" };
  }

  // 2. Token de unsubscribe (uno por email, igual que en la ruta HTTP)
  const normalizedEmail = effectiveRecipient.toLowerCase();
  let unsubscribeToken: string;

  const { data: existingToken, error: tokenLookupError } = await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (tokenLookupError) {
    console.error("[email interno] Falló lookup de token de unsubscribe", { error: tokenLookupError });
    return { ok: false, reason: "No se pudo preparar el correo" };
  }

  if (existingToken && !existingToken.used_at) {
    unsubscribeToken = existingToken.token;
  } else if (!existingToken) {
    unsubscribeToken = generateToken();
    const { error: tokenError } = await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .upsert({ token: unsubscribeToken, email: normalizedEmail }, { onConflict: "email", ignoreDuplicates: true });

    if (tokenError) {
      console.error("[email interno] Falló creación de token de unsubscribe", { error: tokenError });
      return { ok: false, reason: "No se pudo preparar el correo" };
    }

    const { data: storedToken, error: reReadError } = await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (reReadError || !storedToken) {
      console.error("[email interno] Falló re-lectura del token de unsubscribe", { error: reReadError });
      return { ok: false, reason: "No se pudo preparar el correo" };
    }
    unsubscribeToken = storedToken.token;
  } else {
    // Token existente pero ya usado — debería haber sido atrapado por la
    // supresión de arriba. Fallback de seguridad: no enviar.
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: "suppressed",
      error_message: "Token de unsubscribe usado pero email no está en la lista de supresión",
    });
    return { ok: false, reason: "email_suppressed" };
  }

  // 3. Render
  const element = React.createElement(template.component, templateData);
  const html = await render(element);
  const plainText = await render(element, { plainText: true });
  const resolvedSubject = typeof template.subject === "function" ? template.subject(templateData) : template.subject;

  // 4. Encolar (el dispatcher de Lovable maneja envío/reintentos, igual que
  // para los correos disparados desde el cliente)
  await supabaseAdmin.from("email_send_log").insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: effectiveRecipient,
    status: "pending",
  });

  const { error: enqueueError } = await supabaseAdmin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: effectiveRecipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: resolvedSubject,
      html,
      text: plainText,
      purpose: "transactional",
      label: templateName,
      idempotency_key: finalIdempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  });

  if (enqueueError) {
    console.error("[email interno] Falló encolado", {
      error: enqueueError,
      templateName,
      recipient_redacted: redactEmail(effectiveRecipient),
    });
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: "failed",
      error_message: "Failed to enqueue email",
    });
    return { ok: false, reason: "No se pudo encolar el correo" };
  }

  return { ok: true };
}
