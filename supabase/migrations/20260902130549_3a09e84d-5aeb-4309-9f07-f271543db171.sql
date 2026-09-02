ALTER TABLE public.clientes ADD COLUMN telefono_secundario text;

COMMENT ON COLUMN public.clientes.telefono_secundario IS 'Número de contacto secundario (celular) del cliente';