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
import logo from "@/assets/logo-balance-activo.png";
import heroMockup from "@/assets/hero-fintech-mockup.jpg";
import { PLANES } from "@/lib/planes";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Balance Activo — Contabilidad y facturación premium para RD" },
      {
        name: "description",
        content:
          "Plataforma fintech para emitir facturas con NCF, calcular ITBIS y generar reportes 606/607 automáticos. Diseñada para PYMEs y contadores en República Dominicana.",
      },
      { property: "og:title", content: "Balance Activo — Contabilidad y facturación premium para RD" },
      {
        property: "og:description",
        content:
          "Plataforma fintech para emitir facturas con NCF, calcular ITBIS y generar reportes 606/607 automáticos.",
      },
      { property: "og:url", content: "https://balanceactivo.net/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://balanceactivo.net/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Balance Activo",
          url: "https://balanceactivo.net",
          logo: "https://balanceactivo.net/favicon.ico",
          email: "info@balanceactivo.net",
          areaServed: "DO",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Balance Activo",
          applicationCategory: "AccountingApplication",
          operatingSystem: "Web",
          url: "https://balanceactivo.net",
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
          name: "Balance Activo",
          url: "https://balanceactivo.net",
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
    <div className="min-h-screen bg-[#070a18] text-white antialiased overflow-x-hidden">
      {/* Background ambience */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full bg-[#3b6ef5] opacity-25 blur-[140px]" />
        <div className="absolute top-1/3 -right-32 h-[480px] w-[480px] rounded-full bg-[#10b981] opacity-20 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-[#8b5cf6] opacity-15 blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/90 border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Balance Activo" className="h-9 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition">Producto</a>
            <a href="#pricing" className="hover:text-slate-900 transition">Precios</a>
            <a href="#cta" className="hover:text-slate-900 transition">Empresa</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden sm:inline-flex h-10 items-center px-4 text-sm text-slate-700 hover:text-slate-900 transition"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/signup"
              className="inline-flex h-10 items-center gap-1 px-4 rounded-full text-sm font-medium bg-[#070a18] text-white hover:bg-[#0f152e] transition shadow-[0_0_30px_-5px_rgba(7,10,24,0.3)]"
            >
              Crear empresa <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main>
      <section className="relative">
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-xs text-white/80">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(16,185,129,0.6)]" />
            Cumplimiento DGII · Norma 06-2018
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
            La contabilidad de tu empresa,{" "}
            <span className="bg-gradient-to-r from-[#60a5fa] via-[#34d399] to-[#a78bfa] bg-clip-text text-transparent">
              automatizada y en tiempo real
            </span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
            Emite facturas con NCF, calcula ITBIS y nómina, y prepara tus reportes 606/607 desde una plataforma fintech diseñada para República Dominicana.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/signup"
              className="inline-flex h-12 items-center justify-center gap-2 px-7 rounded-full text-sm font-medium bg-gradient-to-r from-[#3b6ef5] to-[#10b981] text-white shadow-[0_10px_40px_-10px_rgba(59,110,245,0.7)] hover:shadow-[0_10px_50px_-10px_rgba(16,185,129,0.7)] transition"
            >
              Empezar prueba gratuita <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex h-12 items-center justify-center px-7 rounded-full text-sm font-medium border border-white/15 bg-white/5 backdrop-blur-md text-white hover:bg-white/10 transition"
            >
              Ver características
            </a>
          </div>

          {/* Hero mockup */}
          <div className="mt-16 md:mt-20 relative">
            <div className="absolute inset-x-10 -inset-y-6 bg-gradient-to-r from-[#3b6ef5]/30 via-[#10b981]/30 to-[#8b5cf6]/30 blur-3xl rounded-[40px]" />
            <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-2 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
              <img
                src={heroMockup}
                alt="Dashboard financiero Balance Activo"
                width={1536}
                height={1024}
                className="w-full h-auto rounded-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { k: "100%", v: "Cumple DGII" },
            { k: "0 min", v: "Generar asientos" },
            { k: "606/607", v: "Reportes en 1 clic" },
            { k: "24/7", v: "Soporte local" },
          ].map((s) => (
            <div key={s.v}>
              <div className="text-2xl md:text-3xl font-semibold bg-gradient-to-r from-[#60a5fa] to-[#34d399] bg-clip-text text-transparent">
                {s.k}
              </div>
              <div className="text-xs md:text-sm text-white/75 mt-1">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-widest text-emerald-400 font-medium">Características</div>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
            Todo lo que tu contador necesita,<br className="hidden md:block" />
            <span className="text-white/60">sin hojas de cálculo.</span>
          </h2>
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.t}
              className="group relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 hover:border-white/20 hover:bg-white/[0.06] transition"
            >
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#3b6ef5] to-[#10b981] flex items-center justify-center shadow-[0_8px_30px_-8px_rgba(59,110,245,0.7)]">
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <div className="mt-5 text-lg font-semibold">{f.t}</div>
              <div className="mt-2 text-sm text-white/75 leading-relaxed">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs uppercase tracking-widest text-emerald-400 font-medium">Planes</div>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
            Precios claros, sin sorpresas
          </h2>
          <p className="mt-4 text-white/75">
            Elige el plan que se ajusta a tu empresa. Todos incluyen NCF, asientos automáticos y reportes DGII.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-6 items-stretch">
          {PLANES.map((plan) => {
            const popular = plan.destacado;
            return (
              <div
                key={plan.codigo}
                className={`relative rounded-3xl p-8 flex flex-col backdrop-blur-xl transition ${
                  popular
                    ? "border border-transparent bg-gradient-to-b from-[#1a2452] to-[#0d1330] shadow-[0_30px_80px_-20px_rgba(59,110,245,0.6)] md:-translate-y-4"
                    : "border border-white/10 bg-white/[0.04] hover:border-white/20"
                }`}
                style={
                  popular
                    ? {
                        backgroundImage:
                          "linear-gradient(#0d1330,#0d1330), linear-gradient(135deg,#3b6ef5,#10b981,#a78bfa)",
                        backgroundOrigin: "border-box",
                        backgroundClip: "padding-box, border-box",
                        border: "1px solid transparent",
                      }
                    : undefined
                }
              >
                {popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-[#3b6ef5] to-[#10b981] text-white shadow-lg">
                    <Star className="h-3 w-3 fill-white" /> Más popular
                  </div>
                )}
                <div className="text-sm uppercase tracking-wider text-white/70">{plan.nombre}</div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl md:text-5xl font-semibold">
                    RD${plan.precio.toLocaleString("es-DO")}
                  </span>
                  <span className="text-sm text-white/75">/mes</span>
                </div>
                <p className="mt-3 text-sm text-white/80">{plan.descripcion}</p>

                <ul className="mt-6 space-y-3 flex-1">
                  {plan.beneficios.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-sm text-white/80">
                      <span
                        className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          popular
                            ? "bg-gradient-to-br from-[#3b6ef5] to-[#10b981]"
                            : "bg-white/10"
                        }`}
                      >
                        <Check className="h-3 w-3 text-white" />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>

                <div className="mt-4 text-xs text-white/70">
                  + Módulo de nómina opcional: RD${plan.precioNomina.toLocaleString("es-DO")}/mes
                </div>

                <Link
                  to="/signup"
                  className={`mt-8 inline-flex h-12 items-center justify-center gap-2 px-6 rounded-full text-sm font-medium transition ${
                    popular
                      ? "bg-gradient-to-r from-[#3b6ef5] to-[#10b981] text-white shadow-[0_10px_30px_-10px_rgba(16,185,129,0.7)] hover:shadow-[0_10px_40px_-10px_rgba(59,110,245,0.8)]"
                      : "bg-white/10 text-white hover:bg-white/15 border border-white/10"
                  }`}
                >
                  Comenzar prueba gratuita <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="max-w-7xl mx-auto px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d1330] via-[#0a1028] to-[#0d1330] p-10 md:p-16 text-center">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-72 w-[700px] bg-gradient-to-r from-[#3b6ef5]/40 to-[#10b981]/40 blur-3xl rounded-full" />
          <div className="relative">
            <h3 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Lleva tu contabilidad al siguiente nivel
            </h3>
            <p className="mt-4 text-white/80 max-w-xl mx-auto">
              Únete a las empresas dominicanas que ya emiten, registran y reportan con Balance Activo.
            </p>
            <Link
              to="/signup"
              className="mt-8 inline-flex h-12 items-center justify-center gap-2 px-8 rounded-full text-sm font-medium bg-white text-[#070a18] hover:bg-white/90 transition shadow-[0_10px_40px_-10px_rgba(255,255,255,0.5)]"
            >
              Crear mi empresa ahora <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-12 grid gap-10 md:grid-cols-3">
          <div>
            <img src={logo} alt="Balance Activo" className="h-9 w-auto mb-3" />
            <p className="text-sm text-white/75">
              Contabilidad y facturación premium para República Dominicana.
            </p>
          </div>
          <div>
            <div className="font-semibold mb-3 text-sm">Contacto</div>
            <a href="mailto:info@balanceactivo.net" className="text-sm text-white/75 hover:text-white transition">
              info@balanceactivo.net
            </a>
          </div>
          <div>
            <div className="font-semibold mb-3 text-sm">Legal</div>
            <ul className="space-y-1 text-sm text-white/70">
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
        <div className="border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6 py-5 text-xs text-white/70 text-center">
            © {new Date().getFullYear()} Balance Activo — Narnia Tech Solution, SRL. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
