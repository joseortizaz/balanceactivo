import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/cambiar-password")({
  component: CambiarPasswordPage,
  head: () => ({
    meta: [
      { title: "Cambiar contraseña — Balance Activo" },
      {
        name: "description",
        content:
          "Define una contraseña personal para tu cuenta de Balance Activo y reemplaza la contraseña provisional.",
      },
      { property: "og:title", content: "Cambiar contraseña — Balance Activo" },
      {
        property: "og:description",
        content: "Reemplaza tu contraseña provisional por una contraseña personal segura.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function CambiarPasswordPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.loading && !auth.session) navigate({ to: "/login" });
  }, [auth.loading, auth.session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 8) return toast.error("La contraseña debe tener al menos 8 caracteres");
    if (pwd !== pwd2) return toast.error("Las contraseñas no coinciden");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    if (auth.user) {
      await supabase.from("profiles").update({ debe_cambiar_password: false }).eq("id", auth.user.id);
    }
    setLoading(false);
    toast.success("Contraseña actualizada");
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold mb-1">Cambia tu contraseña</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Estás usando una contraseña provisional. Define una contraseña personal para continuar.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="pwd">Nueva contraseña</Label>
            <Input id="pwd" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="pwd2">Confirmar contraseña</Label>
            <Input id="pwd2" type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} required className="mt-1" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Guardando…" : "Guardar contraseña"}
          </Button>
        </form>
      </Card>
    </div>
  );
}