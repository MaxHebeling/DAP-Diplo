import { CalendarClock, Sparkles } from "lucide-react";
import { getLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { localized } from "@/lib/i18n/localized";
import type { Locale } from "@/i18n/config";
import { formatDapLongDate } from "@/lib/calendar/week";
import { redirect } from "@/i18n/navigation";
import { signOutAction } from "@/lib/auth/actions";
import { DapStudentShell } from "@/components/layouts/dap-student-shell";

export const metadata = { title: "Currículum · DAP" };
export const dynamic = "force-dynamic";

type BlockRow = {
  id: string;
  slug: string;
  order_index: number;
  title: string;
  title_en: string | null;
  brand_name: string | null;
  brand_name_en: string | null;
  promise: string | null;
  promise_en: string | null;
};

type ModuleRow = {
  id: string;
  slug: string;
  order_index: number;
  course_week: number;
  title: string;
  title_en: string | null;
  block_id: string;
};

const MODULE_EMOJIS: Record<string, string> = {
  // Bloque 1
  "Reino de Dios": "👑",
  "Identidad en Cristo": "✝️",
  "Espíritu Santo": "🕊️",
  "Oración e intercesión": "🙏",
  "Autoridad espiritual": "⚡",
  "Cultura del Reino": "🏛️",
  Discipulado: "👥",
  "Intimidad con Dios": "💛",
  // Bloque 2
  "Espíritu de hijo": "👨‍👦",
  "Identidad ministerial": "🎯",
  "Sanidad emocional": "💗",
  "Carácter e integridad": "🛡️",
  "Mentalidad de Reino": "🧠",
  "Procesos formativos": "⏳",
  "Vida familiar": "🏡",
  "Legado personal": "🌳",
  // Bloque 3
  "Liderazgo bíblico": "📖",
  "Cómo levantar líderes": "🌟",
  "Cómo discipular": "🤝",
  "Multiplicación de líderes": "✖️",
  "Cultura de equipos": "👥",
  "Visión y dirección": "🧭",
  "Delegación y desarrollo": "📤",
  "Cultura de honra": "🤲",
  // Bloque 4
  "Pastorado integral": "💚",
  "Predicación y homilética": "🎙️",
  "Consejería pastoral": "💬",
  "Cobertura y mentoría": "🛡️",
  "Lo profético y sensibilidad espiritual": "👁️",
  "Manejo de crisis pastorales": "🚨",
  "Liberación y sanidad": "💧",
  "Casas de paz y discipulado en hogares": "🏠",
  // Bloque 5
  "Administración ministerial": "🗂️",
  "Sistemas y procesos": "⚙️",
  "Planeación estratégica": "📊",
  "Presupuestos y gestión financiera": "💰",
  "Legalidad y fundaciones": "📜",
  "Gestión de equipos y voluntarios": "👷",
  "Cultura organizacional": "🏢",
  "KPIs ministeriales": "📈",
  // Bloque 6
  "Economía bíblica": "💎",
  Mayordomía: "🗝️",
  "Finanzas personales": "💵",
  "Libertad financiera": "🕊️",
  "Finanzas ministeriales": "⛪",
  "Prosperidad bíblica": "🌟",
  "Múltiples fuentes de ingreso": "🌊",
  "Mentalidad de Reino vs mentalidad de pobreza": "🧠",
  // Bloque 7
  "Negocios del Reino": "🏗️",
  "Emprendimiento apostólico": "🚀",
  "Marca personal y branding": "🎨",
  "Marketing y ventas": "📣",
  "Modelos de negocio": "🧩",
  "Liderazgo empresarial": "👔",
  "Escalabilidad y expansión": "📊",
  "Influencia cultural": "🌍",
  // Bloque 8
  "IA aplicada al ministerio": "🤖",
  "Automatización pastoral": "⚡",
  "Producción audiovisual y streaming": "🎬",
  "Comunicación digital de impacto": "💬",
  "Storytelling y narrativa apostólica": "📖",
  "Marca y presencia digital": "📱",
  "CRM ministerial y gestión de datos": "🗄️",
  "Evangelismo digital": "🌐",
  // Bloque 9
  "Gobierno apostólico": "🏛️",
  "Cultura apostólica": "🕊️",
  "Reforma y transformación cultural": "🔥",
  "Plantación de iglesias": "⛪",
  "Misiones globales": "🌎",
  "Sucesión y legado generacional": "🤝",
  "Estrategias de Reino": "♟️",
  "Comisionamiento final": "🎓",
};

export default async function ProgramaPage() {
  const supabase = await createClient();
  const locale = (await getLocale()) as Locale;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect({ href: "/login?redirectTo=/programa", locale });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, program_start_date")
    .eq("id", user.id)
    .maybeSingle<{
      full_name: string;
      avatar_url: string | null;
      program_start_date: string | null;
    }>();

  const { data: cw } = await supabase.rpc("current_program_week", {
    p_user_id: user.id,
  });
  const currentWeek = typeof cw === "number" ? cw : 0;
  const programStartDate = profile?.program_start_date ?? null;
  const startDateIso = programStartDate ?? "2026-06-23";

  const [{ data: blocks }, { data: modules }] = await Promise.all([
    supabase
      .from("blocks")
      .select(
        "id, slug, order_index, title, title_en, brand_name, brand_name_en, promise, promise_en",
      )
      .order("order_index", { ascending: true })
      .returns<BlockRow[]>(),
    supabase
      .from("modules")
      .select(
        "id, slug, order_index, course_week, title, title_en, block_id",
      )
      .order("course_week", { ascending: true })
      .returns<ModuleRow[]>(),
  ]);

  const modulesByBlock = new Map<string, ModuleRow[]>();
  for (const m of modules ?? []) {
    const list = modulesByBlock.get(m.block_id) ?? [];
    list.push(m);
    modulesByBlock.set(m.block_id, list);
  }

  const totalModules = modules?.length ?? 0;

  return (
    <DapStudentShell
      userName={profile?.full_name ?? "Alumno"}
      userAvatar={profile?.avatar_url ?? null}
      title="Currículum"
      onSignOut={signOutAction}
    >
    <main className="mx-auto max-w-5xl space-y-8 px-5 py-8 sm:px-8">
      {/* Hero */}
      <header className="rounded-2xl border bg-gradient-to-br from-brand-violet/[0.08] via-card to-brand-coral/[0.05] p-8 sm:p-10">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-brand-coral" strokeWidth={2} />
          <p className="font-inter text-[10px] font-bold uppercase tracking-[0.4em] text-brand-coral">
            El camino completo
          </p>
        </div>
        <h1 className="mt-3 font-grotesk text-3xl font-bold leading-tight text-text-primary sm:text-4xl">
          Currículum del DAP
        </h1>
        <p className="mt-3 max-w-2xl font-inter text-base leading-relaxed text-text-secondary">
          9 dimensiones de la unción apostólica. 72 módulos. 18 meses de
          formación. Cada martes a las 00:01 se abre un módulo nuevo y
          recibís activación práctica con feedback en 48h.
        </p>
        <div className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-full border border-brand-violet/30 bg-brand-violet/10 px-3 py-1.5">
          <CalendarClock className="size-3.5 text-brand-violet" />
          <p className="font-inter text-xs font-medium text-brand-violet">
            Inicio del programa:{" "}
            <strong className="font-semibold text-text-primary">
              {formatDapLongDate(new Date(`${startDateIso}T12:00:00`))}
            </strong>
          </p>
        </div>
      </header>

      {/* Bloques */}
      <div className="space-y-8">
        {(blocks ?? []).map((block) => {
          const blockModules = modulesByBlock.get(block.id) ?? [];
          const blockTitle = localized(block, "title", locale) ?? block.title;
          const brandName = localized(block, "brand_name", locale) ?? block.brand_name;
          const promise = localized(block, "promise", locale) ?? block.promise;

          return (
            <section
              key={block.id}
              className="overflow-hidden rounded-2xl border bg-card"
            >
              <header className="border-b bg-gradient-to-br from-brand-violet/[0.04] to-brand-coral/[0.03] p-6 sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="bg-gradient-to-br from-brand-violet to-brand-coral bg-clip-text font-grotesk text-5xl font-extrabold leading-none text-transparent sm:text-6xl">
                    {String(block.order_index).padStart(2, "0")}
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <p className="font-inter text-[10px] font-bold uppercase tracking-[0.32em] text-brand-coral">
                      Bloque {block.order_index}
                    </p>
                    <h2 className="mt-1.5 flex flex-wrap items-baseline gap-3 font-grotesk text-xl font-bold text-text-primary sm:text-2xl">
                      {blockTitle}
                      {brandName && (
                        <span className="rounded-full bg-brand-violet/10 px-2.5 py-1 font-inter text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-violet">
                          {brandName}
                        </span>
                      )}
                    </h2>
                    {promise && (
                      <p className="mt-2 font-inter text-sm italic leading-relaxed text-text-secondary">
                        &ldquo;{promise}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              </header>

              <ul className="divide-y">
                {blockModules.map((m) => {
                  const moduleTitle =
                    localized(m, "title", locale) ?? m.title;
                  const emoji = MODULE_EMOJIS[m.title] ?? "📘";
                  const opensAt = addWeeks(startDateIso, m.course_week - 1);
                  const status = moduleStatus(m.course_week, currentWeek);

                  return (
                    <li
                      key={m.id}
                      className="grid grid-cols-[36px_1fr_auto] items-center gap-3 px-5 py-3 sm:grid-cols-[40px_90px_1fr_auto] sm:gap-4 sm:px-7 sm:py-3.5"
                    >
                      <span
                        aria-hidden
                        className="text-center text-xl sm:text-2xl"
                      >
                        {emoji}
                      </span>
                      <span className="hidden font-inter text-xs font-semibold tabular-nums text-brand-coral sm:inline">
                        {opensAt}
                      </span>
                      <span className="font-inter text-sm font-medium leading-snug text-text-primary sm:text-base">
                        {moduleTitle}
                        <span className="ml-2 inline font-mono text-[10px] text-text-tertiary sm:hidden">
                          {opensAt}
                        </span>
                      </span>
                      <ModuleStatusBadge status={status} />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Footer info */}
      <footer className="rounded-2xl border bg-card p-6 sm:p-7">
        <p className="font-inter text-xs uppercase tracking-[0.32em] text-text-tertiary">
          Resumen
        </p>
        <p className="mt-2 font-inter text-sm leading-relaxed text-text-secondary">
          <strong className="font-semibold text-text-primary">
            {totalModules} módulos · {blocks?.length ?? 0} dimensiones · 18 meses
          </strong>
          . Cada módulo incluye 5 secciones: introducción, enseñanza en
          video, activación práctica, evaluación e impartación. Las
          MasterClasses en vivo se realizan una vez al mes.
        </p>
      </footer>
    </main>
    </DapStudentShell>
  );
}

type ModuleStatus = "open" | "review" | "locked";

function moduleStatus(moduleWeek: number, currentWeek: number): ModuleStatus {
  if (currentWeek === 0) return "locked";
  if (moduleWeek === currentWeek) return "open";
  if (moduleWeek < currentWeek) return "review";
  return "locked";
}

function ModuleStatusBadge({ status }: { status: ModuleStatus }) {
  const map: Record<ModuleStatus, { label: string; classes: string }> = {
    open: {
      label: "Esta semana",
      classes: "bg-brand-coral/10 text-brand-coral border-brand-coral/30",
    },
    review: {
      label: "Disponible",
      classes:
        "bg-emerald-400/10 text-emerald-400 border-emerald-400/30",
    },
    locked: {
      label: "Próximamente",
      classes:
        "bg-muted text-text-tertiary border-white/10",
    },
  };
  const it = map[status];
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 font-inter text-[10px] font-semibold uppercase tracking-wider ${it.classes}`}
    >
      {it.label}
    </span>
  );
}

/**
 * Suma `weeks` semanas a una fecha ISO `YYYY-MM-DD` y devuelve formato corto
 * `dd/mm/yyyy`. Útil para mostrar la fecha proyectada de apertura de cada
 * módulo basándose en el `program_start_date` del alumno.
 */
function addWeeks(isoDate: string, weeks: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return "";
  const [, y, mo, d] = m;
  const base = new Date(Number(y), Number(mo) - 1, Number(d));
  base.setDate(base.getDate() + weeks * 7);
  const dd = String(base.getDate()).padStart(2, "0");
  const mm = String(base.getMonth() + 1).padStart(2, "0");
  const yy = base.getFullYear();
  return `${dd}/${mm}/${yy}`;
}
