import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mfa")({
  component: MfaPage,
  head: () => ({
    meta: [
      { title: "Verificación en dos pasos — IngreSaaS" },
      {
        name: "description",
        content:
          "Activa o desactiva la autenticación en dos pasos (TOTP) para tu cuenta de IngreSaaS con Google Authenticator, Authy o similar.",
      },
    ],
  }),
});

type TotpFactor = {
  id: string;
  friendly_name?: string | null;
  status: string;
  created_at: string;
};

function MfaPage() {
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qrDataUri, setQrDataUri] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadFactors = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setFactors((data?.totp ?? []) as TotpFactor[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadFactors();
  }, [loadFactors]);

  const startEnroll = async () => {
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Aplicación autenticadora",
    });
    if (error || !data) {
      toast.error(error?.message ?? "No se pudo iniciar la configuración");
      setEnrolling(false);
      return;
    }
    const totp = (data as unknown as { totp?: { qr_code?: string; secret?: string } }).totp;
    if (!totp?.secret) {
      toast.error("No se pudo generar el código QR");
      setEnrolling(false);
      return;
    }
    setEnrollFactorId(data.id);
    setSecret(totp.secret);
    if (totp.qr_code) {
      try {
        setQrDataUri(`data:image/svg+xml;base64,${btoa(totp.qr_code)}`);
      } catch {
        setQrDataUri(null);
      }
    }
  };

  const cancelEnroll = () => {
    setEnrolling(false);
    setEnrollFactorId(null);
    setQrDataUri(null);
    setSecret("");
    setCode("");
  };

  const confirmEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollFactorId) return;
    setVerifying(true);
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({
      factorId: enrollFactorId,
    });
    if (cErr || !challenge) {
      toast.error(cErr?.message ?? "No se pudo iniciar la verificación");
      setVerifying(false);
      return;
    }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: enrollFactorId,
      challengeId: challenge.id,
      code,
    });
    setVerifying(false);
    if (vErr) {
      toast.error("Código inválido. Verifica que el código esté vigente e intenta de nuevo.");
      return;
    }
    toast.success("Verificación en dos pasos activada");
    cancelEnroll();
    void loadFactors();
  };

  const unenroll = async (factor: TotpFactor) => {
    if (
      !confirm(
        "¿Desactivar la verificación en dos pasos? Tu cuenta quedará protegida solo con la contraseña.",
      )
    )
      return;
    setRemovingId(factor.id);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    setRemovingId(null);
    if (error) return toast.error(error.message);
    toast.success("Verificación en dos pasos desactivada");
    void loadFactors();
  };

  const verified = factors.some((f) => f.status === "verified");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" /> Verificación en dos pasos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Agrega una capa extra de seguridad: además de tu contraseña, se pedirá un código de 6
          dígitos de tu aplicación autenticadora (Google Authenticator, Authy, Microsoft
          Authenticator, etc.).
        </p>
      </div>

      <Card className="p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : verified ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
              <span className="font-medium">Verificación en dos pasos activa</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Al iniciar sesión, después de tu contraseña se te pedirá el código de tu aplicación
              autenticadora.
            </p>
            <div className="space-y-2">
              {factors.map((factor) => (
                <div
                  key={factor.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {factor.friendly_name || "Aplicación autenticadora"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {factor.status === "verified" ? "Verificado" : "Pendiente de confirmar"} ·{" "}
                        {new Date(factor.created_at).toLocaleDateString("es-DO")}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={removingId === factor.id}
                    onClick={() => void unenroll(factor)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {removingId === factor.id ? "Desactivando…" : "Desactivar"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : enrollFactorId ? (
          <div className="space-y-4">
            <h2 className="font-semibold">Configura tu aplicación autenticadora</h2>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Abre tu aplicación autenticadora (Google Authenticator, Authy, etc.).</li>
              <li>Escanea este código QR o introduce la clave manualmente.</li>
              <li>Escribe el código de 6 dígitos que muestra la app y confirma.</li>
            </ol>
            <div className="flex flex-col items-center gap-3 py-2">
              {qrDataUri ? (
                <img
                  src={qrDataUri}
                  alt="Código QR de configuración TOTP"
                  className="h-48 w-48 rounded-md border border-border bg-white p-2"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Escanea manualmente este secreto en tu aplicación:
                </p>
              )}
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Clave manual</div>
                <code className="text-sm font-mono break-all">{secret}</code>
              </div>
            </div>
            <form onSubmit={confirmEnroll} className="space-y-3">
              <div>
                <Label htmlFor="mfa-code">Código de 6 dígitos</Label>
                <Input
                  id="mfa-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="text-center font-mono text-lg tracking-widest"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={verifying || code.length < 6}>
                  {verifying ? "Verificando…" : "Verificar y activar"}
                </Button>
                <Button type="button" variant="outline" onClick={cancelEnroll}>
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
              <span className="font-medium">Verificación en dos pasos desactivada</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Tu cuenta actualmente se protege solo con la contraseña. Actívala para exigir un
              código adicional en cada inicio de sesión.
            </p>
            {factors.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Dispositivos pendientes de confirmar:</p>
                {factors.map((factor) => (
                  <div
                    key={factor.id}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                  >
                    <div className="text-sm truncate">{factor.friendly_name || "Pendiente"}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={removingId === factor.id}
                      onClick={() => void unenroll(factor)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button onClick={() => void startEnroll()}>Activar verificación en dos pasos</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
