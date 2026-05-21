import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { ESTADO_LABEL } from "@/lib/planes";

export function SubscriptionBanner() {
  const auth = useAuth();

  const { data: s } = useQuery({
    queryKey: ["suscripcion-actual", auth.tenantId],
    enabled: !!auth.tenantId,
    queryFn: async () => (await supabase.from("suscripciones" as any)
      .select("*").eq("tenant_id", auth.tenantId!)
      .order("created_at", { ascending: false }).limit(1).maybeSingle()).data as any,
  });

  const { data: ventasMes } = useQuery({
    queryKey: ["ventas-mes-banner", auth.tenantId],
    enabled: !!auth.tenantId,
    queryFn: async () => {
      const start = new Date(); start.setDate(1);
      const startIso = start.toISOString().slice(0, 10);
      const { data } = await supabase.from("facturas").select("total").gte("fecha", startIso);
      return (data ?? []).reduce((sum, f: any) => sum + Number(f.total ?? 0), 0);
    },
  });

  if (!s) {
    return (
      <Card className="p-4 mb-5 border-primary/40 bg-primary/5 flex items-center gap-3">
        <Info className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 text-sm">
          <strong>Aún no tienes un plan activo.</strong> Explora nuestros planes para empezar a usar Balance Activo.
        </div>
        <Link to="/planes"><Button size="sm">Ver planes</Button></Link>
      </Card>
    );
  }

  const banners: React.ReactNode[] = [];

  if (s.estado === "pendiente") {
    banners.push(
      <Card key="pend" className="p-4 mb-3 border-amber-500/40 bg-amber-500/5 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
        <div className="flex-1 text-sm">
          Tu suscripción está <strong>Pendiente de Activación</strong>. Realiza la transferencia para activar tu plan.
        </div>
        <Link to="/suscripcion"><Button size="sm" variant="outline">Ver instrucciones</Button></Link>
      </Card>
    );
  }
  if (s.estado === "vencida" || s.estado === "suspendida") {
    banners.push(
      <Card key="ven" className="p-4 mb-3 border-destructive/40 bg-destructive/5 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
        <div className="flex-1 text-sm">
          Tu suscripción está <strong>{ESTADO_LABEL[s.estado].label}</strong>. Renueva para evitar la interrupción del servicio.
        </div>
        <Link to="/suscripcion"><Button size="sm" variant="destructive">Renovar</Button></Link>
      </Card>
    );
  }

  if (s.estado === "activa" && s.limite_facturacion_mensual > 0 && ventasMes !== undefined) {
    const pct = (ventasMes / Number(s.limite_facturacion_mensual)) * 100;
    if (pct >= 100) {
      banners.push(
        <Card key="lim" className="p-4 mb-3 border-destructive/40 bg-destructive/5 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1 text-sm">
            Alcanzaste el <strong>límite mensual de facturación</strong> de tu plan: {fmtMoney(ventasMes)} de {fmtMoney(s.limite_facturacion_mensual)}.
          </div>
          <Link to="/planes"><Button size="sm">Mejorar plan</Button></Link>
        </Card>
      );
    } else if (pct >= 80) {
      banners.push(
        <Card key="warn" className="p-4 mb-3 border-amber-500/40 bg-amber-500/5 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1 text-sm">
            Has facturado {fmtMoney(ventasMes)} ({pct.toFixed(0)}%) del límite mensual de {fmtMoney(s.limite_facturacion_mensual)}.
          </div>
          <Link to="/planes"><Button size="sm" variant="outline">Ver planes</Button></Link>
        </Card>
      );
    }
  }

  return banners.length > 0 ? <div>{banners}</div> : null;
}