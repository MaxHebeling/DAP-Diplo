import {
  BookOpen,
  Calendar,
  Globe2,
  GraduationCap,
  Mail,
  MapPin,
  MessageCircle,
  Quote,
  Sparkles,
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
 * desde el sidebar. Pensada como "carta de presentación" para que el
 * alumno conozca quién va a corregir sus activaciones y dar las
 * MasterClasses.
 *
 * Texto editable directo en este archivo. Si más adelante hay que
 * versionarlo o traducirlo, mover a una tabla `director_profile`.
 */

type TimelineItem = { year: string; label: string; detail: string };
type Credential = {
  icon: typeof GraduationCap;
  title: string;
  detail: string;
};

const TIMELINE: TimelineItem[] = [
  {
    year: "2026",
    label: "Director · Diplomado Apostólico Pastoral",
    detail:
      "Lanzamiento del DAP — programa de 18 meses con 9 dimensiones apostólicas para pastores y reformadores.",
  },
  {
    year: "2018 – Hoy",
    label: "Presidente · Revival & Kingdom Ministries, INC.",
    detail:
      "Plataforma apostólica con base en San Diego que cubre iglesias, líderes y reformadores en Latinoamérica y Estados Unidos.",
  },
  {
    year: "Desde 2010",
    label: "Ministerio apostólico itinerante",
    detail:
      "Predicación y mentoría en más de 12 naciones. Conferencias, escuelas proféticas y consultoría a redes pastorales.",
  },
];

const CREDENTIALS: Credential[] = [
  {
    icon: GraduationCap,
    title: "Formación ministerial",
    detail:
      "Estudios teológicos y formación apostólica bajo mentores de la quinta generación del avivamiento contemporáneo.",
  },
  {
    icon: BookOpen,
    title: "Producción de contenido",
    detail:
      "Autor de materiales de discipulado, escuela ministerial y consultoría apostólica. Productor de RKCH Podcast.",
  },
  {
    icon: Globe2,
    title: "Alcance internacional",
    detail:
      "Ministerio activo en Argentina, México, Estados Unidos, Centroamérica y el Caribe. Audiencia hispana global.",
  },
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
              <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-brand-violet via-fuchsia-600 to-brand-coral shadow-2xl sm:h-40 sm:w-40">
                <span className="font-grotesk text-5xl font-extrabold text-white drop-shadow-lg sm:text-6xl">
                  MH
                </span>
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
                Ap. Max Hebeling
              </h1>
              <p className="mt-2 font-inter text-sm text-white/65 sm:text-base">
                Presidente de Revival &amp; Kingdom Ministries, INC. · Fundador
                y Director del Diplomado Apostólico Pastoral.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Pill icon={MapPin} text="San Diego · Tijuana" />
                <Pill icon={Calendar} text="Ministerio desde 2010" />
              </div>
            </div>
          </div>
        </section>

        {/* LLAMADO */}
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#04081A] p-8 sm:p-10">
          <Quote
            className="absolute right-6 top-6 size-16 text-brand-violet/15"
            strokeWidth={1.2}
          />
          <p className="font-inter text-[10px] font-bold uppercase tracking-[0.4em] text-brand-coral">
            Mi llamado
          </p>
          <p className="mt-4 max-w-3xl font-grotesk text-xl font-medium leading-snug text-white/90 sm:text-2xl">
            &ldquo;Formar pastores que sean apostólicamente padres,
            empresarialmente reformadores y espiritualmente
            gobernantes &mdash; capaces de tomar territorios y de sostenerlos
            en el tiempo.&rdquo;
          </p>
          <p className="mt-6 max-w-3xl font-inter text-sm leading-relaxed text-white/65">
            El DAP nace de 16 años de ministerio apostólico viendo lo mismo en
            cada nación: pastores con corazón ardiente pero sin la estructura,
            la mentoría y las herramientas para sostener la unción a largo
            plazo. Este Diplomado existe para cerrar esa brecha.
          </p>
        </section>

        {/* TRAYECTORIA */}
        <section className="rounded-2xl border border-white/[0.06] bg-[#04081A] p-8 sm:p-10">
          <p className="font-inter text-[10px] font-bold uppercase tracking-[0.4em] text-brand-coral">
            Trayectoria
          </p>
          <h2 className="mt-2 font-grotesk text-2xl font-bold text-white sm:text-3xl">
            16 años edificando obra apostólica.
          </h2>

          <ol className="mt-7 space-y-5 border-l-2 border-brand-violet/30 pl-6">
            {TIMELINE.map((t, i) => (
              <li key={i} className="relative">
                <span
                  aria-hidden
                  className="absolute -left-[31px] top-1.5 size-3 rounded-full bg-gradient-to-br from-brand-violet to-brand-coral ring-4 ring-[#04081A]"
                />
                <p className="font-inter text-xs font-bold uppercase tracking-wider text-brand-violet">
                  {t.year}
                </p>
                <p className="mt-1 font-grotesk text-base font-bold text-white sm:text-lg">
                  {t.label}
                </p>
                <p className="mt-1 max-w-2xl font-inter text-sm leading-relaxed text-white/60">
                  {t.detail}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* CREDENCIALES */}
        <section className="rounded-2xl border border-white/[0.06] bg-[#04081A] p-8 sm:p-10">
          <p className="font-inter text-[10px] font-bold uppercase tracking-[0.4em] text-brand-coral">
            Credenciales
          </p>
          <h2 className="mt-2 font-grotesk text-2xl font-bold text-white sm:text-3xl">
            Formación, producción e influencia.
          </h2>

          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {CREDENTIALS.map((c, i) => {
              const Icon = c.icon;
              return (
                <div
                  key={i}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors hover:border-brand-violet/40"
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-brand-violet/15 text-brand-violet">
                    <Icon className="size-5" strokeWidth={1.8} />
                  </div>
                  <h3 className="mt-4 font-grotesk text-base font-bold text-white">
                    {c.title}
                  </h3>
                  <p className="mt-2 font-inter text-sm leading-relaxed text-white/60">
                    {c.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CONTACTO ligero */}
        <section className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-brand-violet/10 via-[#04081A] to-brand-coral/10 p-8 sm:p-10">
          <p className="font-inter text-[10px] font-bold uppercase tracking-[0.4em] text-brand-coral">
            Para los alumnos del DAP
          </p>
          <h2 className="mt-2 max-w-2xl font-grotesk text-2xl font-bold text-white sm:text-3xl">
            Si necesitás cobertura, oración o mentoría &mdash; escribíme.
          </h2>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href="https://wa.me/19565095558"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-full bg-brand-coral px-5 py-2.5 font-inter text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
            >
              <MessageCircle className="size-4" />
              WhatsApp directo
            </a>
            <a
              href="mailto:director@dapglobal.org"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 font-inter text-sm font-semibold text-white/90 transition-colors hover:bg-white/[0.08]"
            >
              <Mail className="size-4" />
              director@dapglobal.org
            </a>
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
