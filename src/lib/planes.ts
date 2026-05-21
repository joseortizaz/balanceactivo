import type { Database } from "@/integrations/supabase/types";

export type PlanCodigo = "emprendedor" | "mipyme" | "corporativo";
export type EstadoSuscripcion = Database["public"]["Enums"] extends { estado_suscripcion: infer T }
  ? T
  : "pendiente" | "activa" | "vencida" | "suspendida" | "cancelada";

export interface PlanInfo {
  codigo: PlanCodigo;
  nombre: string;
  precio: number;
  precioNomina: number;
  limiteFacturacion: number;
  maxAdministradores: number;
  maxAgentesFacturacion: number;
  maxContadores: number;
  descripcion: string;
  destacado?: boolean;
  beneficios: string[];
}

export const PLANES: PlanInfo[] = [
  {
    codigo: "emprendedor",
    nombre: "Emprendedor",
    precio: 1190,
    precioNomina: 300,
    limiteFacturacion: 500_000,
    maxAdministradores: 1,
    maxAgentesFacturacion: 1,
    maxContadores: 1,
    descripcion: "Ideal para iniciar tu negocio formal en RD.",
    beneficios: [
      "1 Administrador",
      "1 Agente de facturación o Contador",
      "Facturación hasta RD$ 500,000/mes",
      "Facturación con NCF y reportes 606/607",
      "Catálogo de cuentas y asientos contables",
      "Soporte por correo",
    ],
  },
  {
    codigo: "mipyme",
    nombre: "Mipyme",
    precio: 3190,
    precioNomina: 600,
    limiteFacturacion: 1_200_000,
    maxAdministradores: 1,
    maxAgentesFacturacion: 1,
    maxContadores: 1,
    destacado: true,
    descripcion: "Para pequeñas empresas con equipo completo.",
    beneficios: [
      "1 Administrador",
      "1 Agente de facturación",
      "1 Contador",
      "Facturación hasta RD$ 1,200,000/mes",
      "Cotizaciones, recurrentes y cobros",
      "Gastos con retenciones y categoría 606",
      "Soporte prioritario",
    ],
  },
  {
    codigo: "corporativo",
    nombre: "Corporativo",
    precio: 5190,
    precioNomina: 900,
    limiteFacturacion: 4_500_000,
    maxAdministradores: 1,
    maxAgentesFacturacion: 3,
    maxContadores: 1,
    descripcion: "Para empresas en crecimiento con múltiples agentes.",
    beneficios: [
      "1 Administrador",
      "3 Agentes de facturación",
      "1 Contador",
      "Facturación hasta RD$ 4,500,000/mes",
      "Todos los módulos del plan Mipyme",
      "Auditoría avanzada",
      "Soporte prioritario telefónico",
    ],
  },
];

export function getPlan(codigo: PlanCodigo): PlanInfo {
  return PLANES.find((p) => p.codigo === codigo)!;
}

export const DATOS_TRANSFERENCIA = {
  beneficiario: "Balance Activo SRL",
  rnc: "1-31-12345-6",
  bancos: [
    { banco: "Banco Popular Dominicano", tipo: "Cuenta Corriente", numero: "123-45678-9" },
    { banco: "Banreservas", tipo: "Cuenta Corriente", numero: "987-654321-0" },
    { banco: "BHD", tipo: "Cuenta Corriente", numero: "555-1234567-8" },
  ],
  correo: "pagos@balanceactivo.net",
};

export const ESTADO_LABEL: Record<string, { label: string; tone: "default" | "secondary" | "destructive" | "outline" }> = {
  pendiente: { label: "Pendiente de Activación", tone: "secondary" },
  activa: { label: "Activa", tone: "default" },
  vencida: { label: "Vencida", tone: "destructive" },
  suspendida: { label: "Suspendida", tone: "destructive" },
  cancelada: { label: "Cancelada", tone: "outline" },
};