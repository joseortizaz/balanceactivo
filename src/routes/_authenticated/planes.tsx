import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { fmtMoney } from "@/lib/format";
import { PLANES, type PlanCodigo, getPlan } from "@/lib/planes";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/planes")({ component: PlanesPage });

function PlanesPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [seleccion, setSeleccion] = useState<PlanCodigo | null>(null);
  const [nomina, setNomina] = useState<Record<PlanCodigo, boolean>>({
    emprendedor: false, mipyme: false, corporativo: false,
  });
  const [saving, setSaving] = useState(false);

  const { data: actual } = useQuery({
    queryKey: ["suscripcion-actual", auth.tenantId],
    enabled: !!auth.tenantId,
    queryFn: async () => (await supabase.from("suscripciones" as any)
      .select("*").eq("tenant_id", auth.tenantId!)
      .order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });

  const solicitar = async (codigo: PlanCodigo) => {
    if (!auth.hasRole("administrador")) {
      toast.error("Solo los administradores pueden solicitar un plan");
      return;
    }
    const plan = getPlan(codigo);
    const incluyeNomina = nomina[codigo];
    const precioNomina = incluyeNomina ? plan.precioNomina : 0;
    setSaving(true);
    const { error } = await supabase.from("suscripciones" as any).insert({
      tenant_id: auth.tenantId,
      plan: codigo,
      incluye_nomina: incluyeNomina,
      nomina_estado: incluyeNomina ? "pendiente" : "no_solicitado",
      precio_plan: plan.precio,
      precio_nomina: precioNomina,
      precio_total: plan.precio + precioNomina,
      limite_facturacion_mensual: plan.limiteFacturacion,
      created_by: auth.user?.id,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Solicitud enviada. El SuperAdministrador fue notificado y activará tu plan tras confirmar el pago.");
    qc.invalidateQueries({ queryKey: ["suscripcion-actual"] });
    navigate({ to: "/suscripcion" });
  };

  return (
    <div>
      <PageHeader
        title="Planes de suscripción"
        description="Elige el plan que mejor se adapta a tu empresa. Pagos mediante transferencia bancaria."
      />
      {actual && (actual as any).estado === "pendiente" && (
        <Card className="p-4 mb-6 border-amber-500/40 bg-amber-500/5">
          <div className="text-sm">
            Tienes una solicitud <strong>pendiente de activación</strong>.{" "}
            <button className="text-primary font-medium underline" onClick={() => navigate({ to: "/suscripcion" })}>
              Ver instrucciones de pago
            </button>
          </div>
        </Card>
      )}
      <div className="grid md:grid-cols-3 gap-5">
        {PLANES.map((p) => {
          const total = p.precio + (nomina[p.codigo] ? p.precioNomina : 0);
          const isSelected = seleccion === p.codigo;
          return (
            <Card
              key={p.codigo}
              className={`p-6 flex flex-col relative transition-all ${
                p.destacado ? "border-primary shadow-lg" : ""
              } ${isSelected ? "ring-2 ring-primary" : ""}`}
              onClick={() => setSeleccion(p.codigo)}
            >
              {p.destacado && (
                <Badge className="absolute -top-3 left-6 gap-1"><Sparkles className="h-3 w-3" />Recomendado</Badge>
              )}
              <div className="mb-4">
                <h3 className="text-xl font-bold">{p.nombre}</h3>
                <p className="text-sm text-muted-foreground mt-1">{p.descripcion}</p>
              </div>
              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight">{fmtMoney(total)}</span>
                  <span className="text-sm text-muted-foreground">/mes</span>
                </div>
                {nomina[p.codigo] && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Plan {fmtMoney(p.precio)} + Nómina {fmtMoney(p.precioNomina)}
                  </div>
                )}
              </div>

              <ul className="space-y-2 mb-5 flex-1">
                {p.beneficios.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/40 mb-4">
                <div>
                  <Label htmlFor={`nom-${p.codigo}`} className="font-medium cursor-pointer">
                    Añadir módulo Nómina
                  </Label>
                  <div className="text-xs text-muted-foreground">+{fmtMoney(p.precioNomina)} /mes</div>
                </div>
                <Switch
                  id={`nom-${p.codigo}`}
                  checked={nomina[p.codigo]}
                  onCheckedChange={(v) => setNomina((n) => ({ ...n, [p.codigo]: v }))}
                />
              </div>

              <Button
                className="w-full"
                variant={p.destacado ? "default" : "outline"}
                disabled={saving || !auth.hasRole("administrador")}
                onClick={(e) => { e.stopPropagation(); solicitar(p.codigo); }}
              >
                {saving ? "Procesando…" : "Solicitar este plan"}
              </Button>
            </Card>
          );
        })}
      </div>
      {!auth.hasRole("administrador") && (
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Solo el administrador de la empresa puede solicitar una suscripción.
        </p>
      )}
    </div>
  );
}