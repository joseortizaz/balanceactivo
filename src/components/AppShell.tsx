import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, FileText, Users, BookOpen, Truck, Receipt, Settings, ShieldCheck, BarChart3, LogOut, Wallet, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; roles?: AppRole[] };

const NAV: Item[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/facturas", label: "Facturas", icon: FileText, roles: ["administrador", "agente_facturacion", "contador"] },
  { to: "/cobros", label: "Cobros", icon: Wallet, roles: ["administrador", "agente_facturacion"] },
  { to: "/clientes", label: "Clientes", icon: Users, roles: ["administrador", "agente_facturacion", "contador"] },
  { to: "/proveedores", label: "Proveedores", icon: Truck, roles: ["administrador", "contador"] },
  { to: "/cuentas", label: "Catálogo de Cuentas", icon: BookOpen, roles: ["administrador", "contador"] },
  { to: "/asientos", label: "Asientos", icon: ListChecks, roles: ["administrador", "contador"] },
  { to: "/reportes", label: "Reportes 606/607", icon: BarChart3 },
  { to: "/configuracion", label: "Configuración Fiscal", icon: Settings, roles: ["administrador"] },
  { to: "/auditoria", label: "Auditoría", icon: ShieldCheck, roles: ["administrador"] },
];

export function AppShell() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location.pathname });

  if (auth.loading) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Cargando…</div>;
  }
  if (!auth.session) {
    if (typeof window !== "undefined") navigate({ to: "/login" });
    return null;
  }

  const visible = NAV.filter((i) => !i.roles || i.roles.some((r) => auth.roles.includes(r)));

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="md:w-64 md:min-h-screen bg-card border-r border-border flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">B</div>
            <div>
              <div className="font-semibold text-foreground">Balance Activo</div>
              <div className="text-xs text-muted-foreground">Contabilidad RD</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {visible.map((item) => {
            const Icon = item.icon;
            const active = location === item.to || location.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="px-2 pb-2">
            <div className="text-sm font-medium text-foreground truncate">{auth.nombre}</div>
            <div className="text-xs text-muted-foreground truncate">
              {auth.roles.map((r) => r.replace("_", " ")).join(", ")}
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}