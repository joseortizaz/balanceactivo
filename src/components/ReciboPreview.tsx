import { fmtMoney } from "@/lib/format";

export interface ReciboPreviewData {
  companyName: string;
  companyRnc?: string | null;
  companyAddress?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyLogoUrl?: string | null;

  receiptNumber: string;
  fechaEmision: string;
  estado: string;

  clienteNombre: string;
  clienteDocumento?: string | null;
  clienteEmail?: string | null;
  clienteTelefono?: string | null;
  clienteDireccion?: string | null;

  invoiceNcf: string;
  invoiceTotal: number;
  montoPagado: number;
  saldoPendiente: number;
  metodoPago: string;
  bancoNombre?: string | null;
  nota?: string | null;
}

/** On-screen receipt preview that mirrors the printable PDF layout. */
export function ReciboPreview({ d }: { d: ReciboPreviewData }) {
  return (
    <div className="mx-auto max-w-4xl bg-white text-neutral-900 shadow-sm border border-neutral-200 rounded-md print:shadow-none print:border-0">
      <div className="p-6 sm:p-10 font-sans">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-6">
          <div className="flex-1 min-w-0">
            {d.companyLogoUrl ? (
              <img src={d.companyLogoUrl} alt={d.companyName} className="max-h-24 max-w-[180px] object-contain" />
            ) : (
              <div className="text-xl font-semibold text-neutral-800">{d.companyName}</div>
            )}
          </div>
          <div className="text-left sm:text-right">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900">RECIBO</h1>
            <div className="mt-2 text-sm font-semibold text-neutral-800">N°: {d.receiptNumber}</div>
            <div className="mt-1 text-sm text-neutral-500">Fecha Emisión: {d.fechaEmision}</div>
          </div>
        </div>

        {/* Empresa */}
        <div className="mt-6 text-sm text-neutral-600 space-y-0.5">
          {d.companyRnc && <div>RNC: {d.companyRnc}</div>}
          {d.companyAddress && <div>{d.companyAddress}</div>}
          {d.companyPhone && <div>{d.companyPhone}</div>}
          {d.companyEmail && <div className="break-all">{d.companyEmail}</div>}
        </div>

        <div className="my-6 border-t border-neutral-200" />

        {/* Recibido de + Estado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-semibold tracking-widest text-neutral-500 pb-2 border-b border-neutral-200">
              RECIBIDO DE
            </div>
            <div className="mt-3 font-semibold text-neutral-900">{d.clienteNombre}</div>
            <div className="mt-1 text-sm text-neutral-600 space-y-0.5">
              <div>RNC/Cédula: {d.clienteDocumento || "N/A"}</div>
              {d.clienteEmail && <div className="break-all">Email: {d.clienteEmail}</div>}
              {d.clienteTelefono && <div>Tel: {d.clienteTelefono}</div>}
              {d.clienteDireccion && <div>Dirección: {d.clienteDireccion}</div>}
            </div>
          </div>
          <div className="sm:text-right">
            <div className="text-xs font-semibold tracking-widest text-neutral-500 pb-2 border-b border-neutral-200">
              ESTADO
            </div>
            <div className="mt-3 text-lg font-bold uppercase tracking-wide text-neutral-900">{d.estado}</div>
          </div>
        </div>

        {/* Detalle del pago */}
        <div className="mt-10 border-t border-b border-neutral-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-neutral-700">
                <th className="text-left font-semibold py-3 pr-2">Concepto</th>
                <th className="text-left font-semibold py-3 px-2">Factura</th>
                <th className="text-left font-semibold py-3 px-2">Vía de pago</th>
                <th className="text-right font-semibold py-3 pl-2 w-32">Monto</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-neutral-100">
                <td className="py-3 pr-2 text-neutral-800">Abono a factura</td>
                <td className="py-3 px-2 text-neutral-800 font-mono">{d.invoiceNcf}</td>
                <td className="py-3 px-2 text-neutral-800">
                  {d.metodoPago}{d.bancoNombre ? ` — ${d.bancoNombre}` : ""}
                </td>
                <td className="py-3 pl-2 text-right text-neutral-800 whitespace-nowrap">
                  {fmtMoney(d.montoPagado)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="mt-6 flex justify-end">
          <div className="w-full sm:w-80 space-y-2 text-sm">
            <div className="flex justify-between text-neutral-700">
              <span>Total factura:</span>
              <span className="font-semibold text-neutral-900">{fmtMoney(d.invoiceTotal)}</span>
            </div>
            <div className="border-t border-neutral-200 pt-3 flex justify-between items-baseline">
              <span className="text-lg font-bold text-neutral-900">MONTO PAGADO:</span>
              <span className="text-lg font-bold text-[#1e3a8a]">{fmtMoney(d.montoPagado)}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-neutral-700">Saldo Pendiente:</span>
              <span className="font-bold text-neutral-900">{fmtMoney(d.saldoPendiente)}</span>
            </div>
          </div>
        </div>

        {d.nota && (
          <div className="mt-6 text-sm">
            <div className="text-xs font-semibold tracking-widest text-neutral-500">NOTA</div>
            <div className="mt-1 text-neutral-700">{d.nota}</div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-neutral-200 text-center text-xs text-neutral-400 space-y-1">
          <div>Gracias por su preferencia.</div>
          <div>Generado por Balance Activo - Software de Contabilidad</div>
        </div>
      </div>
    </div>
  );
}