// Enriquece facturas de la API pública con cuotas, monto_inicial y saldo.
// Solo agrega campos; no altera los que la API ya devolvía.

export const FACTURA_CUOTAS_SELECT =
  "factura_cuotas(id, numero_cuota, fecha_vencimiento, monto, monto_pagado, estado)";

type CuotaRow = {
  id: string;
  numero_cuota: number;
  fecha_vencimiento: string;
  monto: number | string;
  monto_pagado: number | string;
  estado: string;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function conCuotas(f: any) {
  const { factura_cuotas, ...resto } = f;
  const filas = ((factura_cuotas ?? []) as CuotaRow[])
    .slice()
    .sort((a, b) => a.numero_cuota - b.numero_cuota);
  const total = Number(resto.total ?? 0);
  const pagado = Number(resto.monto_pagado ?? 0);
  const sumaCuotas = filas.reduce((s, c) => s + Number(c.monto), 0);
  return {
    ...resto,
    monto_inicial: filas.length ? r2(Math.max(total - sumaCuotas, 0)) : 0,
    saldo: r2(Math.max(total - pagado, 0)),
    cuotas: filas.map((c) => ({
      id: c.id,
      numero: c.numero_cuota,
      fecha_vencimiento: c.fecha_vencimiento,
      monto: Number(c.monto),
      monto_pagado: Number(c.monto_pagado),
      saldo: r2(Math.max(Number(c.monto) - Number(c.monto_pagado), 0)),
      estado: c.estado,
    })),
  };
}
