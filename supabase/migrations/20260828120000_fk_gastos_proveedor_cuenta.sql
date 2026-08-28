-- Corrige "Gastos" en $0.00 en Reportes de ingresos y gastos (y en el 606 de DGII).
--
-- Causa raíz: gastos.proveedor_id y gastos.cuenta_gasto_id nunca tuvieron una
-- foreign key real (solo NOT NULL). El frontend consulta con embeds de
-- PostgREST que dependen de esa FK para resolver la relación, p. ej.:
--   .select("..., proveedores(razon_social), cuentas_contables!gastos_cuenta_gasto_id_fkey(codigo, nombre)")
-- Sin la FK, PostgREST responde "Could not find a relationship" y el
-- frontend, al hacer `.data ?? []`, convierte ese error silenciosamente en
-- una lista vacía -> Gastos siempre en RD$0.00, "Sin datos en el período".
-- Mismo patrón afecta a src/routes/_authenticated/reportes.tsx (Reporte 606).
--
-- Se agregan las FK como NOT VALID: esto es suficiente para que PostgREST
-- reconozca la relación en su introspección del catálogo (que es lo único
-- que necesita el embed) sin fallar si ya existen filas con
-- proveedor_id/cuenta_gasto_id huérfano por datos legados. Para forzar
-- integridad real más adelante, correr por separado (falla si hay huérfanos,
-- hay que limpiarlos primero):
--   ALTER TABLE public.gastos VALIDATE CONSTRAINT gastos_proveedor_id_fkey;
--   ALTER TABLE public.gastos VALIDATE CONSTRAINT gastos_cuenta_gasto_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gastos_proveedor_id_fkey'
  ) THEN
    ALTER TABLE public.gastos
      ADD CONSTRAINT gastos_proveedor_id_fkey
      FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gastos_cuenta_gasto_id_fkey'
  ) THEN
    ALTER TABLE public.gastos
      ADD CONSTRAINT gastos_cuenta_gasto_id_fkey
      FOREIGN KEY (cuenta_gasto_id) REFERENCES public.cuentas_contables(id) NOT VALID;
  END IF;
END $$;
