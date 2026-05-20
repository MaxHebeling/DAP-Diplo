"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(10),
  auth: z.string().min(10),
  userAgent: z.string().max(500).optional(),
});

export type PushActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Guarda la subscripción Web Push del alumno. Idempotente: si el endpoint
 * ya existe para el user, actualiza last_seen_at. RLS asegura que el
 * alumno solo puede tocar sus propias subscripciones.
 */
export async function subscribePushAction(
  input: z.infer<typeof subscribeSchema>,
): Promise<PushActionResult> {
  const parsed = subscribeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos de suscripción inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.p256dh,
        auth: parsed.data.auth,
        user_agent: parsed.data.userAgent ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,endpoint" },
    );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Desuscribe — borra el endpoint específico de este dispositivo.
 */
export async function unsubscribePushAction(
  endpoint: string,
): Promise<PushActionResult> {
  if (!endpoint || endpoint.length < 10) {
    return { ok: false, error: "Endpoint inválido" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
