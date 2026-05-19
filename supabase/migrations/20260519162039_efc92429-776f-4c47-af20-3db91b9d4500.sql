
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_tenant_defaults(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crear_factura(UUID, tipo_ncf, condicion_pago, DATE, NUMERIC, JSONB) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.registrar_cobro(UUID, NUMERIC, TEXT, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_factura(UUID, tipo_ncf, condicion_pago, DATE, NUMERIC, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_cobro(UUID, NUMERIC, TEXT, DATE) TO authenticated;
