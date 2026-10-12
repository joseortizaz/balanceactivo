// Vista ilustrativa del panel de IngreSaaS para la landing.
// IMPORTANTE: todos los datos son inventados (empresas, montos y NCF
// enmascarados). No es una captura real: no muestra información de ningún
// cliente ni detalles internos de la aplicación.
import logoIcon from "@/assets/logo-ingresaas-icon.png";

const MESES = ["May", "Jun", "Jul", "Ago", "Sep", "Oct"];
const INGRESOS = [48, 62, 55, 74, 69, 88];
const GASTOS = [30, 36, 34, 41, 39, 47];

const KPIS = [
  { t: "Ingresos del mes", v: "RD$ 1,248,500", d: "+12.4 %", up: true },
  { t: "Gastos del mes", v: "RD$ 612,300", d: "+3.1 %", up: false },
  { t: "ITBIS por pagar", v: "RD$ 98,430", d: "Vence el 20", up: false },
  { t: "Facturas pendientes", v: "14", d: "3 vencen hoy", up: false },
];

const FACTURAS = [
  { c: "Empresa de Ejemplo SRL", n: "B02••••0123", m: "RD$ 59,000", e: "Pagada", ok: true },
  { c: "Comercial Demo, SA", n: "B01••••0124", m: "RD$ 124,500", e: "Pendiente", ok: false },
  { c: "Servicios Modelo EIRL", n: "B02••••0125", m: "RD$ 18,200", e: "Pagada", ok: true },
];

export function DashboardPreview() {
  const max = 100;
  return (
    <div
      className="relative rounded-2xl border border-line bg-white shadow-[0_30px_80px_-30px_rgba(6,50,102,0.35)] overflow-hidden text-left"
      role="img"
      aria-label="Vista ilustrativa del panel de IngreSaaS con ingresos, gastos y facturas de ejemplo"
    >
      {/* Barra de ventana */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-line bg-surface">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <div className="ml-3 hidden sm:block text-xs text-slate-500">Panel · Resumen financiero</div>
      </div>

      <div className="flex">
        {/* Menú lateral */}
        <aside className="hidden md:flex w-48 flex-col gap-1 border-r border-line bg-surface p-4 text-sm">
          <div className="flex items-center gap-2 pb-3">
            <img src={logoIcon} alt="" className="h-6 w-auto" />
            <span className="font-semibold text-brand-navy">IngreSaaS</span>
          </div>
          {["Resumen", "Facturas", "Cobros", "Gastos", "Nómina", "Reportes DGII"].map((m, i) => (
            <div
              key={m}
              className={`rounded-lg px-3 py-2 ${
                i === 0 ? "bg-brand-blue text-white font-medium" : "text-slate-600"
              }`}
            >
              {m}
            </div>
          ))}
        </aside>

        {/* Contenido */}
        <div className="flex-1 p-4 md:p-6 space-y-5 bg-white">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {KPIS.map((k) => (
              <div key={k.t} className="rounded-xl border border-line bg-surface p-3 md:p-4">
                <div className="text-[11px] md:text-xs text-slate-500">{k.t}</div>
                <div className="mt-1 text-base md:text-lg font-semibold text-brand-navy">{k.v}</div>
                <div className={`mt-0.5 text-[11px] ${k.up ? "text-brand-green-deep" : "text-slate-500"}`}>{k.d}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            {/* Gráfico */}
            <div className="lg:col-span-3 rounded-xl border border-line p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-brand-navy">Ingresos vs. gastos</div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-brand-blue" />Ingresos</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-brand-green" />Gastos</span>
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between gap-2 h-36">
                {MESES.map((m, i) => (
                  <div key={m} className="flex-1 flex flex-col items-center gap-1">
                    <div className="flex items-end gap-1 h-28 w-full justify-center">
                      <div className="w-3 md:w-4 rounded-t bg-brand-blue" style={{ height: `${(INGRESOS[i] / max) * 100}%` }} />
                      <div className="w-3 md:w-4 rounded-t bg-brand-green" style={{ height: `${(GASTOS[i] / max) * 100}%` }} />
                    </div>
                    <div className="text-[10px] text-slate-500">{m}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Facturas recientes */}
            <div className="lg:col-span-2 rounded-xl border border-line p-4">
              <div className="text-sm font-medium text-brand-navy">Facturas recientes</div>
              <ul className="mt-3 space-y-3">
                {FACTURAS.map((f) => (
                  <li key={f.n} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-brand-navy">{f.c}</div>
                      <div className="text-[11px] text-slate-500">{f.n}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-brand-navy">{f.m}</div>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] ${
                          f.ok ? "bg-brand-green/15 text-brand-green-deep" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {f.e}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="text-[10px] text-slate-400">Datos ilustrativos de ejemplo.</div>
        </div>
      </div>
    </div>
  );
}
