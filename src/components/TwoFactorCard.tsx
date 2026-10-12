// Verificación en dos pasos (TOTP) con Supabase Auth MFA.
// Se usa en el panel del super administrador y en Perfil de Empresa → Seguridad.
import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type Enroll = { id: string; qr: string; secret: string };

function mensaje(err: { message?: string } | null | undefined, porDefecto: string) {
  const m = (err?.message ?? "").toLowerCase();
  if (m.includes("disabled") || m.includes("not enabled")) {
    return "La verificación en dos pasos no está habilitada en el servidor. Pídele al administrador de la plataforma que active MFA (TOTP) en la configuración de autenticación.";
  }
  if (m.includes("aal2") || m.includes("assurance")) {
    return "Por seguridad, cierra sesión y vuelve a entrar con tu código antes de desactivarla.";
  }
  return err?.message || porDefecto;
}

export function TwoFactorCard() {
  const [loading, setLoading] = useState(true);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enroll, setEnroll] = useState<Enroll | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactorId(data?.totp?.[0]?.id ?? null); // solo factores ya verificados
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, []);

  const start = async () => {
    setBusy(true);
    try {
      // Limpia intentos anteriores que quedaron sin verificar
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of list?.all ?? []) {
        if (f.factor_type === "totp" && f.status === "unverified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "IngreSaaS",
        issuer: "IngreSaaS",
      });
      if (error || !data) return toast.error(mensaje(error, "No se pudo iniciar la activación"));
      setCode("");
      setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (enroll) await supabase.auth.mfa.unenroll({ factorId: enroll.id });
    setEnroll(null);
    setCode("");
  };

  const verify = async () => {
    if (!enroll || code.length !== 6) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code });
    setBusy(false);
    if (error) {
      setCode("");
      return toast.error("Código incorrecto. Revisa la hora de tu teléfono e inténtalo de nuevo.");
    }
    toast.success("Verificación en dos pasos activada");
    setEnroll(null);
    setCode("");
    await refresh();
  };

  const disable = async () => {
    if (!factorId) return;
    if (!confirm("¿Desactivar la verificación en dos pasos? Tu cuenta quedará protegida solo por la contraseña.")) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) return toast.error(mensaje(error, "No se pudo desactivar"));
    toast.success("Verificación en dos pasos desactivada");
    await refresh();
  };

  return (
    <Card className="p-5 mt-4 max-w-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Verificación en dos pasos</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Además de tu contraseña, te pediremos un código de 6 dígitos de una app de autenticación
            (Google Authenticator, Microsoft Authenticator, Authy, etc.) cada vez que inicies sesión.
          </p>
        </div>
        {!loading && (
          <Badge variant={factorId ? "default" : "secondary"} className="shrink-0">
            {factorId ? "Activada" : "Desactivada"}
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-muted-foreground">Cargando…</div>
      ) : enroll ? (
        <div className="mt-5 space-y-4">
          <ol className="text-sm space-y-1 list-decimal pl-5 text-muted-foreground">
            <li>Abre tu app de autenticación y agrega una cuenta nueva.</li>
            <li>Escanea este código QR (o escribe la clave manualmente).</li>
            <li>Escribe el código de 6 dígitos que muestra la app.</li>
          </ol>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <img src={enroll.qr} alt="Código QR para la app de autenticación" className="h-44 w-44 rounded-md border border-border bg-white p-2" />
            <div className="text-xs w-full">
              <div className="text-muted-foreground">Clave manual</div>
              <code className="mt-1 block break-all rounded bg-secondary p-2 select-all">{enroll.secret}</code>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <InputOTP maxLength={6} value={code} onChange={setCode} onComplete={verify} disabled={busy} autoFocus>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
              </InputOTPGroup>
            </InputOTP>
            <div className="flex gap-2">
              <Button onClick={verify} disabled={busy || code.length !== 6}>Activar</Button>
              <Button variant="ghost" onClick={cancel} disabled={busy}>Cancelar</Button>
            </div>
          </div>
        </div>
      ) : factorId ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-brand-green-deep">
            <ShieldCheck className="h-4 w-4" /> Tu cuenta tiene doble verificación.
          </div>
          <Button variant="outline" onClick={disable} disabled={busy}>
            <ShieldOff className="h-4 w-4 mr-2" />Desactivar
          </Button>
        </div>
      ) : (
        <div className="mt-4">
          <Button onClick={start} disabled={busy}>
            <ShieldCheck className="h-4 w-4 mr-2" />Activar verificación en dos pasos
          </Button>
        </div>
      )}
    </Card>
  );
}
