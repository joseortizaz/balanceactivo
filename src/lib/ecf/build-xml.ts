// Generación del XML de un e-CF a partir de los datos ya resueltos de una
// factura. TODAVÍA NO IMPLEMENTADO -- ver README.md, sección "Facturación
// Electrónica (e-CF)".
//
// Por qué no está implementado ya: el XML de un e-CF tiene que calzar
// exactamente con el esquema (XSD) y las reglas de validación que publica
// la DGII en "Formato Comprobante Fiscal Electrónico (e-CF) v1.0"
// (octubre 2025) y en "Descripción Técnica de Facturación Electrónica".
// Inventar los nombres de los tags, el orden de los campos o las reglas de
// formato (por ejemplo cómo se codifican montos, fechas, o el detalle de
// impuestos) sin el XSD real generaría XML que la DGII rechazaría en el
// mejor caso, o que pasaría validaciones superficiales pero fallaría en el
// Set de Pruebas de Comunicación -- ninguno de los dos resultados vale la
// pena el riesgo de adivinar.
//
// Qué falta para completar esto:
//   1. Descargar el XSD y el documento de formato desde el portal de la
//      DGII (Documentación sobre e-CF > Formatos XML), o desde el ambiente
//      de certificación una vez el tenant esté habilitado.
//   2. Construir el XML campo por campo según ese esquema, incluyendo el
//      nodo de Información de Referencia (para notas de crédito/débito,
//      tipo 33/34) y las secciones específicas de cada tipo de e-CF.
//   3. Validar el XML generado contra el XSD antes de intentar firmarlo.

import type { DatosECF } from "./types";

export function buildECFXml(_datos: DatosECF): string {
  throw new Error(
    "buildECFXml: pendiente de implementar contra el XSD real de la DGII (Formato e-CF v1.0). " +
      "Ver el comentario al inicio de src/lib/ecf/build-xml.ts.",
  );
}
