#!/usr/bin/env node
/**
 * One-off: dispara la carta de admisión PDF para una admission_id puntual.
 *
 * Mismo flow exacto que app/api/cron/admission-letters/route.ts pero
 * sin el filtro de "approved_at >= 24h ago". Útil cuando el cron diario
 * todavía no corrió y necesitas mandarla manualmente.
 *
 * Uso:
 *   pnpm tsx scripts/send-admission-letter.mjs <admission_id>
 *
 * Marca admission_letter_sent_at al terminar — no se vuelve a enviar
 * en la próxima corrida del cron (idempotente).
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

import { generateAdmissionLetter } from "../lib/admission/generate-letter.tsx";
import { uploadAdmissionLetter } from "../lib/admission/storage.ts";
import { sendAdmissionLetterEmail } from "../lib/email/send-admission-letter.ts";

const ADMISSION_ID = process.argv[2];
if (!ADMISSION_ID) {
  console.error("Uso: pnpm tsx scripts/send-admission-letter.mjs <admission_id>");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: adm, error: admErr } = await admin
  .from("admissions")
  .select("id, user_id, email, full_name, status, approved_at, admission_letter_sent_at")
  .eq("id", ADMISSION_ID)
  .maybeSingle();
if (admErr) throw new Error(`db admissions: ${admErr.message}`);
if (!adm) throw new Error(`admission ${ADMISSION_ID} no existe`);
if (adm.status !== "approved") throw new Error(`status=${adm.status} (debe ser approved)`);
if (adm.admission_letter_sent_at) {
  console.warn(`⚠ La carta YA fue enviada el ${adm.admission_letter_sent_at}. Continuando para re-enviar.`);
}

const { data: profile, error: profErr } = await admin
  .from("profiles")
  .select("matricula, program_start_date")
  .eq("id", adm.user_id)
  .maybeSingle();
if (profErr) throw new Error(`db profiles: ${profErr.message}`);
if (!profile?.matricula || !profile?.program_start_date) {
  throw new Error("profile sin matricula/program_start_date");
}

function parseDateOnly(iso) {
  const [y, m, d] = iso.split("-").map((s) => parseInt(s, 10));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

console.log(`→ Generando PDF para ${adm.full_name} (${profile.matricula})...`);
const pdfBuffer = await generateAdmissionLetter({
  fullName: adm.full_name,
  matricula: profile.matricula,
  programStartDate: parseDateOnly(profile.program_start_date),
  issuedDate: new Date(),
});
console.log(`  PDF ${(pdfBuffer.byteLength / 1024).toFixed(1)} KB`);

console.log(`→ Subiendo a bucket...`);
const { path } = await uploadAdmissionLetter({
  userId: adm.user_id,
  matricula: profile.matricula,
  pdfBuffer,
});
console.log(`  storage: ${path}`);

console.log(`→ Enviando email a ${adm.email}...`);
const emailRes = await sendAdmissionLetterEmail({
  to: adm.email,
  fullName: adm.full_name,
  matricula: profile.matricula,
  programStartDate: parseDateOnly(profile.program_start_date),
  pdfBuffer,
});
if (!emailRes.ok) throw new Error(`resend: ${emailRes.error}`);
console.log(`  email enviado (id=${emailRes.id ?? "—"})`);

const { error: updErr } = await admin
  .from("admissions")
  .update({
    admission_letter_url: path,
    admission_letter_sent_at: new Date().toISOString(),
  })
  .eq("id", adm.id);
if (updErr) throw new Error(`update: ${updErr.message}`);

console.log(`\n✓ Carta enviada a ${adm.email} con matrícula ${profile.matricula}`);
