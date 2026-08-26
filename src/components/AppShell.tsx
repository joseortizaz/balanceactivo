import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, FileText, Users, BookOpen, Truck, Receipt, Settings, ShieldCheck, BarChart3, LogOut, Wallet, ListChecks, Crown, Building2, FileSpreadsheet, Repeat, Package, Briefcase, TrendingDown, CreditCard, Sparkles, Plug, PieChart, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; roles?: AppRole[] };

const NAV: Item[] = [
  { to: "/superadmin", label: "Super Admin", icon: Crown, roles: ["super_admin"] },
  { to: "/superadmin/suscripciones", label: "Suscripciones", icon: CreditCard, roles: ["super_admin"] },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/facturas", label: "Facturas", icon: FileText, roles: ["administrador", "agente_facturacion", "contador"] },
  { to: "/cotizaciones", label: "Cotizaciones", icon: FileSpreadsheet, roles: ["administrador", "agente_facturacion", "contador"] },
  { to: "/recurrentes", label: "Facturas Recurrentes", icon: Repeat, roles: ["administrador", "agente_facturacion"] },
  { to: "/cobros", label: "Cobros", icon: Wallet, roles: ["administrador", "agente_facturacion"] },
  { to: "/cuentas-por-cobrar", label: "Cuentas por Cobrar", icon: AlertCircle, roles: ["administrador", "contador"] },
  { to: "/clientes", label: "Clientes", icon: Users, roles: ["administrador", "agente_facturacion", "contador"] },
  { to: "/productos", label: "Productos", icon: Package, roles: ["administrador", "agente_facturacion", "contador"] },
  { to: "/proveedores", label: "Proveedores", icon: Truck, roles: ["administrador", "contador"] },
  { to: "/gastos", label: "Gastos", icon: TrendingDown, roles: ["administrador", "contador"] },
  { to: "/cuentas", label: "Catálogo de Cuentas", icon: BookOpen, roles: ["administrador", "contador"] },
  { to: "/asientos", label: "Asientos", icon: ListChecks, roles: ["administrador", "contador"] },
  { to: "/nomina", label: "Nómina", icon: Briefcase, roles: ["administrador", "contador"] },
  { to: "/reportes", label: "Reportes DGII", icon: BarChart3 },
  { to: "/reportes-internos", label: "Ingresos y Gastos", icon: PieChart, roles: ["administrador"] },
  { to: "/configuracion", label: "Configuración Fiscal", icon: Settings, roles: ["administrador"] },
  { to: "/api-integraciones", label: "API & Webhooks", icon: Plug, roles: ["administrador"] },
  { to: "/perfil-empresa", label: "Perfil de Empresa", icon: Building2, roles: ["administrador", "contador", "agente_facturacion"] },
  { to: "/auditoria", label: "Auditoría", icon: ShieldCheck, roles: ["administrador"] },
  { to: "/planes", label: "Planes", icon: Sparkles, roles: ["administrador"] },
  { to: "/suscripcion", label: "Mi Suscripción", icon: CreditCard, roles: ["administrador"] },
];

export function AppShell() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location.pathname });

  const { data: pendientesCount = 0 } = useQuery({
    queryKey: ["sa-subs-pendientes-count"],
    enabled: auth.roles.includes("super_admin"),
    refetchInterval: 30000,
    queryFn: async () => {
      const { count } = await supabase
        .from("suscripciones" as any)
        .select("id", { count: "exact", head: true })
        .eq("estado", "pendiente");
      return count ?? 0;
    },
  });

  const { data: empresa } = useQuery({
    queryKey: ["empresa-actual", auth.tenantId],
    enabled: !!auth.tenantId && !auth.roles.includes("super_admin"),
    queryFn: async () => {
      const { data } = await supabase
        .from("tenants")
        .select("razon_social, nombre_comercial, logo_url")
        .eq("id", auth.tenantId!)
        .maybeSingle();
      return data;
    },
  });

  const { data: logoSrc } = useQuery({
    queryKey: ["empresa-logo", empresa?.logo_url],
    enabled: !!empresa?.logo_url,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const path = empresa!.logo_url as string;
      if (/^https?:\/\//.test(path)) return path;
      const { data } = await supabase.storage
        .from("tenant-assets")
        .createSignedUrl(path, 60 * 60);
      return data?.signedUrl ?? null;
    },
  });

  if (auth.loading) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Cargando…</div>;
  }
  if (!auth.session) {
    if (typeof window !== "undefined") navigate({ to: "/login" });
    return null;
  }
  if (auth.debeCambiarPassword) {
    if (typeof window !== "undefined") navigate({ to: "/cambiar-password" });
    return null;
  }

  const isSuperAdmin = auth.roles.includes("super_admin");
  // El super administrador tiene un panel propio y NO debe ver los módulos
  // operativos de las empresas (facturación, clientes, contabilidad, etc.).
  const visible = isSuperAdmin
    ? NAV.filter((i) => i.roles?.includes("super_admin"))
    : NAV.filter((i) => !i.roles || i.roles.some((r) => auth.roles.includes(r)));

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
        {empresa && (
          <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-secondary/40">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={`Logo de ${empresa.nombre_comercial || empresa.razon_social}`}
                className="h-9 w-9 rounded-md object-contain bg-background border border-border"
              />
            ) : (
              <div className="h-9 w-9 rounded-md bg-muted text-muted-foreground flex items-center justify-center text-sm font-semibold">
                {(empresa.nombre_comercial || empresa.razon_social || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Empresa</div>
              <div className="text-sm font-medium text-foreground truncate">
                {empresa.nombre_comercial || empresa.razon_social}
              </div>
            </div>
          </div>
        )}
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
                <span className="flex-1">{item.label}</span>
                {item.to === "/superadmin/suscripciones" && pendientesCount > 0 && (
                  <span className={cn(
                    "ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold",
                    active ? "bg-primary-foreground text-primary" : "bg-destructive text-destructive-foreground"
                  )}>
                    {pendientesCount}
                  </span>
                )}
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