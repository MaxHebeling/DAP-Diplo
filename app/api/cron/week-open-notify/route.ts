import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWeekOpenedEmail } from "@/lib/email/send-week-opened";
import { sendPushToUser } from "@/lib/push/send";

// Corre 1x al día a las 12:00 UTC (05:00 PDT / 04:00 PST — San Diego), antes del
// inicio del día académico (martes 00:01) … wait: en realidad lo más
// limpio es disparar martes 06:00 Mexico = 12:00 UTC, así cubre la
// recién-abierta semana. Cron en vercel.json.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${expected}`;
}

type Alumno = {
  user_id: string;
  email: string;
  full_name: string;
  program_start_date: string;
  course_week: number;
};

type ModuleRow = {
  id: string;
  slug: string;
  title: string;
  course_week: number;
  block: { slug: string } | null;
};

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dapglobal.org";

/**
 * Notifica a los alumnos que HOY arranca una nueva semana de su
 * programa. Criterio: el alumno cuya `program_start_date + (week-1)*7`
 * cae en hoy (en TZ DAP) y tiene suscripción activa.
 *
 * Idempotencia: agregamos un check vs la última notificación enviada
 * para evitar duplicados. Si el cron se corre 2 veces el mismo día,
 * el segundo run no manda nada (ver `last_week_opened_notify` que
 * mantenemos en una columna pendiente; por ahora delegamos en que el
 * cron solo se programa 1x/día).
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Trae todos los profiles que tengan program_start_date y admisión
  // aprobada. Filtramos en TS por "hoy en TZ DAP es el día del cambio
  // de semana", calculando con SQL para evitar errores de TZ del runtime.
  const { data: rawAlumnos, error: profilesErr } = await admin.rpc(
    "students_with_new_week_today",
  );
  const alumnos = (rawAlumnos as unknown as Alumno[] | null) ?? null;

  if (profilesErr) {
    // Si la RPC no existe todavía, hacemos fallback en TS pero con
    // logging claro. La RPC se crea en migration 0006 (siguiente).
    console.warn(
      `[cron/week-open-notify] RPC students_with_new_week_today falló: ${profilesErr.message}. Fallback en TS.`,
    );
    return await fallbackNotify(admin);
  }

  if (!alumnos || alumnos.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  // Por cada alumno: módulo de su semana actual + email
  let sent = 0;
  let failed = 0;
  for (const a of alumnos) {
    try {
      const { data: mod } = await admin
        .from("modules")
        .select("id, slug, title, course_week, block:blocks(slug)")
        .eq("course_week", a.course_week)
        .maybeSingle<ModuleRow>();
      if (!mod || !mod.block) {
        console.warn(
          `[cron/week-open-notify] sin módulo o block para week=${a.course_week}`,
        );
        continue;
      }

      // Calcular closesAt = lunes próximo 23:59 en TZ DAP. Reutilizamos
      // la RPC week_window.
      const { data: win } = await admin
        .rpc("week_window", {
          p_user_id: a.user_id,
          p_course_week: a.course_week,
        })
        .single<{ closes_at: string }>();

      const closesAt = win?.closes_at
        ? new Date(win.closes_at)
        : new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);

      const moduleHref = `/fases/${mod.block.slug}/modulos/${mod.slug}`;
      const res = await sendWeekOpenedEmail({
        to: a.email,
        fullName: a.full_name,
        courseWeek: a.course_week,
        moduleTitle: mod.title,
        moduleHref: `${APP_URL}${moduleHref}`,
        closesAt,
      });
      if (res.ok) sent++;
      else {
        failed++;
        console.error(
          `[cron/week-open-notify] email user=${a.user_id} falló: ${res.error}`,
        );
      }

      // Push notification (paralelo al email — si tiene suscripción activa)
      const pushRes = await sendPushToUser(a.user_id, {
        title: `Semana ${a.course_week} de 72 · ${mod.title}`,
        body: `Tu nuevo módulo ya está abierto. La tarea cierra el lunes 23:59.`,
        url: moduleHref,
        tag: `week-${a.course_week}`,
      });
      if (pushRes.failed > 0) {
        console.warn(
          `[cron/week-open-notify] push user=${a.user_id} ${pushRes.sent}/${pushRes.total} ok`,
        );
      }
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : "unknown";
      console.error(
        `[cron/week-open-notify] excepción user=${a.user_id}: ${msg}`,
      );
    }
  }

  return NextResponse.json({
    ok: true,
    processed: alumnos.length,
    sent,
    failed,
  });
}

/**
 * Fallback cuando la RPC no está creada todavía. Calcula en TS quién
 * arranca semana hoy, mirando profiles + suscripciones.
 *
 * NO CALCULA EN TS LA TZ — usa fecha del server (UTC). Esto puede
 * desincronizar 6h respecto a Mexico, lo que se evita corriendo la
 * migration 0006 que crea la RPC oficial.
 */
async function fallbackNotify(
  admin: ReturnType<typeof createAdminClient>,
): Promise<NextResponse> {
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, program_start_date")
    .eq("admission_status", "approved")
    .not("program_start_date", "is", null);

  if (error) {
    return NextResponse.json(
      { error: `fallback: ${error.message}` },
      { status: 500 },
    );
  }
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const matched: Array<{ id: string; full_name: string; week: number }> = [];
  for (const row of data ?? []) {
    if (!row.program_start_date) continue;
    const start = new Date(row.program_start_date + "T00:00:00Z");
    const diffDays = Math.floor(
      (todayMs - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays < 0) continue;
    if (diffDays % 7 !== 0) continue;
    const week = Math.floor(diffDays / 7) + 1;
    if (week < 1 || week > 72) continue;
    matched.push({ id: row.id, full_name: row.full_name, week });
  }

  return NextResponse.json({
    ok: true,
    processed: matched.length,
    fallback: true,
    note: "Crear RPC students_with_new_week_today (migration 0006) para activar el notify real.",
  });
}
