import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, FileText, Shield, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">B</div>
            <span className="font-semibold text-foreground">Balance Activo</span>
          </div>
          <div className="flex gap-2">
            <Link to="/login"><Button variant="ghost">Iniciar sesión</Button></Link>
            <Link to="/signup"><Button>Crear empresa</Button></Link>
          </div>
        </div>
      </header>
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight">
          Contabilidad y Facturación<br />para República Dominicana
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Emite facturas con NCF, calcula ITBIS, genera asientos contables automáticos y prepara tus reportes 606/607 para la DGII desde una sola plataforma.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link to="/signup"><Button size="lg">Empezar gratis</Button></Link>
          <Link to="/login"><Button size="lg" variant="outline">Ya tengo cuenta</Button></Link>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-6 pb-20 grid md:grid-cols-4 gap-4">
        {[
          { icon: FileText, t: "NCF Automáticos", d: "B01, B02, B04 y B15 con numeración secuencial bloqueada." },
          { icon: CheckCircle2, t: "Asientos Automáticos", d: "Cada factura registra su asiento contable en tiempo real." },
          { icon: Shield, t: "Multi-empresa", d: "Aislamiento total entre tenants con RLS estricto." },
          { icon: BarChart3, t: "Reportes DGII", d: "Vista pre-606/607 lista para exportar." },
        ].map((f) => (
          <Card key={f.t} className="p-5">
            <f.icon className="h-6 w-6 text-primary mb-3" />
            <div className="font-semibold text-foreground">{f.t}</div>
            <div className="text-sm text-muted-foreground mt-1">{f.d}</div>
          </Card>
        ))}
      </section>
    </div>
  );
}
