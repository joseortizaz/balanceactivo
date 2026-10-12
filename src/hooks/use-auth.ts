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
  /** Tiene verificación en dos pasos activa pero la sesión aún no la completó. */
  mfaPending: boolean;
}

export function useAuth(): AuthState & { hasRole: (r: AppRole) => boolean; hasAny: (rs: AppRole[]) => boolean } {
  const [state, setState] = useState<AuthState>({
    loading: true, session: null, user: null, tenantId: null, nombre: null, roles: [], debeCambiarPassword: false, mfaPending: false,
  });

  useEffect(() => {
    let mounted = true;
    const load = async (session: Session | null) => {
      if (!session) {
        if (mounted) setState({ loading: false, session: null, user: null, tenantId: null, nombre: null, roles: [], debeCambiarPassword: false, mfaPending: false });
        return;
      }
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("tenant_id, nombre, debe_cambiar_password").eq("id", session.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", session.user.id),
      ]);
      let mfaPending = false;
      try {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        mfaPending = aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2";
      } catch { /* MFA no disponible: se ignora */ }
      if (!mounted) return;
      setState({
        loading: false,
        session,
        user: session.user,
        tenantId: profile?.tenant_id ?? null,
        nombre: profile?.nombre ?? null,
        roles: (roles ?? []).map((r) => r.role as AppRole),
        debeCambiarPassword: profile?.debe_cambiar_password ?? false,
        mfaPending,
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