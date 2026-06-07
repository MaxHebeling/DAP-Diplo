import type { SupabaseClient } from "@supabase/supabase-js";

import { DAP_TZ } from "@/lib/calendar/week";

export type ProfileRow = {
  full_name: string;
  ministry_name: string | null;
  country: string | null;
  avatar_url: string | null;
  role: "student" | "admin";
  program_start_date: string | null;
  matricula: string | null;
};

export type SubscriptionRow = {
  id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
};

export type ModuleRow = {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  subtitle: string | null;
  subtitle_en: string | null;
  course_week: number;
  block: {
    slug: string;
    title: string;
    title_en: string | null;
    order_index: number;
  } | null;
};

export type ModuleProgressRow = {
  module_id: string;
  completed: boolean;
};

export type WeekWindowRow = {
  opens_at: string | null;
  closes_at: string | null;
  course_week: number;
};

/**
 * Carga el perfil del alumno. Throw si no existe (es un invariant —
 * el trigger handle_new_user lo crea siempre con el signup).
 */
export async function loadProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileRow> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "full_name, ministry_name, country, avatar_url, role, program_start_date, matricula",
    )
    .eq("id", userId)
    .maybeSingle<ProfileRow>();
  if (error) throw new Error(`No se pudo cargar perfil: ${error.message}`);
  if (!profile) throw new Error("Tu perfil no existe en la base de datos.");
  return profile;
}

/**
 * Carga la subscription más reciente del alumno (puede ser null si nunca
 * se suscribió). Devuelve también `hasActive` ya calculado contra el
 * current_period_end vs now().
 */
export async function loadSubscription(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ sub: SubscriptionRow | null; hasActive: boolean }> {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select(
      "id, status, current_period_end, cancel_at_period_end, canceled_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionRow>();

  const hasActive =
    !!sub &&
    (sub.status === "active" || sub.status === "trialing") &&
    (sub.current_period_end === null ||
      new Date(sub.current_period_end) > new Date());

  return { sub: sub ?? null, hasActive };
}

export type WeekDashboardData = {
  currentWeek: number;
  closesAt: Date | null;
  allModules: ModuleRow[];
  currentModule: ModuleRow | null;
  pastModules: ModuleRow[];
  upcomingModules: ModuleRow[];
  progressById: Map<string, boolean>;
  completedCount: number;
  completionPct: number;
};

/**
 * Carga el contexto completo del WeekDashboard:
 *  - Semana actual (RPC current_week_window)
 *  - Todos los módulos (72 — orden por course_week)
 *  - Progreso del alumno
 *  - Cómputos derivados: módulo de la semana, 6 pasados, 3 próximos,
 *    contadores de completados.
 *
 * Si currentWeek === 0, los listados quedan vacíos — el caller renderiza
 * el estado <NotStartedYet>.
 */
export async function loadWeekDashboardData(
  supabase: SupabaseClient,
  userId: string,
): Promise<WeekDashboardData> {
  const { data: weekWindowData } = await supabase
    .rpc("current_week_window", { p_user_id: userId })
    .single<WeekWindowRow>();

  const currentWeek = weekWindowData?.course_week ?? 0;
  const closesAt = weekWindowData?.closes_at
    ? new Date(weekWindowData.closes_at)
    : null;

  if (currentWeek === 0) {
    return {
      currentWeek: 0,
      closesAt: null,
      allModules: [],
      currentModule: null,
      pastModules: [],
      upcomingModules: [],
      progressById: new Map(),
      completedCount: 0,
      completionPct: 0,
    };
  }

  const [modulesRes, progressRes] = await Promise.all([
    supabase
      .from("modules")
      .select(
        "id, slug, title, title_en, subtitle, subtitle_en, course_week, block:blocks(slug, title, title_en, order_index)",
      )
      .order("course_week", { ascending: true })
      .returns<ModuleRow[]>(),
    supabase
      .from("module_progress")
      .select("module_id, completed")
      .eq("user_id", userId)
      .returns<ModuleProgressRow[]>(),
  ]);

  const allModules = modulesRes.data ?? [];
  const progressRows = progressRes.data ?? [];

  const progressById = new Map<string, boolean>(
    progressRows.map((p) => [p.module_id, p.completed]),
  );
  const currentModule =
    allModules.find((m) => m.course_week === currentWeek) ?? null;
  const pastModules = allModules
    .filter((m) => m.course_week < currentWeek)
    .reverse()
    .slice(0, 6);
  const upcomingModules = allModules
    .filter((m) => m.course_week > currentWeek)
    .slice(0, 3);

  const completedCount = progressRows.filter((p) => p.completed).length;
  const completionPct = Math.round((completedCount / 72) * 100);

  return {
    currentWeek,
    closesAt,
    allModules,
    currentModule,
    pastModules,
    upcomingModules,
    progressById,
    completedCount,
    completionPct,
  };
}

/**
 * Formatea fechas de facturación en TZ DAP (San Diego). Usado por el
 * panel de subscripción ("se cancela el dd de mm" / "próximo cobro").
 */
export function formatBillingDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: DAP_TZ,
  });
}
