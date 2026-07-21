import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Turnstile } from "@/components/Turnstile";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "Crear empresa — Balance Activo" },
      {
        name: "description",
        content:
          "Crea tu empresa en Balance Activo y comienza a emitir facturas con NCF, calcular ITBIS y generar reportes 606/607 desde el primer día.",
      },
      { property: "og:title", content: "Crear empresa — Balance Activo" },
      {
        property: "og:description",
        content: "Registra tu empresa y prueba gratis la contabilidad y facturación de Balance Activo.",
      },
      { property: "og:url", content: "https://balanceactivo.net/signup" },
    ],
    links: [{ rel: "canonical", href: "https://balanceactivo.net/signup" }],
  }),
});

function SignupPage() {
  const navigate = useNavigate();
  const [razonSocial, setRazonSocial] = useState("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>(undefined);
  const captchaRequired = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { razon_social: razonSocial, nombre },
        ...(captchaToken ? { captchaToken } : {}),
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    // Si auto-confirm está activado, signUp ya devuelve una sesión activa —
    // no hace falta un segundo signInWithPassword (que además requeriría un
    // token de captcha nuevo, ya que el de arriba se consume en esta misma
    // llamada).
    if (data.session) {
      toast.success("Empresa creada. Bienvenido.");
      navigate({ to: "/dashboard" });
      return;
    }
    toast.info("Revisa tu correo para confirmar la cuenta");
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold mb-1">Crear empresa</h1>
        <p className="text-sm text-muted-foreground mb-6">Tú serás el administrador</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="razon-social">Razón social</Label>
            <Input id="razon-social" required value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} placeholder="Mi Empresa SRL" />
          </div>
          <div>
            <Label htmlFor="nombre">Tu nombre</Label>
            <Input id="nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Turnstile onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(undefined)} />
          <Button type="submit" className="w-full" disabled={loading || (captchaRequired && !captchaToken)}>
            {loading ? "Creando…" : "Crear empresa"}
          </Button>
        </form>
        <p className="text-sm text-center mt-4 text-muted-foreground">
          ¿Ya tienes cuenta? <Link to="/login" className="text-primary font-medium">Inicia sesión</Link>
        </p>
      </Card>
    </div>
  );
}