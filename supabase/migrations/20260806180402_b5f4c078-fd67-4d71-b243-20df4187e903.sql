
UPDATE public.ncf_secuencias s
SET secuencia_actual = COALESCE(
  (SELECT MAX(right(f.ncf, 8)::bigint) FROM public.facturas f
    WHERE f.tenant_id = s.tenant_id AND f.tipo_ncf = s.tipo),
  CASE WHEN s.secuencia_actual > 99999999 THEN 0 ELSE s.secuencia_actual END
);
