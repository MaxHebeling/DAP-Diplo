import webpush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";
import { SECONDS_PER_DAY } from "@/lib/constants/time";

let vapidConfigured = false;

function configureVapid() {
  if (vapidConfigured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subject) {
    return false;
  }
  webpush.setVapidDetails(subject, pub, priv);
  vapidConfigured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
};

export type PushResult = {
  total: number;
  sent: number;
  failed: number;
  expiredCleaned: number;
};

/**
 * Envía push a TODAS las subscripciones de un user (puede tener varias:
 * laptop + celular + tablet). Si una subscripción devuelve 404/410, la
 * eliminamos (browser desinstaló la app o revoco permisos).
 *
 * Política de error: NO throw. Loguea y sigue. Devuelve resumen.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<PushResult> {
  if (!configureVapid()) {
    console.warn("[push] VAPID no configurado — skip send");
    return { total: 0, sent: 0, failed: 0, expiredCleaned: 0 };
  }

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) {
    return { total: 0, sent: 0, failed: 0, expiredCleaned: 0 };
  }

  const json = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  const expiredIds: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          json,
          { TTL: SECONDS_PER_DAY },
        );
        sent++;
      } catch (err) {
        failed++;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        // 404 Not Found / 410 Gone → subscription muerta, limpiar
        if (statusCode === 404 || statusCode === 410) {
          expiredIds.push(s.id);
        } else {
          console.error(
            `[push] ${userId} endpoint=${s.endpoint.slice(0, 60)}… falló: ${(err as Error).message}`,
          );
        }
      }
    }),
  );

  if (expiredIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", expiredIds);
  }

  // Update last_seen_at en las que sí salieron
  if (sent > 0) {
    await admin
      .from("push_subscriptions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("user_id", userId);
  }

  return {
    total: subs.length,
    sent,
    failed,
    expiredCleaned: expiredIds.length,
  };
}

/**
 * Envía push a un batch de userIds. Útil para broadcasts (live sessions
 * announcements). Procesado en paralelo limitado a 10 a la vez.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<{ totalUsers: number; sent: number; failed: number }> {
  let totalSent = 0;
  let totalFailed = 0;
  const BATCH = 10;
  for (let i = 0; i < userIds.length; i += BATCH) {
    const chunk = userIds.slice(i, i + BATCH);
    const results = await Promise.all(
      chunk.map((uid) => sendPushToUser(uid, payload)),
    );
    for (const r of results) {
      totalSent += r.sent;
      totalFailed += r.failed;
    }
  }
  return {
    totalUsers: userIds.length,
    sent: totalSent,
    failed: totalFailed,
  };
}
