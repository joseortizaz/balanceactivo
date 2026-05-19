-- 1. Agregar valor al enum (no se puede usar en la misma transacción, por eso usamos ::text en las funciones)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 2. Helper: detecta super admin sin referenciar el literal del enum (evita error de "unsafe use of new value")
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = 'super_admin'
  )
$$;

-- 3. Políticas RLS para super admin sobre todas las tablas relevantes

-- TENANTS: ver y actualizar todas
CREATE POLICY "super_admin_select_all_tenants" ON public.tenants
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "super_admin_update_all_tenants" ON public.tenants
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "super_admin_insert_tenants" ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

-- PROFILES: ver todos
CREATE POLICY "super_admin_select_all_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- USER_ROLES: ver y administrar todos
CREATE POLICY "super_admin_select_all_roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "super_admin_manage_all_roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- FACTURAS: ver todas (métricas globales)
CREATE POLICY "super_admin_select_all_facturas" ON public.facturas
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- LOGS_AUDITORIA: ver todos
CREATE POLICY "super_admin_select_all_logs" ON public.logs_auditoria
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- CLIENTES, COBROS, ASIENTOS (lectura global para métricas)
CREATE POLICY "super_admin_select_all_clientes" ON public.clientes
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "super_admin_select_all_cobros" ON public.cobros
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "super_admin_select_all_asientos" ON public.asientos_contables
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));