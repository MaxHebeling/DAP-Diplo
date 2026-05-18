import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "certificates";

export function certificateStoragePath(
  userId: string,
  certificateId: string,
): string {
  // Convención: {user_id}/{certificate_id}.pdf
  // El RLS del bucket usa storage.foldername(name)[1] = auth.uid().
  return `${userId}/${certificateId}.pdf`;
}

export async function uploadCertificatePdf(
  userId: string,
  certificateId: string,
  pdf: Buffer,
): Promise<{ path: string }> {
  const admin = createAdminClient();
  const path = certificateStoragePath(userId, certificateId);

  const { error } = await admin.storage.from(BUCKET).upload(path, pdf, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }
  return { path };
}

/**
 * Devuelve una signed URL válida 1h para que el alumno descargue el cert.
 * Diseñada para llamarse on-demand desde un Server Component / API route
 * (no almacenamos la signed URL en DB porque expira).
 */
export async function signedCertificateUrl(
  path: string,
  expiresSeconds: number = 3600,
): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresSeconds);
  if (error || !data) {
    throw new Error(`Signed URL failed: ${error?.message ?? "unknown"}`);
  }
  return data.signedUrl;
}
