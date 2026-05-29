import Image from "next/image";
import {
  Award,
  BookOpen,
  Globe2,
  GraduationCap,
  Languages,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { getLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { signOutAction } from "@/lib/auth/actions";
import { DapStudentShell } from "@/components/layouts/dap-student-shell";

export const metadata = { title: "Director del DAP" };
export const dynamic = "force-dynamic";

/**
 * Ficha profesional del Director del DAP — visible para todo alumno
 * desde el sidebar. Contenido tomado del CV oficial.
 */

type Degree = {
  title: string;
  spanish: string;
  honor?: string;
  institution: string;
};

const DEGREES: Degree[] = [
  {
    title: "Bachelor of Theology & Counseling",
    spanish: "Licenciatura en Teología y Consejería",
    institution: "Redime Christian University · Ohio, United States",
  },
  {
    title: "Bachelor of Business Administration",
    spanish: "Licenciatura en Administración de Empresas",
    honor: "Honor Summa Cum Laude",
    institution: "UTH Florida University · Miami, FL, United States",
  },
  {
    title: "Master of Christian Ministry",
    spanish: "Maestría en Ministerio Cristiano",
    institution: "Oral Roberts University · Tulsa, Oklahoma, United States",
  },
  {
    title: "Maestría en Colaboración Internacional y Diplomacia",
    spanish: "",
    institution: "CEUPE · European Business School · Madrid, España",
  },
];

const SKILLS = [
  { icon: Sparkles, text: "Liderazgo espiritual y desarrollo ministerial" },
  {
    icon: Users,
    text: "Formación y mentoría de pastores, líderes y ministros",
  },
  {
    icon: Globe2,
    text: "Planificación y gestión de eventos internacionales",
  },
  {
    icon: GraduationCap,
    text: "Capacitación, entrenamiento y desarrollo de equipos",
  },
];

const ROLES = [
  "Director Internacional de la Red Apostólica Reino y Avivamiento.",
  "Pastor Principal de Revival & Kingdom Ministries, Inc.",
  "Autor de ocho libros. Conferencista internacional.",
  "CEO de Reino Editorial.",
  "CEO de iKingdom LLC.",
];

export default async function DirectorPage() {
  const supabase = await createClient();
  const locale = await getLocale();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect({ href: "/login?redirectTo=/director", locale });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle<{ full_name: string; avatar_url: string | null }>();

  return (
    <DapStudentShell
      userName={profile?.full_name ?? "Alumno"}
      userAvatar={profile?.avatar_url ?? null}
      title="Director del DAP"
      onSignOut={signOutAction}
    >
      <main className="mx-auto max-w-5xl space-y-8 bg-[#020410] px-5 py-8 sm:px-8">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#04081A] p-8 sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-brand-violet/25 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-16 -left-16 size-56 rounded-full bg-brand-coral/15 blur-3xl"
          />

          <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center">
            <div className="relative shrink-0">
              <div className="relative h-32 w-32 overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-brand-violet via-fuchsia-600 to-brand-coral shadow-2xl sm:h-40 sm:w-40">
                <Image
                  src="/director-max.jpg"
                  alt="Dr. Max Hebeling"
                  fill
                  sizes="160px"
                  priority
                  className="object-cover"
                />
              </div>
              <div
                aria-hidden
                className="absolute -bottom-4 left-1/2 h-4 w-24 -translate-x-1/2 rounded-full bg-brand-coral/40 blur-xl"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-brand-coral" strokeWidth={2} />
                <p className="font-inter text-[10px] font-bold uppercase tracking-[0.4em] text-brand-coral">
                  Director del DAP
                </p>
              </div>
              <h1 className="mt-2 bg-gradient-to-br from-white via-white/95 to-white/70 bg-clip-text font-grotesk text-4xl font-bold leading-tight text-transparent sm:text-5xl">
                Dr. Max Hebeling
              </h1>
              <p className="mt-2 text-justify font-inter text-sm text-white/65 hyphens-auto sm:text-base">
                Argentino · Residente en Tijuana BC, México.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Pill icon={MapPin} text="Tijuana, BC, México" />
                <Pill icon={Globe2} text="maxhebeling.org" />
                <Pill icon={Globe2} text="ikingdom.org" />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a
                  href="mailto:office@rkchurch.com"
                  className="inline-flex items-center gap-2 font-inter text-xs text-white/85 hover:text-white"
                >
                  <Mail className="size-3.5 text-brand-violet" />
                  office@rkchurch.com
                </a>
                <a
                  href="tel:+526642323257"
                  className="inline-flex items-center gap-2 font-inter text-xs text-white/85 hover:text-white"
                >
                  <Phone className="size-3.5 text-brand-violet" />
                  +52 (664) 232 3257
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* PERFIL PROFESIONAL */}
        <section className="rounded-2xl border border-white/[0.06] bg-[#04081A] p-8 sm:p-10">
          <p className="font-inter text-[10px] font-bold uppercase tracking-[0.4em] text-brand-coral">
            Perfil profesional
          </p>
          <ul className="mt-4 space-y-2.5">
            {ROLES.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-3 font-inter text-base leading-relaxed text-white/85"
              >
                <span
                  aria-hidden
                  className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand-coral"
                />
                {r}
              </li>
            ))}
          </ul>
        </section>

        {/* EXPERIENCIA */}
        <section className="rounded-2xl border border-white/[0.06] bg-[#04081A] p-8 sm:p-10">
          <p className="font-inter text-[10px] font-bold uppercase tracking-[0.4em] text-brand-coral">
            Experiencia
          </p>
          <p className="mt-4 max-w-3xl text-justify font-grotesk text-xl font-medium leading-snug text-white/90 hyphens-auto sm:text-2xl">
            Conferencista internacional con participación en más de{" "}
            <span className="text-brand-coral">17 países</span>, formando y
            activando líderes y ministros.
          </p>
          <p className="mt-4 max-w-3xl text-justify font-inter text-sm leading-relaxed text-white/65 hyphens-auto">
            Apasionado por la capacitación y activación ministerial, con una
            visión de transformación global basada en principios del Reino.
          </p>
        </section>

        {/* FORMACIÓN ACADÉMICA */}
        <section className="rounded-2xl border border-white/[0.06] bg-[#04081A] p-8 sm:p-10">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-4 text-brand-violet" />
            <p className="font-inter text-[10px] font-bold uppercase tracking-[0.4em] text-brand-coral">
              Formación académica
            </p>
          </div>
          <h2 className="mt-2 font-grotesk text-2xl font-bold text-white sm:text-3xl">
            Cuatro grados académicos.
          </h2>

          <ol className="mt-7 space-y-5 border-l-2 border-brand-violet/30 pl-6">
            {DEGREES.map((d, i) => (
              <li key={i} className="relative">
                <span
                  aria-hidden
                  className="absolute -left-[31px] top-1.5 size-3 rounded-full bg-gradient-to-br from-brand-violet to-brand-coral ring-4 ring-[#04081A]"
                />
                <p className="font-grotesk text-base font-bold text-white sm:text-lg">
                  {d.title}
                  {d.honor && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 font-inter text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                      <Award className="size-3" />
                      {d.honor}
                    </span>
                  )}
                </p>
                {d.spanish && (
                  <p className="mt-0.5 font-inter text-sm italic text-white/55">
                    {d.spanish}
                  </p>
                )}
                <p className="mt-1.5 text-justify font-inter text-sm leading-relaxed text-white/70 hyphens-auto">
                  {d.institution}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* LOGROS Y DISTINCIONES */}
        <section className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/[0.08] via-[#04081A] to-[#04081A] p-8 sm:p-10">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-amber-300" />
            <p className="font-inter text-[10px] font-bold uppercase tracking-[0.4em] text-amber-300">
              Logros y distinciones
            </p>
          </div>
          <h2 className="mt-2 font-grotesk text-2xl font-bold text-white sm:text-3xl">
            Embajador de la Paz y la Justicia.
          </h2>
          <p className="mt-5 max-w-3xl text-justify font-inter text-sm leading-relaxed text-white/75 hyphens-auto sm:text-base">
            En 2023, junto a su esposa, fue nombrado con grado honorífico como
            <strong className="text-white"> Doctor</strong>, recibiendo el
            título de <strong className="text-white">Embajador de la Paz y la Justicia</strong>,
            con la encomienda de <strong className="text-white">Pacificador en nivel de Oficial</strong>,
            y la <strong className="text-white">Medalla de la Gran Cruz del Mercosur</strong> junto
            al <strong className="text-white">Mérito de la Orden del Águila Dorada</strong>, otorgados
            por la <strong className="text-white">A.M.P.P. (Academia Mundial para a Promoção da Paz — Brasil)</strong>,
            convirtiéndose en un diplomático encargado de la promoción de la
            paz, la justicia y el bienestar para el{" "}
            <strong className="text-white">MERCOSUR</strong>.
          </p>
        </section>

        {/* HABILIDADES Y ESPECIALIDADES */}
        <section className="rounded-2xl border border-white/[0.06] bg-[#04081A] p-8 sm:p-10">
          <p className="font-inter text-[10px] font-bold uppercase tracking-[0.4em] text-brand-coral">
            Habilidades y especialidades
          </p>
          <h2 className="mt-2 font-grotesk text-2xl font-bold text-white sm:text-3xl">
            Donde su unción se hace estrategia.
          </h2>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {SKILLS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-brand-violet/40"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-violet/15 text-brand-violet">
                    <Icon className="size-4" strokeWidth={2} />
                  </div>
                  <p className="text-justify font-inter text-sm font-medium leading-snug text-white/85 hyphens-auto">
                    {s.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </DapStudentShell>
  );
}

function Pill({
  icon: Icon,
  text,
}: {
  icon: typeof MapPin;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-inter text-xs font-medium text-white/80">
      <Icon className="size-3.5 text-brand-violet" />
      {text}
    </span>
  );
}
