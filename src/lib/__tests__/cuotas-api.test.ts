import { describe, expect, it } from "vitest";
import { conCuotas } from "../cuotas-api.server";

describe("conCuotas", () => {
  it("agrega cuotas ordenadas, monto_inicial y saldo", () => {
    const r = conCuotas({
      id: "f1", total: "10000", monto_pagado: "4000",
      factura_cuotas: [
        { id: "c2", numero_cuota: 2, fecha_vencimiento: "2026-10-30", monto: "2000", monto_pagado: "0", estado: "pendiente" },
        { id: "c1", numero_cuota: 1, fecha_vencimiento: "2026-09-30", monto: "2000", monto_pagado: "2000", estado: "pagada" },
        { id: "c3", numero_cuota: 3, fecha_vencimiento: "2026-11-30", monto: "2000", monto_pagado: "0", estado: "pendiente" },
        { id: "c4", numero_cuota: 4, fecha_vencimiento: "2026-12-30", monto: "2000", monto_pagado: "0", estado: "pendiente" },
      ],
    });
    expect(r.monto_inicial).toBe(2000);
    expect(r.saldo).toBe(6000);
    expect(r.cuotas.map((c) => c.numero)).toEqual([1, 2, 3, 4]);
    expect(r.cuotas[0]).toMatchObject({ saldo: 0, estado: "pagada" });
    expect(r.cuotas[1].saldo).toBe(2000);
    expect("factura_cuotas" in r).toBe(false);
  });
  it("sin cuotas devuelve [] e inicial 0", () => {
    const r = conCuotas({ id: "f2", total: 500, monto_pagado: 500, factura_cuotas: [] });
    expect(r.cuotas).toEqual([]);
    expect(r.monto_inicial).toBe(0);
    expect(r.saldo).toBe(0);
  });
});
