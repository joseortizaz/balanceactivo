import jsPDF from "jspdf";

export interface ReciboPdfData {
  companyName: string;
  companyRnc?: string | null;
  companyAddress?: string | null;
  companyPhone?: string | null;
  clientName: string;
  invoiceNcf: string;
  invoiceTotal: string;
  amountPaid: string;
  amountPending: string;
  paymentDate: string;
  paymentMethod: string;
  bankName?: string | null;
  note?: string | null;
  receiptNumber: string;
}

export function generateReciboPdf(d: ReciboPdfData): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const left = 56;
  let y = 60;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(d.companyName, left, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  if (d.companyRnc) { doc.text(`RNC: ${d.companyRnc}`, left, y); y += 12; }
  if (d.companyAddress) { doc.text(d.companyAddress, left, y); y += 12; }
  if (d.companyPhone) { doc.text(`Tel: ${d.companyPhone}`, left, y); y += 12; }

  y += 12;
  doc.setDrawColor(220);
  doc.line(left, y, 555, y);
  y += 24;

  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("RECIBO DE PAGO", left, y);
  doc.setFontSize(12);
  doc.text(`No. ${d.receiptNumber}`, 555, y, { align: "right" });
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Fecha: ${d.paymentDate}`, left, y);
  y += 24;

  const row = (label: string, value: string, bold = false) => {
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(label.toUpperCase(), left, y);
    doc.setTextColor(20);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 13 : 11);
    const lines = doc.splitTextToSize(value || "—", 480);
    doc.text(lines, left, y + 14);
    y += 14 + lines.length * (bold ? 14 : 12) + 8;
  };

  row("Recibido de", d.clientName);
  row("Factura asociada", d.invoiceNcf);
  row("Total de la factura", d.invoiceTotal);
  row("Monto abonado", d.amountPaid, true);
  row("Monto pendiente", d.amountPending);
  row("Vía de recepción", d.paymentMethod + (d.bankName ? ` — ${d.bankName}` : ""));
  if (d.note) row("Nota", d.note);

  y += 24;
  doc.setDrawColor(220);
  doc.line(left, y, 555, y);
  y += 16;
  doc.setTextColor(140);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text("Gracias por su pago. Conserve este recibo como comprobante.", left, y);

  return doc;
}