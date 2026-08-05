import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "administrador" | "contador" | "agente_facturacion" | "super_admin";

export interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  tenantId: string | null;
  nombre: string | null;
  roles: AppRole[];
  debeCambiarPassword: boolean;
}

export function useAuth(): AuthState & { hasRole: (r: AppRole) => boolean; hasAny: (rs: AppRole[]) => boolean } {
  const [state, setState] = useState<AuthState>({
    loading: true, session: null, user: null, tenantId: null, nombre: null, roles: [], debeCambiarPassword: false,
  });

  useEffect(() => {
    let mounted = true;
    const load = async (session: Session | null) => {
      if (!session) {
        if (mounted) setState({ loading: false, session: null, user: null, tenantId: null, nombre: null, roles: [], debeCambiarPassword: false });
        return;
      }
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("tenant_id, nombre, debe_cambiar_password").eq("id", session.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", session.user.id),
      ]);
      if (!mounted) return;
      setState({
        loading: false,
        session,
        user: session.user,
        tenantId: profile?.tenant_id ?? null,
        nombre: profile?.nombre ?? null,
        roles: (roles ?? []).map((r) => r.role as AppRole),
        debeCambiarPassword: profile?.debe_cambiar_password ?? false,
      });
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => { load(s); });
    supabase.auth.getSession().then(({ data }) => load(data.session));
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  return {
    ...state,
    hasRole: (r) => state.roles.includes(r),
    hasAny: (rs) => rs.some((r) => state.roles.includes(r)),
  };
}