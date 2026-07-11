import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Lock, Database, Mail, FileText, UserCheck, Building2 } from "lucide-react";
import logo from "@/assets/logo-balance-activo.png";

export const Route = createFileRoute("/seguridad")({
  component: Seguridad,
  head: () => ({
    meta: [
      { title: "Seguridad y privacidad — Balance Activo" },
      {
        name: "description",
        content:
          "Cómo Balance Activo protege los datos contables y de facturación de las empresas dominicanas: acceso, alojamiento, retención y contacto de seguridad.",
      },
      { property: "og:title", content: "Seguridad y privacidad — Balance Activo" },
      {
        property: "og:description",
        content:
          "Controles de acceso, alojamiento, manejo de datos y contacto de seguridad de Balance Activo.",
      },
      { property: "og:url", content: "https://balanceactivo.net/seguridad" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://balanceactivo.net/seguridad" }],
  }),
});

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Shield;
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

function Seguridad() {
  return (
    <div className="min-h-screen bg-[#070a18] text-white">
      <header className="border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Balance Activo" className="h-8 w-auto" />
          </Link>
          <Link
            to="/"
            className="text-sm text-white/75 hover:text-white transition"
          >
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
            <Shield className="h-3.5 w-3.5" /> Seguridad y privacidad
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">
            Cómo cuidamos tus datos contables
          </h1>
          <p className="mt-4 text-white/80 max-w-2xl">
            Esta página la mantiene el equipo de Balance Activo para responder
            las preguntas más comunes sobre seguridad, privacidad y manejo de
            datos de la plataforma. Describe controles habilitados hoy y no
            constituye una certificación independiente.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Section icon={Building2} title="Responsable del tratamiento">
            <p>
              Balance Activo es una marca comercial propiedad de{" "}
              <strong>Narnia Tech Solution, SRL</strong>, RNC{" "}
              <strong>1-33-74485-6</strong>, sociedad constituida en la
              República Dominicana. Narnia Tech es la responsable de la
              plataforma y del tratamiento de los datos que en ella se
              gestionan.
            </p>
            <p>
              Más información sobre el grupo en{" "}
              <a
                href="https://narniats.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-white/40 hover:decoration-white"
              >
                narniats.com
              </a>
              .
            </p>
          </Section>

          <Section icon={UserCheck} title="Acceso y autenticación">
            <p>
              El acceso a la aplicación requiere iniciar sesión con correo y
              contraseña, o con un proveedor externo cuando esté habilitado.
            </p>
            <p>
              Cada empresa (tenant) está aislada: los usuarios solo pueden ver y
              modificar la información de la empresa a la que pertenecen. Los
              permisos dentro de la empresa se gestionan con roles
              (administrador, contador y agente de facturación).
            </p>
          </Section>

          <Section icon={Database} title="Datos y alojamiento">
            <p>
              Los datos de clientes, facturas, productos y registros contables
              se almacenan en una base de datos administrada en la nube,
              protegida con reglas de acceso a nivel de fila para que cada
              petición se evalúe contra el usuario autenticado y su empresa.
            </p>
            <p>
              La aplicación se publica a través de la plataforma de Lovable,
              servida sobre HTTPS.
            </p>
          </Section>

          <Section icon={Lock} title="Datos sensibles y secretos">
            <p>
              Las credenciales de terceros (proveedores de correo, claves de
              servicio) se gestionan como secretos del servidor y no se exponen
              al navegador.
            </p>
            <p>
              Las contraseñas nunca se almacenan en texto plano: el proveedor
              de autenticación las guarda con hashes resistentes.
            </p>
          </Section>

          <Section icon={FileText} title="Retención y eliminación">
            <p>
              Mientras tu cuenta esté activa, conservamos los documentos
              contables que registras (facturas, NCF, asientos, nómina, etc.)
              para que cumplas con tus obligaciones tributarias en República
              Dominicana.
            </p>
            <p>
              Si deseas eliminar o exportar la información de tu empresa,
              escríbenos al contacto que aparece abajo y coordinaremos el
              proceso.
            </p>
          </Section>

          <Section icon={Mail} title="Comunicaciones por correo">
            <p>
              Enviamos correos transaccionales (recuperación de contraseña,
              recibos, notificaciones de cobro) desde un dominio propio. Todo
              correo incluye opción para gestionar suscripciones cuando aplica.
            </p>
          </Section>

          <Section icon={Shield} title="Reporte de vulnerabilidades">
            <p>
              Si encuentras un problema de seguridad o privacidad, por favor
              escríbenos a{" "}
              <a
                href="mailto:info@balanceactivo.net"
                className="underline decoration-white/40 hover:decoration-white"
              >
                info@balanceactivo.net
              </a>{" "}
              con los detalles. Daremos seguimiento y te confirmaremos la
              recepción.
            </p>
          </Section>
        </div>

        <p className="mt-12 text-xs text-white/60">
          Esta página describe prácticas vigentes de Balance Activo y puede
          actualizarse a medida que evolucione el producto. No constituye un
          acuerdo de procesamiento de datos (DPA) ni una certificación de
          cumplimiento.
          {" "}Consulta también nuestros{" "}
          <Link to="/terminos" className="underline decoration-white/40 hover:decoration-white">
            términos y condiciones
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