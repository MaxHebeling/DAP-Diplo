import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Provisión idempotente de la cuenta del cónyuge 2 en una inscripción
 * matrimonio AR.
 *
 * Compartido entre webhook Stripe (legacy) y webhook Mercado Pago
 * (actual). Toma `marriage_group_id` y devuelve el `user_id` del
 * cónyuge 2 (creado si no existía, reusado si ya tenía cuenta).
 *
 * - Si `spouse_2_user_id` ya está en marriage_registrations → return.
 * - Si el email del cónyuge ya tiene cuenta auth → vincula esa.
 * - Si no → invite vía Admin API + magic link.
 *
 * Pone marriage_group_id + spouse_role + province + phone en su profile.
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
    .maybeSingle<{
      id: string;
      spouse_1_user_id: string | null;
      spouse_2_user_id: string | null;
      spouse_2_email: string;
      spouse_2_full_name: string;
      spouse_2_phone: string;
      spouse_2_province: string;
      spouse_2_ministry: string | null;
      marriage_group_id: string;
    }>();

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

  return spouse2UserId;
}
