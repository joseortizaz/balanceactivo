// Utilidades para generar reportes DGII (RD).
// Formato de archivos según especificaciones de la Oficina Virtual DGII.

export type TipoDoc = "rnc_empresa" | "rnc_persona" | "cedula" | null | undefined;

/** DGII: 1=RNC, 2=Cédula, 3=Pasaporte */
export function tipoIdDgii(t: TipoDoc): "1" | "2" | "3" {
  if (t === "cedula") return "2";
  if (t === "rnc_empresa" || t === "rnc_persona") return "1";
  return "3";
}

/** Convierte "YYYY-MM-DD" o Date en "AAAAMMDD" (formato DGII). */
export function fechaDgii(v: string | Date | null | undefined): string {
  if (!v) return "";
  const s = typeof v === "string" ? v : v.toISOString().slice(0, 10);
  return s.replaceAll("-", "").slice(0, 8);
}

/** Formatea número con 2 decimales sin separador de miles (formato DGII). */
export function montoDgii(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "0.00";
  return v.toFixed(2);
}

/** Solo dígitos del documento (RNC/Cédula). */
export function docDgii(v: string | null | undefined): string {
  return (v ?? "").replace(/\D/g, "");
}

/** Rango de fechas del mes AAAA-MM. */
export function rangoMes(mes: string) {
  const y = Number(mes.slice(0, 4));
  const m = Number(mes.slice(5, 7));
  const inicio = `${mes}-01`;
  const fin = new Date(y, m, 0).toISOString().slice(0, 10);
  return { inicio, fin, periodoDgii: `${y}${String(m).padStart(2, "0")}` };
}

/** Descarga un archivo de texto en el navegador. */
export function downloadText(name: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}

/** Nombre estándar: DGII_606_{RNC}_{PERIODO}.txt */
export function nombreArchivo(reporte: "606" | "607" | "608", rnc: string, periodoDgii: string) {
  return `DGII_${reporte}_${docDgii(rnc) || "SIN_RNC"}_${periodoDgii}.txt`;
}

/** Une campos con pipe según formato DGII y termina la línea con CRLF. */
export function linea(...campos: (string | number | null | undefined)[]): string {
  return campos.map((c) => (c === null || c === undefined ? "" : String(c))).join("|");
}

/** Mapa DGII: categoría interna → código Tipo Bien y Servicios Comprados (01-11) para 606. */
export const categoriaA606: Record<string, string> = {
  "01_personal": "01",
  "02_trabajos_suministros": "02",
  "03_arrendamientos": "03",
  "04_activos_fijos": "04",
  "05_operacionales": "05",
  "06_financieros": "06",
  "07_seguros": "07",
  "08_combustibles": "10",
  "09_otros": "09",
};
/** Exporta filas a un archivo Excel (.xlsx) descargable. */
export async function downloadXlsx(
  fileName: string,
  sheetName: string,
  encabezados: string[],
  filas: (string | number)[][],
) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([encabezados, ...filas]);
  ws["!cols"] = encabezados.map((h, i) => ({
    wch: Math.max(h.length + 2, ...filas.map((f) => String(f[i] ?? "").length + 2)),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, fileName);
}

/** Nombre estándar Excel: DGII_606_{RNC}_{PERIODO}.xlsx */
export function nombreArchivoXlsx(reporte: string, rnc: string, periodoDgii: string) {
  return `DGII_${reporte}_${docDgii(rnc) || "SIN_RNC"}_${periodoDgii}.xlsx`;
}
