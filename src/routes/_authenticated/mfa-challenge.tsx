import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mfa-challenge")({
  component: MfaChallengePage,
  head: () => ({
    meta: [
      { title: "Verificación en dos pasos — IngreSaaS" },
      {
        name: "description",
        content: "Introduce el código de verificación en dos pasos para continuar.",
      },
    ],
  }),
});

function MfaChallengePage() {
  const navigate = useNavigate();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (!mounted) return;
      if (error) {
        setError(error.message);
        return;
      }
      const totp = data?.totp ?? [];
      const factor = totp.find((f) => f.status === "verified") ?? totp[0];
      if (!factor) {
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      setFactorId(factor.id);
    })();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setLoading(true);
    setError(null);
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (cErr || !challenge) {
      setLoading(false);
      setError(cErr?.message ?? "No se pudo iniciar la verificación");
      return;
    }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    setLoading(false);
    if (vErr) {
      setError("Código inválido. Verifica que el código esté vigente e intenta de nuevo.");
      return;
    }
    toast.success("Verificación exitosa");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="max-w-md mx-auto">
      <Card className="p-8">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-6 w-6" />
          <h1 className="text-xl font-semibold">Verificación en dos pasos</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Escribe el código de 6 dígitos que muestra tu aplicación autenticadora para continuar.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="mfa-challenge-code">Código de 6 dígitos</Label>
            <Input
              id="mfa-challenge-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="text-center font-mono text-lg tracking-widest"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || !factorId || code.length < 6}>
            {loading ? "Verificando…" : "Verificar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
