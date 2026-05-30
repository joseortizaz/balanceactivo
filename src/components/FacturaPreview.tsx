import { fmtMoney } from "@/lib/format";

export interface FacturaPreviewLinea {
  descripcion: string;
  cantidad: number;
  precio: number;
  subtotal: number;
}

export interface FacturaPreviewData {
  companyName: string;
  companyRnc?: string | null;
  companyAddress?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyLogoUrl?: string | null;

  ncf: string;
  fechaEmision: string;
  fechaVencimiento?: string | null;
  estado: string;

  clienteNombre: string;
  clienteDocumento?: string | null;
  clienteEmail?: string | null;
  clienteTelefono?: string | null;
  clienteDireccion?: string | null;

  lineas: FacturaPreviewLinea[];
  subtotal: number;
  descuento?: number;
  itbis?: number;
  total: number;
  montoPagado?: number;
  saldoPendiente?: number;
}

/**
 * On-screen invoice preview that mirrors the printable PDF layout.
 * Pure presentation — no business logic.
 */
export function FacturaPreview({ d }: { d: FacturaPreviewData }) {
  return (
    <div className="mx-auto max-w-4xl bg-white text-neutral-900 shadow-sm border border-neutral-200 rounded-md print:shadow-none print:border-0">
      <div className="p-6 sm:p-10 font-sans">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-6">
          <div className="flex-1 min-w-0">
            {d.companyLogoUrl ? (
              <img
                src={d.companyLogoUrl}
                alt={d.companyName}
                className="max-h-24 max-w-[180px] object-contain"
              />
            ) : (
              <div className="text-xl font-semibold text-neutral-800">{d.companyName}</div>
            )}
          </div>
          <div className="text-left sm:text-right">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900">
              FACTURA
            </h1>
            <div className="mt-2 text-sm font-semibold text-neutral-800">N°: {d.ncf}</div>
            <div className="mt-1 text-sm text-neutral-500">Fecha Emisión: {d.fechaEmision}</div>
            {d.fechaVencimiento && (
              <div className="text-sm text-neutral-500">Vencimiento: {d.fechaVencimiento}</div>
            )}
          </div>
        </div>

        {/* Empresa emisora */}
        <div className="mt-6 text-sm text-neutral-600 space-y-0.5">
          {d.companyRnc && <div>RNC: {d.companyRnc}</div>}
          {d.companyAddress && <div>{d.companyAddress}</div>}
          {d.companyPhone && <div>{d.companyPhone}</div>}
          {d.companyEmail && <div className="break-all">{d.companyEmail}</div>}
        </div>

        <div className="my-6 border-t border-neutral-200" />

        {/* Facturar a + Estado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-semibold tracking-widest text-neutral-500 pb-2 border-b border-neutral-200">
              FACTURAR A
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
            <div className="mt-3 text-lg font-bold uppercase tracking-wide text-neutral-900">
              {d.estado}
            </div>
          </div>
        </div>

        {/* Tabla de conceptos */}
        <div className="mt-10 border-t border-b border-neutral-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-neutral-700">
                <th className="text-left font-semibold py-3 pr-2">Descripción</th>
                <th className="text-center font-semibold py-3 px-2 w-20">Cantidad</th>
                <th className="text-right font-semibold py-3 px-2 w-32">Precio Unit.</th>
                <th className="text-right font-semibold py-3 pl-2 w-32">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {d.lineas.map((l, i) => (
                <tr key={i} className="border-t border-neutral-100">
                  <td className="py-3 pr-2 text-neutral-800">{l.descripcion}</td>
                  <td className="py-3 px-2 text-center text-neutral-800">{l.cantidad}</td>
                  <td className="py-3 px-2 text-right text-neutral-800 whitespace-nowrap">
                    {fmtMoney(l.precio)}
                  </td>
                  <td className="py-3 pl-2 text-right text-neutral-800 whitespace-nowrap">
                    {fmtMoney(l.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="mt-6 flex justify-end">
          <div className="w-full sm:w-80 space-y-2 text-sm">
            <div className="flex justify-between text-neutral-700">
              <span>Subtotal:</span>
              <span className="font-semibold text-neutral-900">{fmtMoney(d.subtotal)}</span>
            </div>
            {d.descuento && d.descuento > 0 ? (
              <div className="flex justify-between text-neutral-700">
                <span>Descuento:</span>
                <span>− {fmtMoney(d.descuento)}</span>
              </div>
            ) : null}
            {d.itbis && d.itbis > 0 ? (
              <div className="flex justify-between text-neutral-700">
                <span>ITBIS:</span>
                <span>{fmtMoney(d.itbis)}</span>
              </div>
            ) : null}
            <div className="border-t border-neutral-200 pt-3 flex justify-between items-baseline">
              <span className="text-lg font-bold text-neutral-900">TOTAL:</span>
              <span className="text-lg font-bold text-[#1e3a8a]">{fmtMoney(d.total)}</span>
            </div>
            {d.montoPagado && d.montoPagado > 0 ? (
              <div className="flex justify-between pt-2">
                <span className="text-neutral-700">Monto Pagado:</span>
                <span className="font-semibold text-emerald-600">{fmtMoney(d.montoPagado)}</span>
              </div>
            ) : null}
            {typeof d.saldoPendiente === "number" && (
              <div className="flex justify-between">
                <span className="text-neutral-700">Saldo Pendiente:</span>
                <span className="font-bold text-neutral-900">{fmtMoney(d.saldoPendiente)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-neutral-200 text-center text-xs text-neutral-400 space-y-1">
          <div>Gracias por su preferencia.</div>
          <div>Generado por Balance Activo - Software de Contabilidad</div>
        </div>
      </div>
    </div>
  );
}