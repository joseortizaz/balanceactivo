// Tipos compartidos del módulo de Facturación Electrónica (e-CF).
// Ver README.md, sección "Facturación Electrónica (e-CF)", para el estado
// real de esta infraestructura: por ahora es solo el modelo de datos y el
// esqueleto de las piezas que faltan (XML, firma, envío a la DGII).

/** Tipos de e-CF según la DGII (ver Formato e-CF v1.0, octubre 2025). */
export type TipoECF = "31" | "32" | "33" | "34" | "41" | "43" | "44" | "45" | "46" | "47";

export type EstadoEmisorECF = "no_iniciado" | "en_pruebas" | "certificado" | "suspendido";
export type AmbienteECF = "testecf" | "certificacion" | "produccion";
export type EstadoEnvioECF =
  | "pendiente" | "firmado" | "enviado" | "en_proceso"
  | "aceptado" | "aceptado_condicional" | "rechazado" | "contingencia";

export interface EmisorECF {
  rnc: string;
  razonSocial: string;
  nombreComercial?: string | null;
  direccion?: string | null;
}

export interface ReceptorECF {
  rncOCedula?: string | null;
  razonSocial: string;
  direccion?: string | null;
}

export interface LineaECF {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  tasaItbis: number;
  montoItbis: number;
  subtotal: number;
}

/**
 * Datos ya resueltos (factura + tenant + cliente) necesarios para construir
 * el XML de un e-CF. Este shape es una primera aproximación basada en la
 * estructura general que describen los documentos públicos de la DGII —
 * falta validarlo campo por campo contra el XSD real una vez se tenga
 * acceso a la documentación técnica completa (Formato e-CF v1.0) o al
 * ambiente de certificación.
 */
export interface DatosECF {
  tipoECF: TipoECF;
  eNCF: string;
  fechaEmision: string; // YYYY-MM-DD
  emisor: EmisorECF;
  receptor: ReceptorECF;
  lineas: LineaECF[];
  montoGravadoTotal: number;
  totalITBIS: number;
  montoTotal: number;
  condicionPago: "contado" | "credito";
  fechaVencimiento?: string | null;
}

export interface ResultadoEnvioECF {
  trackId: string;
  fechaEnvio: string;
}

export interface ResultadoConsultaECF {
  estado: EstadoEnvioECF;
  codigoSeguridad?: string | null;
  mensaje?: string | null;
  fechaRespuesta?: string | null;
}
