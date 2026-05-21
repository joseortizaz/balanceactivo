import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtMoney, fmtDate } from "@/lib/format";
import { DATOS_TRANSFERENCIA, ESTADO_LABEL, getPlan } from "@/lib/planes";
import { Building2, Copy, Mail, CreditCard } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/suscripcion")({ component: SuscripcionPage });

function SuscripcionPage() {
  const auth = useAuth();

  const { data: s, isLoading } = useQuery({
    queryKey: ["suscripcion-actual", auth.tenantId],
    enabled: !!auth.tenantId,
    queryFn: async () => (await supabase.from("suscripciones" as any)
      .select("*").eq("tenant_id", auth.tenantId!)
      .order("created_at", { ascending: false }).limit(1).maybeSingle()).data as any,
  });

  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Copiado al portapapeles"); };

  if (isLoading) return <div className="text-muted-foreground">Cargando…</div>;

  if (!s) {
    return (
      <div>
        <PageHeader title="Mi suscripción" description="Aún no tienes un plan activo" />
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">Selecciona un plan para comenzar a usar Balance Activo.</p>
          <Link to="/planes"><Button>Ver planes disponibles</Button></Link>
        </Card>
      </div>
    );
  }

  const plan = getPlan(s.plan);
  const est = ESTADO_LABEL[s.estado] ?? { label: s.estado, tone: "outline" as const };

  return (
    <div>
      <PageHeader title="Mi suscripción" description="Estado y detalles de tu plan" />

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Plan actual</div>
              <h2 className="text-2xl font-bold">{plan.nombre}</h2>
            </div>
            <Badge variant={est.tone}>{est.label}</Badge>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-6 text-sm">
            <Info label="Precio del plan" value={fmtMoney(s.precio_plan)} />
            <Info label="Módulo de Nómina" value={s.incluye_nomina ? `Sí (${fmtMoney(s.precio_nomina)})` : "No"} />
            <Info label="Total mensual" value={<strong>{fmtMoney(s.precio_total)}</strong>} />
            <Info label="Límite de facturación" value={`${fmtMoney(s.limite_facturacion_mensual)} / mes`} />
            <Info label="Fecha de inicio" value={s.fecha_inicio ? fmtDate(s.fecha_inicio) : "—"} />
            <Info label="Fecha de término" value={s.fecha_termino ? fmtDate(s.fecha_termino) : "—"} />
            <Info label="Fecha de solicitud" value={fmtDate(s.fecha_solicitud)} />
            <Info label="Método de pago" value="Transferencia bancaria" />
          </div>

          {s.estado === "pendiente" && (
            <div className="p-4 rounded-lg border border-amber-500/40 bg-amber-500/5 text-sm">
              Tu suscripción está pendiente de activación. Una vez recibida y validada la transferencia, un administrador activará tu plan.
            </div>
          )}
          {(s.estado === "vencida" || s.estado === "suspendida") && (
            <div className="p-4 rounded-lg border border-destructive/40 bg-destructive/5 text-sm">
              Tu suscripción está <strong>{est.label.toLowerCase()}</strong>. Realiza el pago o contáctanos para reactivarla.
            </div>
          )}

          <div className="mt-5 flex gap-2">
            <Link to="/planes"><Button variant="outline">Cambiar de plan</Button></Link>
          </div>
        </Card>

        {(s.estado === "pendiente" || s.estado === "vencida" || s.estado === "suspendida") && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Instrucciones de pago</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Realiza una transferencia por <strong>{fmtMoney(s.precio_total)}</strong> a cualquiera de nuestras cuentas:
            </p>

            <div className="space-y-3 mb-4">
              <div className="text-xs">
                <div className="text-muted-foreground">Beneficiario</div>
                <div className="flex items-center gap-2 font-medium">
                  <Building2 className="h-3 w-3" /> {DATOS_TRANSFERENCIA.beneficiario}
                </div>
                <div className="text-muted-foreground mt-1">RNC: {DATOS_TRANSFERENCIA.rnc}</div>
              </div>

              {DATOS_TRANSFERENCIA.bancos.map((b) => (
                <div key={b.numero} className="p-3 rounded-md border border-border text-xs space-y-1">
                  <div className="font-medium">{b.banco}</div>
                  <div className="text-muted-foreground">{b.tipo}</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono">{b.numero}</span>
                    <Button size="sm" variant="ghost" onClick={() => copy(b.numero)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-xs text-muted-foreground border-t border-border pt-3">
              <div className="flex items-start gap-2">
                <Mail className="h-3 w-3 mt-0.5" />
                <span>Envía el comprobante a <strong>{DATOS_TRANSFERENCIA.correo}</strong> indicando tu RNC para activación.</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}