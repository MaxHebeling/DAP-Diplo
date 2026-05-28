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

// Gradientes únicos por bloque, estilo Netflix posters
const BLOCK_ACCENTS = [
  "from-violet-600 via-fuchsia-700 to-rose-700",
  "from-pink-600 via-rose-700 to-orange-700",
  "from-indigo-700 via-purple-700 to-fuchsia-700",
  "from-rose-700 via-pink-700 to-fuchsia-800",
  "from-violet-800 via-indigo-800 to-blue-900",
  "from-amber-700 via-orange-700 to-rose-800",
  "from-emerald-700 via-teal-700 to-cyan-800",
  "from-cyan-700 via-sky-700 to-violet-800",
  "from-yellow-600 via-amber-700 to-rose-800",
];

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
    <main className="mx-auto max-w-7xl space-y-10 bg-[#020410] px-5 py-8 sm:px-8">
      {/* Hero oscuro */}
      <header className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#04081A] p-8 sm:p-10">
        {/* Halos decorativos */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-brand-violet/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-16 size-56 rounded-full bg-brand-coral/15 blur-3xl"
        />
        <div className="relative">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand-coral" strokeWidth={2} />
            <p className="font-inter text-[10px] font-bold uppercase tracking-[0.4em] text-brand-coral">
              El camino completo
            </p>
          </div>
          <h1 className="mt-3 bg-gradient-to-br from-white via-white/95 to-white/70 bg-clip-text font-grotesk text-3xl font-bold leading-tight text-transparent sm:text-4xl">
            Currículum del DAP
          </h1>
          <p className="mt-3 max-w-2xl font-inter text-base leading-relaxed text-white/70">
            9 dimensiones de la unción apostólica. 72 módulos. 18 meses de
            formación. Cada martes a las 00:01 se abre un módulo nuevo y
            recibís activación práctica con feedback en 48h.
          </p>
          <div className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-full border border-brand-violet/40 bg-brand-violet/15 px-3 py-1.5 backdrop-blur">
            <CalendarClock className="size-3.5 text-brand-violet" />
            <p className="font-inter text-xs font-medium text-brand-violet">
              Inicio del programa:{" "}
              <strong className="font-semibold text-white">
                {formatDapLongDate(new Date(`${startDateIso}T12:00:00`))}
              </strong>
            </p>
          </div>
        </div>
      </header>

      {/* Bloques Netflix-style: cada bloque es una fila con scroll horizontal */}
      <div className="space-y-12">
        {(blocks ?? []).map((block) => {
          const blockModules = modulesByBlock.get(block.id) ?? [];
          const blockTitle = localized(block, "title", locale) ?? block.title;
          const brandName = localized(block, "brand_name", locale) ?? block.brand_name;
          const promise = localized(block, "promise", locale) ?? block.promise;
          const accent =
            BLOCK_ACCENTS[(block.order_index - 1) % BLOCK_ACCENTS.length];

          return (
            <section key={block.id} className="space-y-4">
              {/* Header del row (estilo Netflix: título grande con número) */}
              <header className="flex items-end gap-4 px-1">
                <div
                  className={`bg-gradient-to-br ${accent} bg-clip-text font-grotesk text-5xl font-extrabold leading-none text-transparent sm:text-6xl`}
                >
                  {String(block.order_index).padStart(2, "0")}
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <p className="font-inter text-[10px] font-bold uppercase tracking-[0.32em] text-brand-coral">
                    Bloque {block.order_index}
                  </p>
                  <h2 className="mt-1 flex flex-wrap items-baseline gap-3 font-grotesk text-xl font-bold text-white sm:text-2xl">
                    {blockTitle}
                    {brandName && (
                      <span className="rounded-full bg-white/10 px-2.5 py-1 font-inter text-[10px] font-semibold uppercase tracking-[0.15em] text-white/80">
                        {brandName}
                      </span>
                    )}
                  </h2>
                  {promise && (
                    <p className="mt-1 max-w-2xl font-inter text-xs italic leading-relaxed text-white/55 sm:text-sm">
                      &ldquo;{promise}&rdquo;
                    </p>
                  )}
                </div>
              </header>

              {/* Row scrollable horizontal estilo Netflix */}
              <div className="-mx-5 overflow-x-auto pb-4 sm:-mx-8">
                <ul className="flex gap-3 px-5 sm:gap-4 sm:px-8">
                  {blockModules.map((m) => {
                    const moduleTitle =
                      localized(m, "title", locale) ?? m.title;
                    const emoji = MODULE_EMOJIS[m.title] ?? "📘";
                    const opensAt = addWeeks(startDateIso, m.course_week - 1);
                    const status = moduleStatus(m.course_week, currentWeek);
                    const moduleN = String(m.order_index).padStart(2, "0");
                    const isOpen = status === "open";

                    return (
                      <li
                        key={m.id}
                        className={`group relative aspect-[3/4] w-[170px] shrink-0 overflow-hidden rounded-lg border bg-gradient-to-br ${accent} shadow-card transition-all duration-300 hover:z-10 hover:scale-[1.05] hover:shadow-glow-violet sm:w-[200px] ${
                          isOpen
                            ? "border-brand-coral/70 ring-2 ring-brand-coral/40"
                            : "border-white/10 hover:border-brand-violet/40"
                        }`}
                      >
                        {/* Patrón decorativo sutil */}
                        <div
                          aria-hidden
                          className="absolute inset-0 opacity-15 [background-image:radial-gradient(circle_2px_at_25%_30%,white_99%,transparent_100%),radial-gradient(circle_1px_at_72%_44%,white_99%,transparent_100%),radial-gradient(circle_1px_at_88%_18%,white_99%,transparent_100%),radial-gradient(circle_2px_at_12%_72%,white_99%,transparent_100%),radial-gradient(circle_1px_at_55%_82%,white_99%,transparent_100%)]"
                        />

                        {/* Número grande del módulo */}
                        <div className="absolute right-3 top-3 font-grotesk text-3xl font-extrabold leading-none text-white/25 sm:text-4xl">
                          {moduleN}
                        </div>

                        {/* Emoji centrado */}
                        <div className="absolute left-1/2 top-[36%] -translate-x-1/2 -translate-y-1/2 text-5xl drop-shadow-lg transition-transform duration-500 group-hover:scale-110 sm:text-6xl">
                          {emoji}
                        </div>

                        {/* Gradient overlay inferior */}
                        <div
                          aria-hidden
                          className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/95 via-black/70 to-transparent"
                        />

                        {/* Status badge arriba */}
                        <div className="absolute left-3 top-3">
                          <NetflixStatusBadge status={status} />
                        </div>

                        {/* Texto inferior */}
                        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                          <p className="font-inter text-[10px] font-semibold tabular-nums text-brand-coral">
                            {opensAt}
                          </p>
                          <h3 className="mt-1 line-clamp-2 font-grotesk text-sm font-bold leading-tight text-white sm:text-base">
                            {moduleTitle}
                          </h3>
                        </div>

                        {/* Glow extra para el módulo activo */}
                        {isOpen && (
                          <div
                            aria-hidden
                            className="pointer-events-none absolute inset-0 animate-pulse rounded-lg shadow-[inset_0_0_30px_rgba(255,77,109,0.35)]"
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          );
        })}
      </div>

      {/* Footer info */}
      <footer className="rounded-2xl border border-white/[0.06] bg-[#04081A] p-6 sm:p-7">
        <p className="font-inter text-xs uppercase tracking-[0.32em] text-brand-coral">
          Resumen
        </p>
        <p className="mt-2 font-inter text-sm leading-relaxed text-white/65">
          <strong className="font-semibold text-white">
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

function NetflixStatusBadge({ status }: { status: ModuleStatus }) {
  const map: Record<ModuleStatus, { label: string; classes: string }> = {
    open: {
      label: "Ahora",
      classes: "bg-brand-coral text-white",
    },
    review: {
      label: "Visto",
      classes: "bg-emerald-500/90 text-white",
    },
    locked: {
      label: "Próximamente",
      classes: "bg-black/60 text-white/85 backdrop-blur",
    },
  };
  const it = map[status];
  return (
    <span
      className={`inline-flex rounded-sm px-1.5 py-0.5 font-inter text-[9px] font-bold uppercase tracking-wider ${it.classes}`}
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
