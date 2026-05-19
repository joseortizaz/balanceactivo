
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS firma_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-assets', 'tenant-assets', false)
ON CONFLICT (id) DO NOTHING;

-- Lectura: cualquier miembro del tenant ve sus archivos
CREATE POLICY "tenant_assets_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'tenant-assets'
  AND (storage.foldername(name))[1] = public.current_tenant_id()::text
);

-- Insert/Update/Delete: solo administradores del tenant
CREATE POLICY "tenant_assets_insert_admin" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'tenant-assets'
  AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  AND public.has_role(auth.uid(), 'administrador'::app_role)
);

CREATE POLICY "tenant_assets_update_admin" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'tenant-assets'
  AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  AND public.has_role(auth.uid(), 'administrador'::app_role)
);

CREATE POLICY "tenant_assets_delete_admin" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'tenant-assets'
  AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  AND public.has_role(auth.uid(), 'administrador'::app_role)
);
