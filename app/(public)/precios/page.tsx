import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BookOpen,
  Check,
  CreditCard,
  Pause,
  Radio,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { signOutAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import {
  DapPublicHeader,
  type DapHeaderUser,
} from "@/components/layouts/dap-public-header";
import { DapPublicFooter } from "@/components/layouts/dap-public-footer";
import { DapButton } from "@/components/ui-dap/button";
import { EnrollmentCTA } from "@/components/launch/enrollment-cta";
import { Reveal } from "@/components/landing/reveal";

export const metadata: Metadata = {
  title: "Precios y planes",
  description:
    "$25 USD/mes — acceso completo al Diplomado Apostólico Pastoral. 72 módulos en 18 meses, 1 módulo por semana, corrección personalizada del Dr. Max. Cancela cuando quieras.",
  alternates: { canonical: "/precios" },
  openGraph: {
    type: "website",
    url: "/precios",
    title: "Precios y planes · DAP",
    description:
      "$25 USD/mes — todo incluido. 72 módulos en 18 meses, 1 por semana, MasterClass por evento, comunidad. Cancela cuando quieras.",
  },
};

const INCLUDED = [
  {
    icon: BookOpen,
    title: "1 módulo por semana durante 72 semanas",
    body: "El módulo de tu semana abre cada martes (00:01) y la tarea cierra el lunes (23:59). Cada módulo con 5 partes: introducción, enseñanza, activación, evaluación e impartición.",
  },
  {
    icon: Radio,
    title: "Sesiones en vivo por evento",
    body: "MasterClass en vivo (mínimo 1 al mes, garantizada). Mentoría grupal por convocatoria del apóstol. Todas se graban y quedan disponibles.",
  },
  {
    icon: Users,
    title: "Corrección personalizada del Dr. Max",
    body: "Tu activación se corrige con feedback en la voz del Dr. Max Hebeling. Resultado en 48 horas — espacio para asimilar sin la ansiedad del feedback inmediato.",
  },
  {
    icon: Sparkles,
    title: "Comunidad privada + Tutor IA",
    body: "Comunidad de pastores en formación y acceso al Tutor IA del DAP entrenado con todos los materiales del programa.",
  },
  {
    icon: Pause,
    title: "Modelo Netflix: cancelas cuando quieres",
    body: "Sin compromiso de permanencia. Si pausas un mes, tu progreso queda guardado y retomas desde la semana donde dejaste cuando reactives.",
  },
];

const NOT_INCLUDED = [
  "Inscripción única ni cuota anual",
  "Costos ocultos por certificado o insignia",
  "Compromisos de permanencia",
  "Cobros si la suscripción está cancelada",
];

export default async function PreciosPage() {
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
          {/* Portal cósmico — backdrop del hero de pricing */}
          <Image
            src="/precios-hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-40 object-cover opacity-55"
          />
          <div className="absolute inset-0 -z-30 bg-gradient-to-b from-surface-base/75 via-surface-base/55 to-surface-base" />
          <div className="absolute inset-0 -z-20 opacity-50 [background:radial-gradient(60%_45%_at_30%_42%,rgba(123,97,255,0.32),transparent_60%),radial-gradient(50%_40%_at_72%_58%,rgba(255,77,109,0.24),transparent_60%)]" />

          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              Plan único · Todo incluido
            </p>
            <h1 className="font-grotesk text-display font-bold leading-[1.05] text-text-primary">
              <span className="gradient-text">$25 USD</span> al mes.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl font-inter text-base text-text-secondary md:text-lg">
              Acceso completo al Diplomado Apostólico Pastoral. 72 módulos
              en 18 meses, 1 por semana, MasterClass por evento y comunidad
              de pastores. Cancela cuando quieras, sin compromisos.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <EnrollmentCTA href="/suscribirme" size="lg">
                Empezar ahora
                <ArrowRight />
              </EnrollmentCTA>
              <DapButton
                render={<Link href="/como-funciona" />}
                variant="secondary"
                size="lg"
              >
                ¿Cómo funciona?
              </DapButton>
            </div>
            <p className="mt-6 font-inter text-xs text-text-tertiary">
              Procesado por Stripe · 18 meses · 9 bloques · 72 módulos
            </p>
          </div>
        </section>

        {/* Lo que incluye */}
        <section className="border-t border-white/[0.06] bg-surface-base px-6 py-24">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
                Qué incluye
              </p>
              <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
                Todo lo que necesitas <span className="gradient-text">en un solo plan</span>.
              </h2>
            </Reveal>

            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {INCLUDED.map((item, i) => {
                const Icon = item.icon;
                return (
                  <Reveal key={item.title} delay={i * 0.04}>
                    <div className="flex h-full gap-4 rounded-xl border border-white/[0.06] bg-surface-elevated p-6">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-violet/10 text-brand-violet">
                        <Icon className="size-5" strokeWidth={1.8} />
                      </div>
                      <div>
                        <h3 className="mb-2 font-grotesk text-h4 font-semibold text-text-primary">
                          {item.title}
                        </h3>
                        <p className="text-justify font-inter text-sm leading-relaxed text-text-secondary">
                          {item.body}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* Lo que NO pagás */}
        <section className="border-t border-white/[0.06] bg-surface-base px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
                Lo que no pagás
              </p>
              <h2 className="mb-8 font-grotesk text-h2 font-bold leading-tight text-text-primary">
                Cero letra chica.
              </h2>
              <ul className="space-y-3">
                {NOT_INCLUDED.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 font-inter text-base text-text-secondary"
                  >
                    <X
                      className="mt-1 size-4 shrink-0 text-text-tertiary line-through"
                      strokeWidth={2}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* Modelo Netflix explicado */}
        <section className="border-t border-white/[0.06] bg-surface-base px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <div className="rounded-xl border border-brand-coral/20 bg-brand-coral/[0.04] p-8">
                <Pause
                  className="mb-4 size-6 text-brand-coral"
                  strokeWidth={2}
                />
                <h3 className="mb-3 font-grotesk text-h3 font-bold text-text-primary">
                  Modelo Netflix — sin compromiso
                </h3>
                <p className="font-inter text-base leading-relaxed text-text-secondary">
                  Cancelas desde tu dashboard cuando quieras. Mientras
                  estés activo recibes 1 módulo nuevo cada semana. Si
                  pausas, tu progreso queda guardado y cuando reactives
                  retomas desde la semana donde dejaste.
                </p>
                <p className="mt-4 font-inter text-sm text-text-tertiary">
                  Sin penalidades, sin renovaciones automáticas mañosas.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* CTA final */}
        <section className="relative isolate overflow-hidden border-t border-white/[0.06] px-6 py-24">
          <div className="absolute inset-0 -z-20 bg-gradient-cosmic opacity-90" />
          <div className="absolute inset-0 -z-10 opacity-70 [background:radial-gradient(50%_50%_at_50%_50%,rgba(123,97,255,0.35),transparent_55%)]" />
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
              Empieza hoy, <span className="gradient-text">cancela cuando quieras</span>.
            </h2>
            <p className="mx-auto mt-6 max-w-xl font-inter text-base text-text-secondary md:text-lg">
              Tu suscripción se activa al confirmar el pago. Empiezas con la
              Fase 1 desde el día uno.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <EnrollmentCTA href="/suscribirme" size="lg">
                <CreditCard />
                Suscribirme — $25/mes
              </EnrollmentCTA>
              <DapButton
                render={<Link href="/#preguntas" />}
                variant="secondary"
                size="lg"
              >
                Ver preguntas frecuentes
              </DapButton>
            </div>
            <p className="mt-6 font-inter text-xs text-text-tertiary">
              <Check className="-mt-1 mr-1 inline size-3 text-emerald-400" />
              Procesado por Stripe · sin compromiso
            </p>
          </div>
        </section>
      </main>

      <DapPublicFooter />
    </div>
  );
}
