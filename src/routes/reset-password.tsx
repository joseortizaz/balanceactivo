import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Restablecer contraseña — Balance Activo" },
      { name: "description", content: "Define una nueva contraseña para tu cuenta de Balance Activo." },
      { property: "og:title", content: "Restablecer contraseña — Balance Activo" },
      { property: "og:description", content: "Define una nueva contraseña para tu cuenta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    // Recovery link carries type=recovery in the URL hash
    if (window.location.hash.includes("type=recovery")) {
      setReady(true);
      return;
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    const t = setTimeout(() => setInvalid((v) => !v), 5000);
    return () => { subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 8) return toast.error("La contraseña debe tener al menos 8 caracteres");
    if (pwd !== pwd2) return toast.error("Las contraseñas no coinciden");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Contraseña actualizada");
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">B</div>
          <span className="font-semibold">Balance Activo</span>
        </div>
        <h1 className="text-2xl font-semibold mb-1">Restablecer contraseña</h1>
        {ready ? (
          <>
            <p className="text-sm text-muted-foreground mb-6">Define tu nueva contraseña.</p>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="pwd">Nueva contraseña</Label>
                <div className="relative mt-1">
                  <Input
                    id="pwd"
                    type={show ? "text" : "password"}
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="pwd2">Confirmar contraseña</Label>
                <Input
                  id="pwd2"
                  type={show ? "text" : "password"}
                  value={pwd2}
                  onChange={(e) => setPwd2(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Guardando…" : "Guardar contraseña"}
              </Button>
            </form>
          </>
        ) : (
          <p className="text-sm text-muted-foreground mb-6">
            {invalid
              ? "Este enlace no es válido o ya fue utilizado. Solicita un nuevo correo de recuperación."
              : "Verificando el enlace de recuperación…"}
          </p>
        )}
        <p className="text-sm text-center mt-4 text-muted-foreground">
          <Link to="/login" className="text-primary font-medium">Volver al inicio de sesión</Link>
        </p>
      </Card>
    </div>
  );
}
