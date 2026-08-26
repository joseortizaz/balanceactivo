import { useEffect, useId, useRef } from "react";

// Widget de Cloudflare Turnstile (captcha) para proteger login/signup de bots
// y fuerza bruta. No hace nada si no hay site key configurada (VITE_TURNSTILE_SITE_KEY
// vacía) — así el formulario sigue funcionando igual que antes hasta que se
// active explícitamente.
//
// Setup requerido (una sola vez, fuera del código):
// 1. Crear un "widget" en el dashboard de Cloudflare (Turnstile) y obtener
//    el Site Key (público) y el Secret Key (privado).
// 2. Definir VITE_TURNSTILE_SITE_KEY con el Site Key.
// 3. En el dashboard de Supabase: Authentication → Attack Protection →
//    habilitar "Captcha protection", proveedor Turnstile, pegar el Secret Key.
//    Sin este paso, Supabase acepta las requests igual pero sin validar el
//    token (o las rechaza si lo exige y no está configurado — revisar en el
//    dashboard tras activarlo).

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
    __turnstileScriptLoading?: Promise<void>;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (window.__turnstileScriptLoading) return window.__turnstileScriptLoading;
  window.__turnstileScriptLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Turnstile"));
    document.head.appendChild(script);
  });
  return window.__turnstileScriptLoading;
}

export function Turnstile({
  onVerify,
  onExpire,
}: {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}) {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
  const containerId = useId();
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    loadTurnstileScript().then(() => {
      if (cancelled) return;
      const el = document.getElementById(containerId);
      if (!el || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(el, {
        sitekey: siteKey,
        callback: onVerify,
        "expired-callback": onExpire,
      });
    });
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, containerId]);

  if (!siteKey) return null;
  return <div id={containerId} className="flex justify-center" />;
}
