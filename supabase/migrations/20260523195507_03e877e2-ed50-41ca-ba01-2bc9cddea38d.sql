
-- Tabla bancos por tenant
CREATE TABLE public.bancos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bancos_tenant ON public.bancos(tenant_id);

ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;

CREATE POLICY bancos_select ON public.bancos
  FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id());

CREATE POLICY bancos_manage ON public.bancos
  FOR ALL TO authenticated
  USING ((tenant_id = current_tenant_id()) AND (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'contador'::app_role)))
  WITH CHECK ((tenant_id = current_tenant_id()) AND (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'contador'::app_role)));

-- Agregar columna banco_id a cobros
ALTER TABLE public.cobros ADD COLUMN banco_id UUID REFERENCES public.bancos(id);

-- Reemplazar la función registrar_cobro para aceptar banco
CREATE OR REPLACE FUNCTION public.registrar_cobro(_factura_id UUID, _monto NUMERIC, _metodo TEXT, _fecha DATE, _banco_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tenant UUID; _user UUID; _cobro_id UUID; _asiento_id UUID;
  _cuenta_caja UUID; _cuenta_cxc UUID;
  _fact RECORD;
BEGIN
  _user := auth.uid();
  SELECT tenant_id INTO _tenant FROM public.profiles WHERE id = _user;
  SELECT * INTO _fact FROM public.facturas WHERE id = _factura_id AND tenant_id = _tenant;
  IF _fact IS NULL THEN RAISE EXCEPTION 'Factura no encontrada'; END IF;

  IF _banco_id IS NOT NULL THEN
    PERFORM 1 FROM public.bancos WHERE id = _banco_id AND tenant_id = _tenant;
    IF NOT FOUND THEN RAISE EXCEPTION 'Banco no válido'; END IF;
  END IF;

  SELECT id INTO _cuenta_caja FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='1.1.01.01';
  SELECT id INTO _cuenta_cxc FROM public.cuentas_contables WHERE tenant_id=_tenant AND codigo='1.1.02.01';

  INSERT INTO public.asientos_contables (tenant_id, fecha, concepto, origen, origen_id, total_debito, total_credito)
  VALUES (_tenant, _fecha, 'Cobro Factura ' || _fact.ncf, 'cobro', _factura_id, _monto, _monto)
  RETURNING id INTO _asiento_id;

  INSERT INTO public.asiento_lineas (tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
  VALUES (_tenant, _asiento_id, _cuenta_caja, _monto, 0, 'Cobro ' || _fact.ncf);
  INSERT INTO public.asiento_lineas (tenant_id, asiento_id, cuenta_id, debito, credito, descripcion)
  VALUES (_tenant, _asiento_id, _cuenta_cxc, 0, _monto, 'Cancelacion CxC ' || _fact.ncf);

  INSERT INTO public.cobros (tenant_id, factura_id, fecha, monto, metodo, banco_id, asiento_id, created_by)
  VALUES (_tenant, _factura_id, _fecha, _monto, _metodo, _banco_id, _asiento_id, _user)
  RETURNING id INTO _cobro_id;

  UPDATE public.facturas
    SET monto_pagado = monto_pagado + _monto,
        estado = CASE WHEN monto_pagado + _monto >= total THEN 'pagada'::estado_factura ELSE estado END
    WHERE id = _factura_id;

  INSERT INTO public.logs_auditoria (tenant_id, user_id, accion, tabla_afectada, registro_id, detalles)
  VALUES (_tenant, _user, 'Registro de Cobro', 'cobros', _cobro_id, jsonb_build_object('factura', _fact.ncf, 'monto', _monto, 'metodo', _metodo, 'banco_id', _banco_id));

  RETURN _cobro_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_cobro(UUID, NUMERIC, TEXT, DATE, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_cobro(UUID, NUMERIC, TEXT, DATE, UUID) TO authenticated;
