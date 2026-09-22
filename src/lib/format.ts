export const fmtMoney = (n: number | string | null | undefined) => {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 }).format(v);
};

// Zona horaria de República Dominicana (no observa horario de verano, UTC-4
// todo el año). Se fija explícitamente en vez de confiar en la del
// navegador/servidor, para que "hoy" y las fechas mostradas sean siempre
// las correctas para RD sin importar dónde corra el código (el Worker de
// Cloudflare corre en UTC; el navegador del usuario podría estar en
// cualquier zona horaria si viaja, etc.)
export const RD_TIMEZONE = "America/Santo_Domingo";

export const fmtDate = (s: string | Date | null | undefined) => {
  if (!s) return "";
  let d: Date;
  if (typeof s === "string") {
    // Las columnas de fecha (tipo DATE en Postgres: facturas.fecha,
    // cobros.fecha, cotizaciones.fecha, fecha_vencimiento, etc.) llegan como
    // "YYYY-MM-DD", sin hora ni zona horaria -- son una fecha de calendario
    // pura, no un instante en el tiempo. `new Date("YYYY-MM-DD")` las
    // interpreta como medianoche UTC, y si luego se formatean con
    // Intl.DateTimeFormat (que usa la zona horaria local del navegador) el
    // día se corre hacia atrás en cualquier zona detrás de UTC -- exactamente
    // el caso de República Dominicana (UTC-4). Ejemplo real: una factura con
    // fecha "2026-09-20" se mostraba como "19 sept 2026" en un navegador
    // configurado en horario de RD.
    //
    // Se parsean los componentes a mano y se arma la fecha como fecha LOCAL
    // (sin anclarla a UTC), para que el día mostrado sea siempre el que se
    // guardó, sin importar la zona horaria del navegador.
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(s);
  } else {
    d = s;
  }
  return new Intl.DateTimeFormat("es-DO", { year: "numeric", month: "short", day: "2-digit" }).format(d);
};

// "Hoy" en la fecha de calendario de República Dominicana, como
// "YYYY-MM-DD". No usa new Date().toISOString() porque eso da la fecha en
// UTC: en horario nocturno en RD (después de las 8pm, UTC ya es el día
// siguiente) eso adelantaría por error la fecha de una factura/cotización
// nueva. Se ancla explícitamente a la zona horaria de RD con Intl, así que
// da el mismo resultado corra donde corra (navegador del usuario o el
// Worker de Cloudflare, que corre en UTC).
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: RD_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

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
