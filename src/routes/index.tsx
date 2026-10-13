import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  FileText,
  Shield,
  BarChart3,
  Zap,
  Receipt,
  Sparkles,
  ArrowRight,
  Check,
  Star,
} from "lucide-react";
import logo from "@/assets/logo-ingresaas-horizontal.png";
import logoLight from "@/assets/logo-ingresaas-horizontal-light.png";
import { DashboardPreview } from "@/components/DashboardPreview";
import { PLANES } from "@/lib/planes";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "IngreSaaS — Contabilidad y facturación premium para RD" },
      {
        name: "description",
        content:
          "Plataforma fintech para emitir facturas con NCF, calcular ITBIS y generar reportes 606/607 automáticos. Diseñada para PYMEs y contadores en República Dominicana.",
      },
      { property: "og:title", content: "IngreSaaS — Contabilidad y facturación premium para RD" },
      {
        property: "og:description",
        content:
          "Plataforma fintech para emitir facturas con NCF, calcular ITBIS y generar reportes 606/607 automáticos.",
      },
      { property: "og:url", content: "https://ingresaas.net/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://ingresaas.net/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "IngreSaaS",
          url: "https://ingresaas.net",
          logo: "https://ingresaas.net/favicon.ico",
          email: "info@balanceactivo.net",
          areaServed: "DO",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "IngreSaaS",
          applicationCategory: "AccountingApplication",
          operatingSystem: "Web",
          url: "https://ingresaas.net",
          description:
            "Plataforma fintech de contabilidad y facturación con NCF, ITBIS, nómina y reportes 606/607 para República Dominicana.",
          offers: PLANES.map((p) => ({
            "@type": "Offer",
            name: p.nombre,
            price: p.precio,
            priceCurrency: "DOP",
            category: "subscription",
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "IngreSaaS",
          url: "https://ingresaas.net",
        }),
      },
    ],
  }),
});

const FEATURES = [
  { icon: Zap, t: "Automatización total", d: "Asientos contables, ITBIS y retenciones se generan al emitir cada factura." },
  { icon: BarChart3, t: "Reportes en tiempo real", d: "Estados financieros y reportes 606/607 listos para la DGII en un clic." },
  { icon: Shield, t: "Seguridad bancaria", d: "Aislamiento por empresa con RLS estricto y auditoría completa de operaciones." },
  { icon: FileText, t: "NCF inteligentes", d: "B01, B02, B04, B14 y B15 con numeración secuencial bloqueada por la DGII." },
  { icon: Receipt, t: "Gastos y nómina", d: "Registra gastos con retenciones, calcula nómina con TSS, ISR y regalía pascual." },
  { icon: Sparkles, t: "Multi-empresa", d: "Administra varias razones sociales desde una sola cuenta con roles definidos." },
];

