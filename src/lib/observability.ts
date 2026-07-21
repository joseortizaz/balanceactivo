// Antes de esto, los errores de producción eran invisibles salvo que un
// usuario los reportara: solo se logueaban con console.error (server.ts,
// start.ts), y esos logs no van a ningún lado fuera del runtime de
// Cloudflare Workers.
//
// Esto envía los errores no manejados del servidor a un webhook externo
// (Slack "Incoming Webhook", un endpoint propio, o cualquier receptor de
// monitoreo que acepte un POST con JSON). Deliberadamente NO se agrega el
// SDK de Sentry (u otro APM): esto es un fetch() plano, sin dependencias
// nuevas, para poder verificarlo sin necesitar instalar/compilar nada.
// Si más adelante prefieren Sentry, este mismo punto de entrada
// (reportError) es donde engancharlo — solo hay que reemplazar el cuerpo
// de la función.
//
// No-op si ERROR_WEBHOOK_URL no está configurada: cero cambio de
// comportamiento hasta que se active explícitamente.

function serializeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

/**
 * Reporta un error a ERROR_WEBHOOK_URL (fire-and-forget). Nunca lanza ni
 * rechaza — si el webhook mismo falla, se traga en silencio para no romper
 * el manejo de errores que ya existía (console.error sigue corriendo aparte).
 */
export async function reportError(error: unknown, context: Record<string, unknown> = {}): Promise<void> {
  const webhookUrl = process.env.ERROR_WEBHOOK_URL;
  if (!webhookUrl) return;

  const { message, stack } = serializeError(error);
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        app: "balance-activo",
        message,
        stack,
        context,
        at: new Date().toISOString(),
      }),
    });
  } catch {
    // Ver comentario arriba: no queremos que un webhook caído rompa el
    // manejo de errores existente.
  }
}
