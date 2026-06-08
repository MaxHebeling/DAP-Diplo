import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

type MarriageReg = {
  id: string;
  spouse_1_user_id: string | null;
  spouse_2_user_id: string | null;
  spouse_2_email: string;
  spouse_2_full_name: string;
  spouse_2_phone: string;
  spouse_2_province: string;
  spouse_2_ministry: string | null;
  marriage_group_id: string;
};

/**
 * Provisión idempotente de la cuenta del cónyuge 2 en una inscripción
 * matrimonio AR.
 *
 * Compartido entre webhook Stripe (legacy) y webhook Mercado Pago
 * (actual). Toma `marriage_group_id` y devuelve el `user_id` del
 * cónyuge 2 (creado si no existía, reusado si ya tenía cuenta).
 *
 * Acciones:
 *   1. Si `spouse_2_user_id` ya está en marriage_registrations → return.
 *   2. Si el email del cónyuge ya tiene cuenta auth → vincula esa.
 *   3. Si no → invite vía Admin API + magic link.
 *   4. Marca su profile con marriage_group_id + spouse_role + province + phone.
 *   5. **Hereda la admisión del matrimonio** (status='approved', matrícula
 *      nueva, program_start_date = mismo que spouse_1). Sin esto el spouse_2
 *      queda con admission_status='none' y el middleware le bloquea el
 *      dashboard pidiéndole llenar admisión. Bug detectado jun-2026
 *      (José Luis Tintez / María Ovando) y corregido sistémicamente acá.
 */
export async function provisionSpouse2ByMarriageGroup(
  marriageGroupId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data: reg, error: regErr } = await admin
    .from("marriage_registrations")
    .select(
      "id, spouse_1_user_id, spouse_2_user_id, spouse_2_email, spouse_2_full_name, spouse_2_phone, spouse_2_province, spouse_2_ministry, marriage_group_id",
    )
    .eq("marriage_group_id", marriageGroupId)
    .maybeSingle<MarriageReg>();

  if (regErr) {
    throw new Error(
      `provisionSpouse2: lookup falló marriage_group=${marriageGroupId}: ${regErr.message}`,
    );
  }
  if (!reg) {
    console.warn(
      `[provisionSpouse2] marriage_group=${marriageGroupId} no encontrado`,
    );
    return null;
  }

  if (reg.spouse_2_user_id) {
    // Aun si ya estaba provisionado, verificamos que tenga admission.
    // Si por algún historial pasado le falta, la creamos.
    await ensureSpouse2Admission(admin, reg.spouse_2_user_id, reg);
    return reg.spouse_2_user_id;
  }

  const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(
    reg.spouse_2_email,
    {
      data: {
        full_name: reg.spouse_2_full_name,
        ministry_name: reg.spouse_2_ministry,
        country: "Argentina",
        country_code: "AR",
        phone: reg.spouse_2_phone,
        province: reg.spouse_2_province,
        spouse_role: "spouse_2",
        marriage_group_id: reg.marriage_group_id,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    },
  );

  if (invErr) {
    const lower = invErr.message.toLowerCase();
    if (lower.includes("already") || lower.includes("registered")) {
      const { data: existing } = await admin.rpc("get_user_id_by_email", {
        p_email: reg.spouse_2_email,
      });
      const existingId =
        typeof existing === "string"
          ? existing
          : Array.isArray(existing)
            ? (existing[0] as { id?: string })?.id ?? null
            : null;
      if (existingId) {
        await admin
          .from("profiles")
          .update({
            marriage_group_id: reg.marriage_group_id,
            spouse_role: "spouse_2",
            province: reg.spouse_2_province,
            phone: reg.spouse_2_phone,
          })
          .eq("id", existingId);
        await admin
          .from("marriage_registrations")
          .update({
            spouse_2_user_id: existingId,
            spouse_2_provisioned_at: new Date().toISOString(),
          })
          .eq("id", reg.id);
        await ensureSpouse2Admission(admin, existingId, reg);
        return existingId;
      }
    }
    throw new Error(
      `provisionSpouse2: invite falló (${reg.spouse_2_email}): ${invErr.message}`,
    );
  }

  const spouse2UserId = invited?.user?.id;
  if (!spouse2UserId) {
    throw new Error(
      `provisionSpouse2: invite no devolvió user.id para ${reg.spouse_2_email}`,
    );
  }

  await admin
    .from("profiles")
    .update({
      marriage_group_id: reg.marriage_group_id,
      spouse_role: "spouse_2",
      province: reg.spouse_2_province,
      phone: reg.spouse_2_phone,
    })
    .eq("id", spouse2UserId);

  await admin
    .from("marriage_registrations")
    .update({
      spouse_2_user_id: spouse2UserId,
      spouse_2_provisioned_at: new Date().toISOString(),
      spouse_2_invite_sent_at: new Date().toISOString(),
    })
    .eq("id", reg.id);

  await ensureSpouse2Admission(admin, spouse2UserId, reg);

  return spouse2UserId;
}

