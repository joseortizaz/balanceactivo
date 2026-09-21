export const fmtMoney = (n: number | string | null | undefined) => {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 }).format(v);
};

export const fmtDate = (s: string | Date | null | undefined) => {
  if (!s) return "";
  const d = typeof s === "string" ? new Date(s) : s;
  return new Intl.DateTimeFormat("es-DO", { year: "numeric", month: "short", day: "2-digit" }).format(d);
};

export const today = () => new Date().toISOString().slice(0, 10);

export const validarRNC = (rnc: string) => /^\d{9}$|^\d{11}$/.test(rnc.replace(/\s|-/g, ""));
export const validarCedula = (c: string) => /^\d{11}$/.test(c.replace(/\s|-/g, ""));

export const diasEntreFechas = (desde: string, hasta: string): number => {
  const d1 = new Date(desde + "T00:00:00Z");
  const d2 = new Date(hasta + "T00:00:00Z");
  return Math.round((d2.getTime() - d1.getTime()) / 86400000);
};

// Texto legible sobre la condición de pago de una factura, para mostrar en
// PDF/preview/email. Si hay fecha de vencimiento, incluye los días de
// crédito otorgados y la fecha en que vence.
export const condicionFacturaTexto = (
  condicion: string | null | undefined,
  fecha: string | null | undefined,
  fechaVencimiento: string | null | undefined,
): string | null => {
  if (condicion === "contado") return "Condición: Contado";
  if (condicion === "credito") {
    if (fechaVencimiento && fecha) {
      const dias = diasEntreFechas(fecha, fechaVencimiento);
      return dias > 0
        ? `Condición: Crédito — ${dias} días (vence ${fmtDate(fechaVencimiento)})`
        : `Condición: Crédito — vence ${fmtDate(fechaVencimiento)}`;
    }
    return "Condición: Crédito";
  }
  return null;
};
