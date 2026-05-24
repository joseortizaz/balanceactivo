import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/unsubscribe")({ component: Unsubscribe });

function Unsubscribe() {
  const [status, setStatus] = useState<"loading" | "valid" | "already" | "invalid" | "done" | "error">("loading");
  const [submitting, setSubmitting] = useState(false);
  const token = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") : null;

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        if (r.status === 404) { setStatus("invalid"); return; }
        const j = await r.json();
        if (j.valid) setStatus("valid");
        else if (j.reason === "already_unsubscribed") setStatus("already");
        else setStatus("invalid");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const r = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const j = await r.json();
      if (j.success) setStatus("done");
      else if (j.reason === "already_unsubscribed") setStatus("already");
      else setStatus("error");
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="p-8 max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-bold">Cancelar suscripción</h1>
        {status === "loading" && <p className="text-muted-foreground">Validando enlace…</p>}
        {status === "valid" && (
          <>
            <p className="text-muted-foreground">¿Deseas dejar de recibir nuestros correos?</p>
            <Button onClick={confirm} disabled={submitting} className="w-full">
              {submitting ? "Procesando…" : "Confirmar cancelación"}
            </Button>
          </>
        )}
        {status === "already" && <p className="text-muted-foreground">Ya estabas dado de baja. No recibirás más correos.</p>}
        {status === "done" && <p className="text-green-600">Cancelación completada. No recibirás más correos.</p>}
        {status === "invalid" && <p className="text-destructive">Enlace inválido o expirado.</p>}
        {status === "error" && <p className="text-destructive">Ocurrió un error. Intenta de nuevo más tarde.</p>}
      </Card>
    </div>
  );
}