import jsPDF from "jspdf";

export interface ReciboPdfData {
  companyName: string;
  companyRnc?: string | null;
  companyAddress?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyLogoUrl?: string | null;

  receiptNumber: string;
  paymentDate: string;
  estado?: string;

  clientName: string;
  clientDocumento?: string | null;
  clientEmail?: string | null;
  clientTelefono?: string | null;
  clientDireccion?: string | null;

  invoiceNcf: string;
  invoiceTotal: string;
  amountPaid: string;
  amountPending: string;
  paymentMethod: string;
  bankName?: string | null;
  note?: string | null;
}

async function loadImageAsDataUrl(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = dataUrl;
    });
    return { data: dataUrl, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

export async function generateReciboPdf(d: ReciboPdfData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const left = 48;
  const right = pageW - 48;

  // Header: logo left, RECIBO right
  let yLogoBottom = 60;
  if (d.companyLogoUrl) {
    const img = await loadImageAsDataUrl(d.companyLogoUrl);
    if (img) {
      const maxW = 150, maxH = 90;
      const ratio = Math.min(maxW / img.w, maxH / img.h);
      const w = img.w * ratio, h = img.h * ratio;
      try { doc.addImage(img.data, "PNG", left, 48, w, h); }
      catch { try { doc.addImage(img.data, "JPEG", left, 48, w, h); } catch { /* skip */ } }
      yLogoBottom = 48 + h;
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(20, 28, 56);
  doc.text("RECIBO", right, 70, { align: "right" });

  doc.setFontSize(11);
  doc.text(`N°: ${d.receiptNumber}`, right, 90, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`Fecha Emisión: ${d.paymentDate}`, right, 106, { align: "right" });

  // Empresa emisora
  let y = Math.max(yLogoBottom + 20, 160);
  if (d.companyRnc) { doc.text(`RNC: ${d.companyRnc}`, left, y); y += 14; }
  if (d.companyAddress) {
    const lines = doc.splitTextToSize(d.companyAddress, pageW - 96);
    doc.text(lines, left, y); y += 14 * lines.length;
  }
  if (d.companyPhone) { doc.text(d.companyPhone, left, y); y += 14; }
  if (d.companyEmail) { doc.text(d.companyEmail, left, y); y += 14; }

  y += 8;
  doc.setDrawColor(220);
  doc.line(left, y, right, y);
  y += 24;

  // RECIBIDO DE + ESTADO
  const midX = left + (right - left) / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 28, 56);
  doc.text("RECIBIDO DE", left, y);
  doc.text("ESTADO", midX + 20, y);

  doc.setDrawColor(220);
  doc.line(left, y + 6, midX - 10, y + 6);
  doc.line(midX + 20, y + 6, right, y + 6);

  y += 22;
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text(d.clientName, left, y);
  doc.text((d.estado ?? "PAGADO").toUpperCase(), midX + 20, y);

  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`RNC/Cédula: ${d.clientDocumento || "N/A"}`, left, y); y += 14;
  if (d.clientEmail) { doc.text(`Email: ${d.clientEmail}`, left, y); y += 14; }
  if (d.clientTelefono) { doc.text(`Tel: ${d.clientTelefono}`, left, y); y += 14; }
  if (d.clientDireccion) {
    const lines = doc.splitTextToSize(`Dirección: ${d.clientDireccion}`, midX - 10 - left);
    doc.text(lines, left, y); y += 14 * lines.length;
  }

  y += 20;

  // Tabla detalle del pago
  const colDesc = left + 12;
  const colFact = left + 230;
  const colVia = left + 340;
  const colMonto = right - 12;

  doc.setFillColor(241, 245, 249);
  doc.rect(left, y, right - left, 28, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 28, 56);
  doc.text("Concepto", colDesc, y + 18);
  doc.text("Factura", colFact, y + 18);
  doc.text("Vía de pago", colVia, y + 18);
  doc.text("Monto", colMonto, y + 18, { align: "right" });
  y += 36;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(20);
  doc.text("Abono a factura", colDesc, y);
  doc.text(d.invoiceNcf, colFact, y);
  doc.text(d.paymentMethod + (d.bankName ? ` — ${d.bankName}` : ""), colVia, y);
  doc.text(d.amountPaid, colMonto, y, { align: "right" });
  y += 12;
  doc.setDrawColor(235);
  doc.line(left, y, right, y);
  y += 24;

  // Totales
  const totLabelX = left + 320;
  const totValX = right;

  const row = (label: string, value: string, opts?: { bold?: boolean; color?: [number, number, number]; size?: number }) => {
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(opts?.size ?? 10);
    doc.setTextColor(90);
    doc.text(label, totLabelX, y);
    if (opts?.color) doc.setTextColor(...opts.color); else doc.setTextColor(20);
    doc.text(value, totValX, y, { align: "right" });
    y += (opts?.size ?? 10) + 8;
  };

  row("Total factura:", d.invoiceTotal, { bold: true });
  doc.setDrawColor(220);
  doc.line(totLabelX, y - 4, right, y - 4);
  y += 6;
  row("MONTO PAGADO:", d.amountPaid, { bold: true, size: 14, color: [37, 99, 235] });
  row("Saldo Pendiente:", d.amountPending, { bold: true });

  if (d.note) {
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text("NOTA", left, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(20);
    const lines = doc.splitTextToSize(d.note, right - left);
    doc.text(lines, left, y);
  }

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(230);
  doc.line(left, pageH - 70, right, pageH - 70);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(140);
  doc.text("Gracias por su preferencia.", pageW / 2, pageH - 50, { align: "center" });
  doc.setFontSize(9);
  doc.text("Generado por Balance Activo - Software de Contabilidad", pageW / 2, pageH - 34, { align: "center" });

  return doc;
}