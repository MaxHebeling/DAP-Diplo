import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarClock,
  CreditCard,
  Layers,
  Pause,
  Radio,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { signOutAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import {
  DapPublicHeader,
  type DapHeaderUser,
} from "@/components/layouts/dap-public-header";
import { DapPublicFooter } from "@/components/layouts/dap-public-footer";
import { DapButton } from "@/components/ui-dap/button";
import { Reveal } from "@/components/landing/reveal";

export const metadata: Metadata = {
  title: "Cómo funciona el DAP",
  description:
    "Cómo funciona el Diplomado Apostólico Pastoral: admisión formal con carta del pastor, suscripción mensual de $25, 72 módulos en 18 meses, 1 módulo por semana, MasterClass por evento, corrección personalizada del Ap. Max Hebeling y comunidad.",
  alternates: { canonical: "/como-funciona" },
  openGraph: {
    type: "website",
    url: "/como-funciona",
    title: "Cómo funciona el DAP · Diplomado Apostólico Pastoral",
    description:
      "Suscripción mensual de $25. 72 módulos en 18 meses (1 por semana). MasterClass por evento, corrección personalizada del Ap. Max Hebeling, comunidad.",
  },
};

const STEPS = [
  {
    icon: ShieldCheck,
    title: "Postulás y sos admitido",
    body: "Completás el formulario de admisión y, si no pertenecés a la Red Apostólica, adjuntás carta de consentimiento de tu pastor. El equipo revisa manualmente y emite tu admisión formal.",
  },
  {
    icon: CreditCard,
    title: "Activás tu suscripción",
    body: "$25 USD/mes vía Stripe — sin compromiso de permanencia. Tu calendario personal arranca el primer martes después de la aprobación de tu admisión.",
  },
  {
    icon: CalendarClock,
    title: "Recibís 1 módulo cada semana",
    body: "Cada martes (00:01 hora de San Diego, California) se abre un módulo nuevo. La tarea de activación cierra el lunes siguiente (23:59). El contenido pasado sigue accesible para repaso indefinidamente.",
  },
  {
    icon: Award,
    title: "Completás bloques, recibís dimensiones",
    body: "Al aprobar los 8 módulos de un bloque (5 secciones completas + quiz aprobado), recibís certificado, insignia y una dimensión nueva. 9 bloques = 9 dimensiones, de Discípulo hasta Enviado.",
  },
] as const;

const WEEK = [
  {
    day: "Martes 00:01",
    icon: BookOpen,
    title: "Abre tu módulo de la semana",
    body: "El nuevo módulo aparece en tu dashboard con sus 5 partes: introducción, enseñanza en video, activación práctica, evaluación e impartición. Recibís email automático.",
  },
  {
    day: "De martes a lunes",
    icon: Sparkles,
    title: "Estudiás a tu ritmo",
    body: "Mirás la enseñanza (45–60 min), hacés el quiz autocorregible y entregás tu activación escrita. Todo a tu ritmo, dentro de tu semana.",
  },
  {
    day: "Lunes 23:59",
    icon: CalendarClock,
    title: "Cierra la ventana de entrega",
    body: "Después de esa hora, la tarea queda como pendiente y el martes siguiente abre la próxima semana. El contenido visto sigue disponible para repaso.",
  },
  {
    day: "48h después",
    icon: Radio,
    title: "Llega tu corrección personal",
    body: "El Ap. Max Hebeling te devuelve feedback escrito en su voz pastoral: lo que viste, lo que necesitás afinar, próximo paso y una palabra de impartación. Resultado del quiz también revelado a las 48h.",
  },
  {
    day: "Por evento",
    icon: Users,
    title: "MasterClass + mentoría en vivo",
    body: "MasterClass en vivo del Ap. Max Hebeling (mínimo 1 al mes garantizada). Mentoría grupal por convocatoria especial. Te avisamos por email apenas se programa.",
  },
];

const FIVE_PARTS = [
  {
    n: "01",
    title: "Introducción",
    body: "Objetivo, revelación principal y aplicación inmediata. Te alineás antes de la enseñanza.",
  },
  {
    n: "02",
    title: "Enseñanza",
    body: "Video principal del módulo (45–60 min). Doctrina + práctica.",
  },
  {
    n: "03",
    title: "Activación",
    body: "Ejercicio práctico para aplicar de inmediato. Sin activación, no hay impartición real.",
  },
  {
    n: "04",
    title: "Evaluación",
    body: "Quiz que mide comprensión. Aprobarlo es requisito para completar el módulo.",
  },
  {
    n: "05",
    title: "Frase de impartición",
    body: "Palabra apostólica de cierre. Declaración que queda sobre tu vida.",
  },
];

export default async function ComoFuncionaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let headerUser: DapHeaderUser = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile) {
      headerUser = {
        fullName: profile.full_name ?? null,
        avatarUrl: profile.avatar_url ?? null,
        role: profile.role as "student" | "admin",
      };
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-surface-base text-text-primary">
      <DapPublicHeader user={headerUser} onSignOut={signOutAction} />

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="relative isolate overflow-hidden border-b border-white/[0.06] px-6 py-28 sm:py-32">
          <div className="absolute inset-0 -z-30 bg-gradient-cosmic" />
          <div className="absolute inset-0 -z-20 opacity-50 [background:radial-gradient(60%_45%_at_30%_42%,rgba(123,97,255,0.32),transparent_60%),radial-gradient(50%_40%_at_72%_58%,rgba(255,77,109,0.24),transparent_60%)]" />

          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              Calendario semanal personal
            </p>
            <h1 className="font-grotesk text-display font-bold leading-[1.05] text-text-primary">
              ¿Cómo funciona <span className="gradient-text">el DAP</span>?
            </h1>
            <p className="mx-auto mt-6 max-w-2xl font-inter text-base text-text-secondary md:text-lg">
              Admisión formal, suscripción mensual, 1 módulo por semana
              durante 72 semanas. Corrección personalizada del Ap. Max
              Hebeling y MasterClass en vivo por evento. El tiempo fluye
              — no te quedás atrás.
            </p>
          </div>
        </section>

        {/* 4 pasos */}
        <section className="border-t border-white/[0.06] bg-surface-base px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
                El recorrido
              </p>
              <h2 className="mb-12 max-w-2xl font-grotesk text-h1 font-bold leading-tight text-text-primary">
                Cuatro pasos, <span className="gradient-text">del aspirante al liderazgo</span>.
              </h2>
            </Reveal>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <Reveal key={step.title} delay={i * 0.06}>
                    <div className="flex h-full flex-col rounded-xl border border-white/[0.06] bg-surface-elevated p-6">
                      <div className="mb-5 inline-flex size-12 items-center justify-center rounded-xl bg-brand-violet/10 text-brand-violet">
                        <Icon className="size-6" strokeWidth={1.8} />
                      </div>
                      <p className="mb-2 font-inter text-xs font-medium uppercase tracking-widest text-text-tertiary">
                        Paso {String(i + 1).padStart(2, "0")}
                      </p>
                      <h3 className="mb-3 font-grotesk text-h4 font-semibold text-text-primary">
                        {step.title}
                      </h3>
                      <p className="text-justify font-inter text-sm leading-relaxed text-text-secondary">
                        {step.body}
                      </p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* Cronograma semanal */}
        <section className="border-t border-white/[0.06] bg-surface-base px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
                Tu semana en el DAP
              </p>
              <h2 className="mb-12 max-w-2xl font-grotesk text-h1 font-bold leading-tight text-text-primary">
                Cronograma <span className="gradient-text">semanal</span>.
              </h2>
            </Reveal>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {WEEK.map((d, i) => {
                const Icon = d.icon;
                return (
                  <Reveal key={d.day} delay={i * 0.05}>
                    <div className="rounded-xl border border-white/[0.06] bg-surface-elevated p-6">
                      <Icon
                        className="mb-4 size-6 text-brand-coral"
                        strokeWidth={1.8}
                      />
                      <p className="mb-1 font-inter text-xs font-medium uppercase tracking-widest text-text-tertiary">
                        {d.day}
                      </p>
                      <h3 className="mb-2 font-grotesk text-h4 font-semibold text-text-primary">
                        {d.title}
                      </h3>
                      <p className="text-justify font-inter text-sm leading-relaxed text-text-secondary">
                        {d.body}
                      </p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* 5 partes del módulo */}
        <section className="border-t border-white/[0.06] bg-surface-base px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
                Estructura de cada módulo
              </p>
              <h2 className="mb-12 max-w-2xl font-grotesk text-h1 font-bold leading-tight text-text-primary">
                Cinco partes <span className="gradient-text">en cada clase</span>.
              </h2>
            </Reveal>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {FIVE_PARTS.map((p, i) => (
                <Reveal key={p.n} delay={i * 0.04}>
                  <div className="h-full rounded-xl border border-white/[0.06] bg-surface-elevated p-6 transition-colors hover:border-brand-coral/30">
                    <p className="gradient-text mb-4 font-grotesk text-h2 font-bold leading-none">
                      {p.n}
                    </p>
                    <h3 className="mb-3 font-grotesk text-h4 font-semibold text-text-primary">
                      {p.title}
                    </h3>
                    <p className="text-justify font-inter text-sm leading-relaxed text-text-secondary">
                      {p.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Pausa automática */}
        <section className="border-t border-white/[0.06] bg-surface-base px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <div className="rounded-xl border border-brand-coral/25 bg-brand-coral/[0.04] p-8 sm:p-10">
                <Pause
                  className="mb-4 size-7 text-brand-coral"
                  strokeWidth={2}
                />
                <h3 className="mb-3 font-grotesk text-h2 font-bold text-text-primary">
                  ¿Y si no llego a completar una semana?
                </h3>
                <p className="font-inter text-base leading-relaxed text-text-secondary">
                  No pasa nada con tu avance. El{" "}
                  <strong className="text-text-primary">calendario manda</strong>
                  {" "}— el módulo siguiente se abre el próximo martes. La
                  tarea de la semana que no entregaste queda como pendiente,
                  pero el contenido sigue accesible para repaso indefinidamente.
                  Para certificarte del bloque vas a necesitar aprobar los
                  8 módulos en algún momento.
                </p>
                <p className="mt-4 font-inter text-sm text-text-tertiary">
                  Quita la ansiedad de "perder el mes". El llamado se desarrolla
                  con constancia, no con presión.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Resumen visual */}
        <section className="border-t border-white/[0.06] bg-surface-base px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div className="text-center">
                <Layers className="mx-auto mb-3 size-6 text-brand-violet" />
                <p className="font-grotesk text-h2 font-bold gradient-text">9</p>
                <p className="font-inter text-xs uppercase tracking-widest text-text-tertiary">
                  Bloques
                </p>
              </div>
              <div className="text-center">
                <BookOpen className="mx-auto mb-3 size-6 text-brand-coral" />
                <p className="font-grotesk text-h2 font-bold gradient-text">72</p>
                <p className="font-inter text-xs uppercase tracking-widest text-text-tertiary">
                  Módulos
                </p>
              </div>
              <div className="text-center">
                <CalendarClock className="mx-auto mb-3 size-6 text-brand-amber" />
                <p className="font-grotesk text-h2 font-bold gradient-text">18</p>
                <p className="font-inter text-xs uppercase tracking-widest text-text-tertiary">
                  Meses
                </p>
              </div>
              <div className="text-center">
                <ShieldCheck className="mx-auto mb-3 size-6 text-brand-violet" />
                <p className="font-grotesk text-h2 font-bold gradient-text">9</p>
                <p className="font-inter text-xs uppercase tracking-widest text-text-tertiary">
                  Dimensiones
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="relative isolate overflow-hidden border-t border-white/[0.06] px-6 py-24">
          <div className="absolute inset-0 -z-20 bg-gradient-cosmic opacity-90" />
          <div className="absolute inset-0 -z-10 opacity-70 [background:radial-gradient(50%_50%_at_50%_50%,rgba(123,97,255,0.35),transparent_55%)]" />
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
              Listo para <span className="gradient-text">empezar</span>.
            </h2>
            <p className="mx-auto mt-6 max-w-xl font-inter text-base text-text-secondary md:text-lg">
              $25 USD/mes. Cancela cuando quieras. Acceso inmediato al
              Mes 1.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <DapButton render={<Link href="/suscribirme" />} size="lg">
                Suscribirme ahora
                <ArrowRight />
              </DapButton>
              <DapButton
                render={<Link href="/precios" />}
                variant="secondary"
                size="lg"
              >
                Ver precios
              </DapButton>
            </div>
          </div>
        </section>
      </main>

      <DapPublicFooter />
    </div>
  );
}
