// Firma digital (XML-DSig, firma envolvente) de un e-CF con el certificado
// del tenant. TODAVIA NO IMPLEMENTADO -- ver README.md, seccion
// "Facturacion Electronica (e-CF)".
//
// Que se sabe hasta ahora (de la documentacion publica de la DGII):
//   - Todo e-CF debe llevar la firma digital del emisor, hecha con su
//     Certificado Digital para Procedimientos Tributarios (contenedor
//     PKCS#12 / .p12 protegido con contrasena).
//   - La firma es sobre el XML del comprobante (XML-DSig).
//
// Que falta resolver antes de implementar esto de verdad:
//   1. Confirmar el detalle exacto de la firma que exige la DGII (algoritmo,
//      canonicalizacion, que nodo se firma) contra la "Descripcion Tecnica
//      de Facturacion Electronica".
//   2. Elegir la libreria para (a) leer el .p12/.pfx (extraer clave privada
//      y certificado) y (b) producir la firma XML-DSig. El Worker de
//      Cloudflare tiene el flag nodejs_compat activado (ver
//      wrangler.jsonc), lo que da acceso a gran parte del modulo crypto
//      de Node -- probablemente alcance para esto con algo como
//      node-forge (PKCS#12) + xml-crypto (XML-DSig), pero hay que probarlo
//      en el Worker real: nodejs_compat no cubre el 100% de la API de
//      Node, y XML-DSig con canonicalizacion es justo el tipo de cosa que
//      puede toparse con gaps. Si no funciona directo en el Worker, la
//      alternativa es mover esta operacion a una Supabase Edge Function
//      (Deno, con mas compatibilidad de crypto) invocada desde el Worker.
//   3. La contrasena del .p12 se obtiene descifrando
//      tenant_certificados_digitales.passphrase_cifrada con
//      src/lib/ecf/crypto.server.ts (decryptSecret) -- nunca debe quedar
//      en logs ni en la respuesta de ningun endpoint.

export interface CertificadoParaFirma {
  /** Contenido binario del archivo .p12/.pfx, ya descargado del storage privado. */
  pkcs12: Uint8Array;
  /** Contrasena del .p12, ya descifrada (ver crypto.server.ts). */
  passphrase: string;
}

export async function signECFXml(_xml: string, _certificado: CertificadoParaFirma): Promise<string> {
  throw new Error(
    "signECFXml: pendiente de implementar -- requiere validar la libreria de firma XML-DSig " +
      "contra el runtime del Worker (nodejs_compat) y el detalle exacto que exige la DGII. " +
      "Ver el comentario al inicio de src/lib/ecf/sign-xml.ts.",
  );
}
