"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";

export type ActionResult = { ok: true } | { ok: false; error: string };

const VALID_STATUSES = ["active", "inactive", "pending_review", "suspended", "closed"] as const;

export async function createChurchAction(fd: FormData): Promise<ActionResult> {
  const { admin } = await requireAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const name = String(fd.get("name") ?? "").trim();
  const country = String(fd.get("country") ?? "").trim() || null;
  const city = String(fd.get("city") ?? "").trim() || null;
  const status = String(fd.get("status") ?? "active");

  if (name.length < 2) return { ok: false, error: "Nombre muy corto." };
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return { ok: false, error: "Estado inválido." };
  }

  const service = createAdminClient();
  const { error } = await service.from("churches").insert({
    name,
    country,
    city,
    status,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/iglesias");
  return { ok: true };
}

export async function updateChurchAction(fd: FormData): Promise<ActionResult> {
  const { admin } = await requireAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const id = String(fd.get("id") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  const country = String(fd.get("country") ?? "").trim() || null;
  const city = String(fd.get("city") ?? "").trim() || null;
  const status = String(fd.get("status") ?? "");
  const notes = String(fd.get("notes") ?? "").trim() || null;

  if (!id) return { ok: false, error: "id faltante." };
  if (name.length < 2) return { ok: false, error: "Nombre muy corto." };
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return { ok: false, error: "Estado inválido." };
  }

  const service = createAdminClient();
  const { error } = await service
    .from("churches")
    .update({ name, country, city, status, notes })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/iglesias");
  return { ok: true };
}

export async function assignStudentChurchAction(fd: FormData): Promise<ActionResult> {
  const { admin } = await requireAdmin();
  if (!admin) return { ok: false, error: "No autorizado." };

  const userId = String(fd.get("user_id") ?? "");
  const churchId = String(fd.get("church_id") ?? "");
  if (!userId || !churchId) return { ok: false, error: "Datos incompletos." };

  const service = createAdminClient();
  // Propagar tanto en profiles como en admissions (para consistencia)
  const { error: pErr } = await service
    .from("profiles")
    .update({ church_id: churchId })
    .eq("id", userId);
  if (pErr) return { ok: false, error: pErr.message };

  await service
    .from("admissions")
    .update({ church_id: churchId })
    .eq("user_id", userId);

  revalidatePath("/admin/iglesias");
  return { ok: true };
}
