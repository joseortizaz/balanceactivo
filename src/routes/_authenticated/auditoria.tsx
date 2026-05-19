import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/auditoria")({ component: Auditoria });

function Auditoria() {
  const auth = useAuth();
  const { data } = useQuery({
    queryKey: ["logs"],
    queryFn: async () => (await supabase.from("logs_auditoria").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });
  if (!auth.hasRole("administrador")) return <div className="text-muted-foreground">Solo administrador.</div>;
  return (
    <div>
      <PageHeader title="Auditoría" description="Acciones registradas en el sistema" />
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>
            <th className="text-left p-3">Fecha</th><th className="text-left p-3">Acción</th><th className="text-left p-3">Tabla</th><th className="text-left p-3">Detalles</th>
          </tr></thead>
          <tbody>
            {(data ?? []).map((l: any) => (
              <tr key={l.id} className="border-t border-border">
                <td className="p-3 text-xs">{new Date(l.created_at).toLocaleString("es-DO")}</td>
                <td className="p-3">{l.accion}</td>
                <td className="p-3 font-mono text-xs">{l.tabla_afectada}</td>
                <td className="p-3 text-xs font-mono">{JSON.stringify(l.detalles)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}