function Index() {
  return (
    <div className="min-h-screen bg-surface text-brand-navy antialiased overflow-x-hidden">
      {/* Fondo suave con los colores de la marca */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full bg-brand-blue opacity-[0.08] blur-[140px]" />
        <div className="absolute top-1/3 -right-32 h-[480px] w-[480px] rounded-full bg-brand-green opacity-[0.12] blur-[140px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/90 border-b border-line shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="IngreSaaS" className="h-9 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <a href="#features" className="hover:text-brand-navy transition">Producto</a>
            <a href="#pricing" className="hover:text-brand-navy transition">Precios</a>
            <a href="#cta" className="hover:text-brand-navy transition">Empresa</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden sm:inline-flex h-10 items-center px-4 text-sm text-brand-blue hover:text-brand-navy transition"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/signup"
              className="inline-flex h-10 items-center gap-1 px-4 rounded-full text-sm font-medium bg-brand-blue text-white hover:bg-brand-navy transition"
            >
              Crear empresa <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero: texto a la izquierda (35 %) y monitor con el panel a la derecha (65 %) */}
      <main>
      <section className="relative">
        <div className="max-w-7xl mx-auto px-6 pt-14 pb-20 md:pt-20 md:pb-28 grid gap-12 lg:gap-10 lg:grid-cols-[35fr_65fr] items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-line bg-white text-xs text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-green shadow-[0_0_8px_2px_rgba(2,190,150,0.45)]" />
              Cumplimiento DGII · Norma 06-2018
            </div>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-4xl xl:text-5xl font-semibold tracking-tight leading-[1.08] text-brand-navy">
              La contabilidad de tu empresa,{" "}
              <span className="bg-gradient-to-r from-brand-blue to-brand-green bg-clip-text text-transparent">
                automatizada y en tiempo real
              </span>
            </h1>
            <p className="mt-6 text-base md:text-lg lg:text-base xl:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Emite facturas con NCF, calcula ITBIS y nómina, y prepara tus reportes 606/607 desde una plataforma fintech diseñada para República Dominicana.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3 justify-center lg:justify-start">
              <Link
                to="/signup"
                className="inline-flex h-12 items-center justify-center gap-2 px-7 rounded-full text-sm font-medium bg-gradient-to-r from-brand-blue to-brand-navy text-white shadow-[0_10px_40px_-10px_rgba(2,74,142,0.6)] hover:shadow-[0_10px_50px_-10px_rgba(2,74,142,0.8)] transition"
              >
                Empezar prueba gratuita <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 items-center justify-center px-7 rounded-full text-sm font-medium border border-brand-blue text-brand-blue bg-white hover:bg-surface-alt transition"
              >
                Ver características
              </a>
            </div>
          </div>

          {/* Monitor de PC con el panel (datos ilustrativos) */}
          <div className="relative">
            <div className="absolute inset-x-6 -inset-y-6 bg-gradient-to-r from-brand-blue/15 via-brand-green/15 to-brand-blue/10 blur-3xl rounded-[40px]" />
            <div className="relative mx-auto w-full">
              <div className="rounded-[18px] bg-brand-navy p-2.5 md:p-3 shadow-[0_30px_80px_-30px_rgba(6,50,102,0.55)]">
                <div className="rounded-lg overflow-hidden bg-white">
                  <DashboardPreview monitor />
                </div>
              </div>
              {/* Pie y base del monitor */}
              <div
                className="mx-auto h-5 md:h-7 w-20 md:w-28 bg-gradient-to-b from-slate-300 to-slate-200"
                style={{ clipPath: "polygon(16% 0, 84% 0, 100% 100%, 0 100%)" }}
              />
              <div className="mx-auto h-2 w-40 md:w-60 rounded-full bg-slate-300" />
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-line bg-white">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { k: "100%", v: "Cumple DGII" },
            { k: "0 min", v: "Generar asientos" },
            { k: "606/607", v: "Reportes en 1 clic" },
            { k: "24/7", v: "Soporte local" },
          ].map((s) => (
            <div key={s.v}>
              <div className="text-2xl md:text-3xl font-semibold bg-gradient-to-r from-brand-blue to-brand-green bg-clip-text text-transparent">
                {s.k}
              </div>
              <div className="text-xs md:text-sm text-slate-600 mt-1">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-widest text-brand-green-deep font-medium">Características</div>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight text-brand-navy">
            Todo lo que tu contador necesita,<br className="hidden md:block" />
            <span className="text-slate-500">sin hojas de cálculo.</span>
          </h2>
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.t}
              className="group relative rounded-2xl border border-line bg-white p-6 shadow-sm hover:shadow-md hover:border-brand-blue/30 transition"
            >
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-brand-blue to-brand-green flex items-center justify-center shadow-[0_8px_24px_-8px_rgba(2,74,142,0.5)]">
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <div className="mt-5 text-lg font-semibold text-brand-navy">{f.t}</div>
              <div className="mt-2 text-sm text-slate-600 leading-relaxed">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative bg-surface-alt">
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs uppercase tracking-widest text-brand-green-deep font-medium">Planes</div>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight text-brand-navy">
            Precios claros, sin sorpresas
          </h2>
          <p className="mt-4 text-slate-600">
            Elige el plan que se ajusta a tu empresa. Todos incluyen NCF, asientos automáticos y reportes DGII.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-6 items-stretch">
          {PLANES.map((plan) => {
            const popular = plan.destacado;
            return (
              <div
                key={plan.codigo}
                className={`relative rounded-3xl p-8 flex flex-col transition ${
                  popular
                    ? "bg-brand-navy text-white shadow-[0_30px_80px_-30px_rgba(6,50,102,0.6)] md:-translate-y-4"
                    : "border border-line bg-white shadow-sm hover:shadow-md"
                }`}
              >
                {popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-brand-green text-brand-navy shadow-lg">
                    <Star className="h-3 w-3 fill-brand-navy" /> Más popular
                  </div>
                )}
                <div className={`text-sm uppercase tracking-wider ${popular ? "text-white/80" : "text-slate-500"}`}>{plan.nombre}</div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl md:text-5xl font-semibold">
                    RD${plan.precio.toLocaleString("es-DO")}
                  </span>
                  <span className={`text-sm ${popular ? "text-white/80" : "text-slate-500"}`}>/mes</span>
                </div>
                <p className={`mt-3 text-sm ${popular ? "text-white/85" : "text-slate-600"}`}>{plan.descripcion}</p>

                <ul className="mt-6 space-y-3 flex-1">
                  {plan.beneficios.map((b) => (
                    <li key={b} className={`flex items-start gap-3 text-sm ${popular ? "text-white/90" : "text-slate-700"}`}>
                      <span
                        className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          popular ? "bg-brand-green" : "bg-brand-green/20"
                        }`}
                      >
                        <Check className={`h-3 w-3 ${popular ? "text-brand-navy" : "text-brand-green-deep"}`} />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>

                <div className={`mt-4 text-xs ${popular ? "text-white/75" : "text-slate-500"}`}>
                  + Módulo de nómina opcional: RD${plan.precioNomina.toLocaleString("es-DO")}/mes
                </div>

                <Link
                  to="/signup"
                  className={`mt-8 inline-flex h-12 items-center justify-center gap-2 px-6 rounded-full text-sm font-medium transition ${
                    popular
                      ? "bg-brand-green text-brand-navy font-semibold hover:brightness-95"
                      : "bg-brand-blue text-white hover:bg-brand-navy"
                  }`}
                >
                  Comenzar prueba gratuita <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="max-w-7xl mx-auto px-6 py-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-navy to-brand-blue p-10 md:p-16 text-center text-white">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-72 w-[700px] bg-brand-green/25 blur-3xl rounded-full" />
          <div className="relative">
            <h3 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Lleva tu contabilidad al siguiente nivel
            </h3>
            <p className="mt-4 text-white/85 max-w-xl mx-auto">
              Únete a las empresas dominicanas que ya emiten, registran y reportan con IngreSaaS.
            </p>
            <Link
              to="/signup"
              className="mt-8 inline-flex h-12 items-center justify-center gap-2 px-8 rounded-full text-sm font-semibold bg-brand-green text-brand-navy hover:brightness-95 transition"
            >
              Crear mi empresa ahora <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="bg-brand-navy text-white">
        <div className="max-w-7xl mx-auto px-6 py-12 grid gap-10 md:grid-cols-3">
          <div>
            <img src={logoLight} alt="IngreSaaS" className="h-9 w-auto mb-3" />
            <p className="text-sm text-white/80">
              Contabilidad y facturación premium para República Dominicana.
            </p>
          </div>
          <div>
            <div className="font-semibold mb-3 text-sm">Contacto</div>
            <a href="mailto:info@balanceactivo.net" className="text-sm text-white/80 hover:text-white transition">
              info@balanceactivo.net
            </a>
          </div>
          <div>
            <div className="font-semibold mb-3 text-sm">Legal</div>
            <ul className="space-y-1 text-sm text-white/80">
              <li>
                <Link to="/seguridad" className="hover:text-white transition">
                  Seguridad y privacidad
                </Link>
              </li>
              <li>
                <Link to="/terminos" className="hover:text-white transition">
                  Términos y condiciones
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-5 text-xs text-white/75 text-center">
            © {new Date().getFullYear()} IngreSaaS — Narnia Tech Solution, SRL. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
