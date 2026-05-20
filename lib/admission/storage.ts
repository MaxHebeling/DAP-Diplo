import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "consent-letters";

export type UploadResult = {
  path: string;
};

/**
 * Sube la carta de consentimiento al bucket privado `consent-letters`.
 * Path resultante: `{userId}/consent-{timestamp}-{safeFilename}`.
 *
 * Se ejecuta server-side con service-role para evitar exponer el flujo
 * de RLS desde el cliente (que igualmente lo cubre la policy del bucket,
 * pero acá es más simple). El cliente envía el File al server action y
 * el server action invoca esta función.
 */
export async function uploadConsentLetter(opts: {
  userId: string;
  file: File;
}): Promise<UploadResult> {
  const { userId, file } = opts;

  if (!file || file.size === 0) {
    throw new Error("Archivo vacío.");
  }

  const safeName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.\-]/g, "_")
    .slice(-80);
  const path = `${userId}/consent-${Date.now()}-${safeName}`;

  const admin = createAdminClient();
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    throw new Error(`No se pudo subir la carta: ${error.message}`);
  }

  return { path };
}

/**
 * Genera signed URL para que admisiones pueda ver la carta en el panel.
 * Server-only.
 */
export async function signedConsentLetterUrl(
  path: string,
  expiresInSeconds = 60 * 60 * 24, // 24h
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

// ---------------------------------------------------------------------
// admission-letters bucket (PDF firmado de admisión)
// ---------------------------------------------------------------------
const LETTERS_BUCKET = "admission-letters";

/**
 * Sube la carta PDF generada al bucket privado `admission-letters`.
 * Path: `{userId}/{matricula}.pdf`. Idempotente: upsert=true ya que el
 * cron puede re-correr.
 */
export async function uploadAdmissionLetter(opts: {
  userId: string;
  matricula: string;
  pdfBuffer: Buffer;
}): Promise<{ path: string }> {
  const { userId, matricula, pdfBuffer } = opts;
  const path = `${userId}/${matricula}.pdf`;

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(LETTERS_BUCKET)
    .upload(path, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw new Error(`No se pudo subir la carta de admisión: ${error.message}`);
  }
  return { path };
}

/**
 * Signed URL para que el admin pueda descargar/preview la carta emitida.
 */
export async function signedAdmissionLetterUrl(
  path: string,
  expiresInSeconds = 60 * 60 * 24,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(LETTERS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
