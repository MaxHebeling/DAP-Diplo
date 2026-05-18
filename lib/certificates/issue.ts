import { createAdminClient } from "@/lib/supabase/admin";
import { generateCertificate } from "@/lib/certificates/generate";
import {
  certificateStoragePath,
  uploadCertificatePdf,
} from "@/lib/certificates/upload";
import { sendCertificateEmail } from "@/lib/email/send-certificate";

/**
 * Genera el PDF, lo sube a Storage y actualiza certificates.pdf_url.
 * Idempotente: si pdf_url ya está poblado, no regenera.
 * Devuelve el path final dentro del bucket.
 *
 * Llamado desde quiz submit API después de que complete_block_if_done()
 * inserte el certificate.
 */
export async function issueCertificatePdf(
  certificateId: string,
): Promise<{ path: string; skipped?: boolean }> {
  const admin = createAdminClient();

  // Carga datos para el PDF en una sola query
  const { data: cert, error } = await admin
    .from("certificates")
    .select(
      `id, user_id, verification_code, pdf_url, issued_at,
       user:profiles!certificates_user_id_fkey(full_name),
       block:blocks!certificates_block_id_fkey(order_index, title),
       rank:ranks!certificates_rank_id_fkey(name)`,
    )
    .eq("id", certificateId)
    .maybeSingle<{
      id: string;
      user_id: string;
      verification_code: string;
      pdf_url: string | null;
      issued_at: string;
      user: { full_name: string } | null;
      block: { order_index: number; title: string } | null;
      rank: { name: string } | null;
    }>();
  if (error || !cert) {
    throw new Error(
      `Certificado ${certificateId} no encontrado: ${error?.message ?? "missing"}`,
    );
  }

  // Idempotente: si ya hay pdf_url, no regenera PDF — pero igual intenta
  // enviar el email (sendCertificateEmail es idempotente vía email_sent_at,
  // así que reintentos solo cubren el caso de email fallido en intento previo).
  if (cert.pdf_url) {
    const retry = await sendCertificateEmail(cert.id);
    if (!retry.ok) {
      console.error(
        "[issueCertificatePdf] reintento de email falló:",
        retry.error,
      );
    }
    return { path: cert.pdf_url, skipped: true };
  }
  if (!cert.user || !cert.block || !cert.rank) {
    throw new Error(
      `Certificado ${certificateId} incompleto (faltan user/block/rank).`,
    );
  }

  const pdf = await generateCertificate({
    fullName: cert.user.full_name,
    blockOrderIndex: cert.block.order_index,
    blockTitle: cert.block.title,
    rankName: cert.rank.name,
    verificationCode: cert.verification_code,
    issuedAt: new Date(cert.issued_at),
  });

  const expectedPath = certificateStoragePath(cert.user_id, cert.id);
  const { path } = await uploadCertificatePdf(cert.user_id, cert.id, pdf);

  const { error: updateErr } = await admin
    .from("certificates")
    .update({ pdf_url: path })
    .eq("id", cert.id);
  if (updateErr) {
    throw new Error(
      `No se pudo actualizar certificates.pdf_url: ${updateErr.message}`,
    );
  }

  // Email al alumno. Fail-soft: si Resend falla el certificado ya está
  // emitido y el PDF subido — solo logueamos. sendCertificateEmail es
  // idempotente vía email_sent_at, así que re-ejecutar issueCertificatePdf
  // no genera duplicados.
  const emailResult = await sendCertificateEmail(cert.id);
  if (!emailResult.ok) {
    console.error(
      "[issueCertificatePdf] email falló:",
      emailResult.error,
    );
  }

  return { path: path ?? expectedPath };
}
