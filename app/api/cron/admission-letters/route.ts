import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { generateAdmissionLetter } from "@/lib/admission/generate-letter";
import { uploadAdmissionLetter } from "@/lib/admission/storage";
import { sendAdmissionLetterEmail } from "@/lib/email/send-admission-letter";

// Necesitamos runtime nodejs para fs (cargar PNGs) y @react-pdf/renderer.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron firma con Bearer ${CRON_SECRET}. En prod exigimos coincidencia;
// en preview/dev dejamos pasar si no está configurado (para curl manual).
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return process.env.VERCEL_ENV !== "production";
  }
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${expected}`;
}

type AdmissionToProcess = {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  approved_at: string;
};

type ProfileMini = {
  matricula: string;
  program_start_date: string;
};

const BATCH_SIZE = 20;

/**
 * Cron handler: corre diario a las 15:00 UTC (08:00 PDT / 07:00 PST — San Diego)
 * configurado en vercel.json. Para cada admisión aprobada hace >=24h y
 * sin carta enviada:
 *   1) Lee matrícula + program_start_date del profile asociado.
 *   2) Genera PDF (@react-pdf/renderer + assets en /public/admission-assets).
 *   3) Sube a bucket admission-letters (path {userId}/{matricula}.pdf).
 *   4) Envía email al alumno con el PDF adjunto.
 *   5) Setea admission_letter_url + admission_letter_sent_at.
 *
 * Idempotente: el filtro WHERE admission_letter_sent_at IS NULL evita
 * doble envío. Si una pieza falla en el medio, en la próxima corrida
 * se reintenta (solo el envío de email es lo no-rollbackable, pero
 * Resend deduplica por idempotency key del payload).
 *
 * Batch máximo 20 por corrida para no agotar maxDuration en Vercel.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 1. Encontrar admisiones elegibles
  const cutoffIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: admissions, error: fetchErr } = await admin
    .from("admissions")
    .select("id, user_id, email, full_name, approved_at")
    .eq("status", "approved")
    .is("admission_letter_sent_at", null)
    .lte("approved_at", cutoffIso)
    .order("approved_at", { ascending: true })
    .limit(BATCH_SIZE)
    .returns<AdmissionToProcess[]>();

  if (fetchErr) {
    return NextResponse.json(
      { error: `db: ${fetchErr.message}` },
      { status: 500 },
    );
  }

  if (!admissions || admissions.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const results: Array<{
    admissionId: string;
    ok: boolean;
    error?: string;
  }> = [];

  for (const adm of admissions) {
    try {
      // Cargar matrícula + fecha de inicio del profile
      const { data: profile, error: profErr } = await admin
        .from("profiles")
        .select("matricula, program_start_date")
        .eq("id", adm.user_id)
        .maybeSingle<ProfileMini>();

      if (profErr) throw new Error(`profiles: ${profErr.message}`);
      if (!profile?.matricula || !profile.program_start_date) {
        throw new Error(
          `profile incompleto (matricula/program_start_date null) user=${adm.user_id}`,
        );
      }

      // Generar PDF
      const pdfBuffer = await generateAdmissionLetter({
        fullName: adm.full_name,
        matricula: profile.matricula,
        programStartDate: parseDateOnly(profile.program_start_date),
        issuedDate: new Date(),
      });

      // Subir a bucket
      const { path } = await uploadAdmissionLetter({
        userId: adm.user_id,
        matricula: profile.matricula,
        pdfBuffer,
      });

      // Enviar email con adjunto
      const emailRes = await sendAdmissionLetterEmail({
        to: adm.email,
        fullName: adm.full_name,
        matricula: profile.matricula,
        programStartDate: parseDateOnly(profile.program_start_date),
        pdfBuffer,
      });
      if (!emailRes.ok) {
        throw new Error(`resend: ${emailRes.error}`);
      }

      // Marcar como enviada
      const { error: updErr } = await admin
        .from("admissions")
        .update({
          admission_letter_url: path,
          admission_letter_sent_at: new Date().toISOString(),
        })
        .eq("id", adm.id);
      if (updErr) throw new Error(`update: ${updErr.message}`);

      results.push({ admissionId: adm.id, ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      console.error(
        `[cron/admission-letters] admission=${adm.id} failed: ${msg}`,
      );
      results.push({ admissionId: adm.id, ok: false, error: msg });
    }
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;

  return NextResponse.json({
    ok: true,
    processed: results.length,
    sent,
    failed,
    results,
  });
}

/**
 * Date columns en Postgres vienen como 'YYYY-MM-DD'. Si los pasamos a
 * `new Date()` el browser interpreta como UTC midnight y al formatear
 * en TZ local podría devolver el día anterior. Forzamos parse a local.
 */
function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map((s) => parseInt(s, 10));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