/**
 * Garantiza que el spouse_2 tenga admission='approved', matrícula
 * asignada y program_start_date (heredado del spouse_1 si está
 * disponible — los matrimonios arrancan juntos).
 *
 * Idempotente: si ya tiene admission, no toca nada.
 *
 * Sin esta función el matrimonio paga, el spouse_1 entra al dashboard
 * y el spouse_2 queda colgado en /admision pidiéndole datos que ya
 * fueron declarados en el formulario matrimonio. Bug ya histórico en
 * el flow — corregido jun-2026.
 */
async function ensureSpouse2Admission(
  admin: SupabaseClient,
  spouse2UserId: string,
  reg: MarriageReg,
): Promise<void> {
  // Idempotencia: si ya tiene admission, no hacemos nada.
  const { data: existingAdm } = await admin
    .from("admissions")
    .select("id")
    .eq("user_id", spouse2UserId)
    .maybeSingle<{ id: string }>();
  if (existingAdm) return;

  // Heredar program_start_date del spouse_1 (matrimonios arrancan juntos).
  // Si por alguna razón el spouse_1 no tiene fecha, dejamos que el cron de
  // admisión la calcule al aprobar — caemos a null y el caller decide.
  let programStartDate: string | null = null;
  if (reg.spouse_1_user_id) {
    const { data: spouse1Profile } = await admin
      .from("profiles")
      .select("program_start_date")
      .eq("id", reg.spouse_1_user_id)
      .maybeSingle<{ program_start_date: string | null }>();
    programStartDate = spouse1Profile?.program_start_date ?? null;
  }

  // Reservar matrícula nueva atómicamente vía RPC.
  const { data: matriculaData, error: matriculaErr } = await admin.rpc(
    "next_admission_matricula",
  );
  if (matriculaErr) {
    console.error(
      `[provisionSpouse2] next_admission_matricula falló para ${spouse2UserId}: ${matriculaErr.message}`,
    );
    return;
  }
  const matricula =
    typeof matriculaData === "string" ? matriculaData : null;
  if (!matricula) {
    console.error(
      `[provisionSpouse2] matrícula vacía para ${spouse2UserId}`,
    );
    return;
  }

  const nowIso = new Date().toISOString();

  // Crear admission con status='approved' (hereda aprobación del
  // matrimonio que ya fue aprobado al pagar).
  const { error: admErr } = await admin.from("admissions").insert({
    user_id: spouse2UserId,
    full_name: reg.spouse_2_full_name,
    country: "Argentina",
    phone: reg.spouse_2_phone,
    email: reg.spouse_2_email,
    city: reg.spouse_2_province,
    ministry_name: reg.spouse_2_ministry,
    status: "approved",
    submitted_at: nowIso,
    approved_at: nowIso,
    reviewed_at: nowIso,
  });
  if (admErr) {
    console.error(
      `[provisionSpouse2] insert admission falló para ${spouse2UserId}: ${admErr.message}`,
    );
    return;
  }

  // Actualizar profile: matrícula + admission_status + program_start_date.
  const { error: profErr } = await admin
    .from("profiles")
    .update({
      admission_status: "approved",
      matricula,
      ...(programStartDate ? { program_start_date: programStartDate } : {}),
    })
    .eq("id", spouse2UserId);
  if (profErr) {
    console.error(
      `[provisionSpouse2] update profile falló para ${spouse2UserId}: ${profErr.message}`,
    );
  }
}
