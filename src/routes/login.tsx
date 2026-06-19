import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Iniciar sesión — Balance Activo" },
      {
        name: "description",
        content:
          "Accede a tu cuenta de Balance Activo para gestionar facturación, contabilidad y reportes DGII de tu empresa.",
      },
      { property: "og:title", content: "Iniciar sesión — Balance Activo" },
      {
        property: "og:description",
        content: "Accede a tu cuenta de Balance Activo y gestiona la contabilidad de tu empresa.",
      },
      { property: "og:url", content: "https://balanceactivo.net/login" },
    ],
    links: [{ rel: "canonical", href: "https://balanceactivo.net/login" }],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bienvenido");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">B</div>
          <span className="font-semibold">Balance Activo</span>
        </div>
        <h1 className="text-2xl font-semibold mb-1">Iniciar sesión</h1>
        <p className="text-sm text-muted-foreground mb-6">Accede a tu empresa</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Entrando…" : "Entrar"}</Button>
        </form>
        <p className="text-sm text-center mt-4 text-muted-foreground">
          ¿Nueva empresa? <Link to="/signup" className="text-primary font-medium">Crear cuenta</Link>
        </p>
      </Card>
    </div>
  );
}