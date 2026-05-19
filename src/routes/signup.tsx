import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  const navigate = useNavigate();
  const [razonSocial, setRazonSocial] = useState("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { razon_social: razonSocial, nombre },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Empresa creada. Iniciando sesión…");
    // auto-confirm está activado: intentar login
    const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
    if (e2) {
      toast.info("Revisa tu correo para confirmar la cuenta");
      navigate({ to: "/login" });
      return;
    }
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold mb-1">Crear empresa</h1>
        <p className="text-sm text-muted-foreground mb-6">Tú serás el administrador</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Razón social</Label>
            <Input required value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} placeholder="Mi Empresa SRL" />
          </div>
          <div>
            <Label>Tu nombre</Label>
            <Input required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Contraseña</Label>
            <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creando…" : "Crear empresa"}</Button>
        </form>
        <p className="text-sm text-center mt-4 text-muted-foreground">
          ¿Ya tienes cuenta? <Link to="/login" className="text-primary font-medium">Inicia sesión</Link>
        </p>
      </Card>
    </div>
  );
}