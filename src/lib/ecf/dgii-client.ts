// Cliente para los servicios web de la DGII (envio de e-CF y consulta de
// estado por TrackId). TODAVIA NO IMPLEMENTADO -- ver README.md, seccion
// "Facturacion Electronica (e-CF)".
//
// Lo que se sabe hasta ahora, de fuentes publicas de la DGII (no de acceso
// directo a la documentacion tecnica completa de los servicios web, que
// requiere estar habilitado como Emisor Electronico):
//   - La comunicacion es via REST (no SOAP).
//   - El emisor envia el XML firmado del e-CF y la DGII responde con un
//     TrackId para poder consultar el estado despues (aceptado, rechazado,
//     en proceso, etc.).
//   - Existe un ambiente de pre-certificacion llamado TesteCF, en
//     ecf.dgii.gov/testecf/emisorreceptor, donde se corren los Sets de
//     Pruebas (Datos, Simulacion, Comunicacion) antes de poder pedir
//     produccion.
//
// Lo que falta para completar esto (todo esto requiere ya estar en el
// proceso de certificacion de Emisor Electronico, que da acceso al portal
// tecnico real):
//   1. Las URLs exactas de cada endpoint (envio, consulta de estado, envio
//      de Acuse de Recibo / Aprobacion Comercial) para cada ambiente
//      (testecf / certificacion / produccion).
//   2. El mecanismo de autenticacion de las llamadas (la documentacion
//      publica no lo detalla -- hay que confirmarlo contra el manual
//      tecnico real, probablemente involucre el propio certificado digital
//      o un token de sesion obtenido con el).
//   3. El formato exacto del cuerpo de cada request/response.
//
// La forma de las funciones de abajo es una aproximacion razonable del
// flujo (enviar -> TrackId -> consultar estado), pero las URLs son
// placeholders y NO deben usarse tal cual.

import type { AmbienteECF, ResultadoConsultaECF, ResultadoEnvioECF } from "./types";

// PLACEHOLDER -- confirmar contra el manual tecnico real antes de usar.
const BASE_URLS: Record<AmbienteECF, string> = {
  testecf: "https://ecf.dgii.gov/testecf/emisorreceptor",
  certificacion: "https://ecf.dgii.gov/certificacion/emisorreceptor",
  produccion: "https://ecf.dgii.gov/emisorreceptor",
};

export async function enviarECF(_xmlFirmado: string, _ambiente: AmbienteECF): Promise<ResultadoEnvioECF> {
  throw new Error(
    "enviarECF: pendiente de implementar -- las URLs y el mecanismo de autenticacion de los " +
      "servicios web de la DGII son placeholders sin confirmar. Ver el comentario al inicio de " +
      "src/lib/ecf/dgii-client.ts.",
  );
}

export async function consultarEstadoECF(_trackId: string, _ambiente: AmbienteECF): Promise<ResultadoConsultaECF> {
  throw new Error(
    "consultarEstadoECF: pendiente de implementar -- ver el comentario al inicio de " +
      "src/lib/ecf/dgii-client.ts.",
  );
}
