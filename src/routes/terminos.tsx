import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Scale, ShieldCheck, CreditCard, AlertTriangle, Mail, Building2 } from "lucide-react";
import logo from "@/assets/logo-balance-activo.png";

export const Route = createFileRoute("/terminos")({
  component: Terminos,
  head: () => ({
    meta: [
      { title: "Términos y Condiciones — Balance Activo" },
      {
        name: "description",
        content:
          "Términos y condiciones de uso del portal Balance Activo, marca de Narnia Tech Solution, SRL (RNC 1-33-74485-6).",
      },
      { property: "og:title", content: "Términos y Condiciones — Balance Activo" },
      {
        property: "og:description",
        content:
          "Condiciones de uso, suscripción, propiedad intelectual y responsabilidades del servicio Balance Activo.",
      },
      { property: "og:url", content: "https://balanceactivo.net/terminos" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://balanceactivo.net/terminos" }],
  }),
});

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof FileText;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#3b6ef5]/30 to-[#10b981]/30 flex items-center justify-center">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="text-sm text-white/80 space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}

function Terminos() {
  const fechaVigencia = "11 de julio de 2026";
  return (
    <div className="min-h-screen bg-[#070a18] text-white">
      <header className="border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Balance Activo" className="h-8 w-auto" />
          </Link>
          <Link to="/" className="text-sm text-white/75 hover:text-white transition">
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
            <Scale className="h-3.5 w-3.5" /> Términos y condiciones
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">
            Términos y condiciones de uso
          </h1>
          <p className="mt-4 text-white/80 max-w-2xl">
            Vigentes desde el {fechaVigencia}. Al registrarte o utilizar
            Balance Activo aceptas los términos descritos a continuación.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Section icon={Building2} title="1. Titularidad del servicio">
            <p>
              <strong>Balance Activo</strong> es una marca comercial propiedad
              de <strong>Narnia Tech Solution, SRL</strong>, sociedad
              constituida bajo las leyes de la República Dominicana, con RNC{" "}
              <strong>1-33-74485-6</strong> (en adelante, "Narnia Tech" o "el
              Proveedor").
            </p>
            <p>
              Cualquier referencia a "nosotros", "la plataforma" o "el
              servicio" en estos términos se entiende hecha a Narnia Tech
              Solution, SRL a través de su producto Balance Activo.
            </p>
            <p>
              Sitio del grupo:{" "}
              <a
                href="https://narniats.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-white/40 hover:decoration-white"
              >
                narniats.com
              </a>
            </p>
          </Section>

          <Section icon={FileText} title="2. Objeto del servicio">
            <p>
              Balance Activo es un software como servicio (SaaS) de
              contabilidad y facturación orientado a empresas de República
              Dominicana. Permite emitir comprobantes fiscales (NCF), llevar
              inventario, registrar cobros, gestionar nómina y generar
              reportes exigidos por la DGII (606, 607, 608, IT-1, IR-17, entre
              otros).
            </p>
            <p>
              El servicio se ofrece "tal cual" y puede evolucionar en
              funcionalidades. El uso de módulos específicos puede requerir
              plan de suscripción vigente.
            </p>
          </Section>

          <Section icon={ShieldCheck} title="3. Cuenta y responsabilidades del usuario">
            <p>
              El titular de la cuenta es responsable de la veracidad de los
              datos suministrados (razón social, RNC, direcciones, correos) y
              de mantener actualizada la información de la empresa.
            </p>
            <p>
              El usuario debe custodiar sus credenciales de acceso. Toda
              actividad realizada bajo su cuenta se considera efectuada por
              él. Notifíquenos de inmediato cualquier uso no autorizado.
            </p>
            <p>
              El usuario se compromete a utilizar la plataforma cumpliendo la
              legislación dominicana aplicable, especialmente las normas de la
              Dirección General de Impuestos Internos (DGII) y la Ley 172-13
              de Protección de Datos Personales.
            </p>
          </Section>

          <Section icon={CreditCard} title="4. Planes, pagos y renovaciones">
            <p>
              Balance Activo puede ofrecerse en planes gratuitos o de pago.
              Los precios, ciclos de facturación y límites de cada plan se
              informan en la sección de suscripción dentro de la aplicación.
            </p>
            <p>
              Las suscripciones se renuevan automáticamente al final de cada
              ciclo, salvo cancelación previa desde el propio panel del
              usuario. Los pagos realizados no son reembolsables una vez
              consumido el período correspondiente.
            </p>
            <p>
              El impago o rechazo del cargo puede suspender el acceso a
              módulos de pago; los datos permanecerán disponibles según la
              política de retención descrita en la página de seguridad.
            </p>
          </Section>

          <Section icon={ShieldCheck} title="5. Propiedad de los datos">
            <p>
              Toda la información contable, comercial y fiscal cargada por el
              cliente es y sigue siendo propiedad del cliente. Narnia Tech
              actúa como encargado del tratamiento y utiliza los datos
              únicamente para prestar el servicio y cumplir requerimientos
              legales.
            </p>
            <p>
              El cliente puede solicitar la exportación o eliminación de sus
              datos escribiendo a{" "}
              <a
                href="mailto:info@balanceactivo.net"
                className="underline decoration-white/40 hover:decoration-white"
              >
                info@balanceactivo.net
              </a>
              .
            </p>
          </Section>

          <Section icon={FileText} title="6. Propiedad intelectual">
            <p>
              El software, marca, logotipos, interfaz, código fuente y
              documentación de Balance Activo son propiedad exclusiva de
              Narnia Tech Solution, SRL y están protegidos por las leyes
              dominicanas e internacionales de propiedad intelectual.
            </p>
            <p>
              Queda prohibida su reproducción, ingeniería inversa,
              redistribución o uso fuera del alcance de la suscripción
              contratada.
            </p>
          </Section>

          <Section icon={AlertTriangle} title="7. Disponibilidad y limitación de responsabilidad">
            <p>
              Narnia Tech realiza esfuerzos razonables para mantener el
              servicio disponible, pero no garantiza operación ininterrumpida.
              Podrán existir ventanas de mantenimiento o eventos ajenos al
              proveedor (proveedores de nube, telecomunicaciones, cambios
              regulatorios).
            </p>
            <p>
              En la máxima medida permitida por la ley, Narnia Tech no será
              responsable por lucro cesante, daños indirectos o consecuentes
              derivados del uso o imposibilidad de uso de la plataforma. La
              responsabilidad total no excederá los montos pagados por el
              cliente en los últimos 3 meses.
            </p>
            <p>
              La correcta declaración y pago de impuestos ante la DGII es
              responsabilidad exclusiva del contribuyente. Balance Activo es
              una herramienta de apoyo y no sustituye el criterio de un
              profesional contable o legal.
            </p>
          </Section>

          <Section icon={AlertTriangle} title="8. Uso aceptable y suspensión">
            <p>
              Está prohibido usar la plataforma para actividades ilícitas,
              cargar contenido malicioso, intentar vulnerar la seguridad,
              revender el servicio sin autorización o emitir comprobantes que
              no correspondan a operaciones reales.
            </p>
            <p>
              Narnia Tech podrá suspender o cancelar cuentas que incumplan
              estos términos o que representen un riesgo para la plataforma o
              para otros usuarios, notificando por correo cuando sea posible.
            </p>
          </Section>

          <Section icon={Scale} title="9. Legislación aplicable">
            <p>
              Estos términos se rigen por las leyes de la República
              Dominicana. Cualquier controversia derivada del uso del servicio
              se someterá a los tribunales competentes del Distrito Nacional,
              renunciando las partes a cualquier otro fuero.
            </p>
          </Section>

          <Section icon={FileText} title="10. Modificaciones">
            <p>
              Narnia Tech podrá actualizar estos términos para reflejar
              cambios en el producto, la ley o la operación del negocio. La
              versión vigente estará siempre publicada en esta página con su
              fecha de actualización. El uso continuado del servicio después
              de una modificación implica su aceptación.
            </p>
          </Section>

          <Section icon={Mail} title="11. Contacto">
            <p>
              Narnia Tech Solution, SRL — RNC 1-33-74485-6
              <br />
              Correo:{" "}
              <a
                href="mailto:info@balanceactivo.net"
                className="underline decoration-white/40 hover:decoration-white"
              >
                info@balanceactivo.net
              </a>
              <br />
              Web:{" "}
              <a
                href="https://narniats.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-white/40 hover:decoration-white"
              >
                narniats.com
              </a>
            </p>
          </Section>
        </div>

        <p className="mt-12 text-xs text-white/60">
          Ver también nuestra{" "}
          <Link to="/seguridad" className="underline decoration-white/40 hover:decoration-white">
            página de seguridad y privacidad
          </Link>
          .
        </p>
      </main>

      <footer className="border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-6 text-xs text-white/70 text-center">
          © {new Date().getFullYear()} Balance Activo — Narnia Tech Solution, SRL.
        </div>
      </footer>
    </div>
  );
}