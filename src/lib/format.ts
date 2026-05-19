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