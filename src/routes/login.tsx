import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Turnstile } from "@/components/Turnstile";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import logo from "@/assets/logo-ingresaas-horizontal.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Iniciar sesión — IngreSaaS" },
      {
        name: "description",
        content:
          "Accede a tu cuenta de IngreSaaS para gestionar facturación, contabilidad y reportes DGII de tu empresa.",
      },
      { property: "og:title", content: "Iniciar sesión — IngreSaaS" },
      {
        property: "og:description",
        content: "Accede a tu cuenta de IngreSaaS y gestiona la contabilidad de tu empresa.",
      },
      { property: "og:url", content: "https://ingresaas.net/login" },
    ],
    links: [{ rel: "canonical", href: "https://ingresaas.net/login" }],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  // Segundo paso (verificación en dos pasos)
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | undefined>(undefined);
  const captchaRequired = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    // ¿La cuenta tiene verificación en dos pasos? Entonces falta el código.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.[0];
      if (totp) {
        setLoading(false);
        setMfaCode("");
        setMfaFactorId(totp.id);
        return;
      }
    }
    setLoading(false);
    toast.success("Bienvenido");
    navigate({ to: "/dashboard" });
  };

  const verifyMfa = async () => {
    if (!mfaFactorId || mfaCode.length !== 6) return;
    setLoading(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code: mfaCode });
    setLoading(false);
    if (error) {
      setMfaCode("");
      return toast.error("Código incorrecto. Inténtalo de nuevo.");
    }
    toast.success("Bienvenido");
    navigate({ to: "/dashboard" });
  };

  const cancelMfa = async () => {
    await supabase.auth.signOut();
    setMfaFactorId(null);
    setMfaCode("");
    setPassword("");
  };

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setResetSent(true);
  };

  if (mfaFactorId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8">
          <div className="flex items-center gap-2 mb-6">
            <Link to="/" aria-label="Ir al inicio" className="inline-flex"><img src={logo} alt="IngreSaaS" className="h-9 w-auto" /></Link>
          </div>
          <h1 className="text-2xl font-semibold mb-1">Verificación en dos pasos</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Escribe el código de 6 dígitos de tu app de autenticación.
          </p>
          <div className="flex justify-center mb-6">
            <InputOTP maxLength={6} value={mfaCode} onChange={setMfaCode} onComplete={verifyMfa} disabled={loading} autoFocus>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button className="w-full" onClick={verifyMfa} disabled={loading || mfaCode.length !== 6}>
            {loading ? "Verificando…" : "Verificar"}
          </Button>
          <button type="button" onClick={cancelMfa} className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground">
            Cancelar e iniciar sesión con otra cuenta
          </button>
        </Card>
      </div>
    );
  }

  if (forgot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8">
          <div className="flex items-center gap-2 mb-6">
            <Link to="/" aria-label="Ir al inicio" className="inline-flex"><img src={logo} alt="IngreSaaS" className="h-9 w-auto" /></Link>
          </div>
          <h1 className="text-2xl font-semibold mb-1">Recuperar contraseña</h1>
          {resetSent ? (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                Te enviamos un correo con un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada y spam.
              </p>
              <Button variant="outline" className="w-full" onClick={() => { setForgot(false); setResetSent(false); }}>
                Volver al inicio de sesión
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
              </p>
              <form onSubmit={submitForgot} className="space-y-4">
                <div>
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input id="forgot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Enviando…" : "Enviar enlace"}
                </Button>
              </form>
              <p className="text-sm text-center mt-4 text-muted-foreground">
                <button type="button" className="text-primary font-medium" onClick={() => setForgot(false)}>
                  Volver al inicio de sesión
                </button>
              </p>
            </>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center gap-2 mb-6">
          <Link to="/" aria-label="Ir al inicio" className="inline-flex"><img src={logo} alt="IngreSaaS" className="h-9 w-auto" /></Link>
        </div>
        <h1 className="text-2xl font-semibold mb-1">Iniciar sesión</h1>
        <p className="text-sm text-muted-foreground mb-6">Accede a tu empresa</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Contraseña</Label>
              <button
                type="button"
                className="text-xs text-primary font-medium"
                onClick={() => setForgot(true)}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Turnstile onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(undefined)} />
          <Button type="submit" className="w-full" disabled={loading || (captchaRequired && !captchaToken)}>
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>
        <p className="text-sm text-center mt-4 text-muted-foreground">
          ¿Nueva empresa? <Link to="/signup" className="text-primary font-medium">Crear cuenta</Link>
        </p>
      </Card>
    </div>
  );
}