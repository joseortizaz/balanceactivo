// Cifrado de la passphrase del certificado digital (.p12) que Balance
// Activo custodia por cada tenant, según el modelo operativo de "Proveedor
// de Servicios de Facturación Electrónica" que describe la DGII (ver
// README.md, sección "Facturación Electrónica (e-CF)").
//
// El archivo .p12 en sí ya es un contenedor cifrado (PKCS#12); lo que hay
// que proteger aparte es la contraseña que lo abre. Se cifra con
// AES-256-GCM usando una clave maestra que vive SOLO como secreto del
// Worker (CERT_ENCRYPTION_KEY) -- nunca en la base de datos ni en el
// bundle del cliente. Este archivo termina en ".server.ts" a propósito:
// nunca debe importarse desde código que corra en el navegador.

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recomendado para GCM

function getMasterKey(): Buffer {
  const secret = process.env.CERT_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "CERT_ENCRYPTION_KEY no está configurada. Es requerida para cifrar/descifrar la passphrase del certificado digital -- generar un valor aleatorio largo (p. ej. `openssl rand -base64 32`) y guardarlo como secreto del Worker, nunca commitearlo.",
    );
  }
  // Deriva una clave de 32 bytes (AES-256) a partir del secreto configurado,
  // sin importar su longitud original.
  return scryptSync(secret, "balanceactivo-cert-passphrase", 32);
}

export interface CiphertextEnvelope {
  /** Ciphertext + auth tag de GCM, en base64. */
  ciphertext: string;
  /** IV usado para este cifrado, en base64 (uno distinto por cada valor cifrado). */
  iv: string;
}

/** Cifra un valor sensible (la passphrase del .p12) para guardarlo en la base de datos. */
export function encryptSecret(plaintext: string): CiphertextEnvelope {
  const key = getMasterKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Se guarda el authTag pegado al final del ciphertext; se separa al descifrar.
  return {
    ciphertext: Buffer.concat([encrypted, authTag]).toString("base64"),
    iv: iv.toString("base64"),
  };
}

/** Descifra un valor cifrado con encryptSecret(). Lanza si la clave o el authTag no coinciden. */
export function decryptSecret(envelope: CiphertextEnvelope): string {
  const key = getMasterKey();
  const iv = Buffer.from(envelope.iv, "base64");
  const raw = Buffer.from(envelope.ciphertext, "base64");
  const authTag = raw.subarray(raw.length - 16);
  const encrypted = raw.subarray(0, raw.length - 16);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
