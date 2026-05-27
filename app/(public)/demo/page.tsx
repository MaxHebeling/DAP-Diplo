import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Headphones,
  Lock,
  Sparkles,
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
import { DemoQuiz } from "@/components/demo/demo-quiz";

export const metadata: Metadata = {
  title: "Demo gratis — Diplomado Apostólico Pastoral",
  description:
    "Probá una semana completa del DAP sin pagar. Video, activación, evaluación e impartición — la misma experiencia que recibe un alumno suscripto, gratis.",
  alternates: { canonical: "/demo" },
  openGraph: {
    type: "website",
    url: "/demo",
    title: "Demo gratis · DAP",
    description:
      "Una semana completa del Diplomado Apostólico Pastoral. Video + activación + quiz + impartición.",
  },
};

export const dynamic = "force-dynamic";

export default async function DemoPage() {
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
        {/* ───────── HERO ───────── */}
        <section className="relative isolate overflow-hidden border-b border-white/[0.06] px-6 py-24 sm:py-28">
          <div className="absolute inset-0 -z-30 bg-gradient-cosmic" />
          <div className="absolute inset-0 -z-20 opacity-60 [background:radial-gradient(60%_45%_at_30%_42%,rgba(123,97,255,0.35),transparent_60%),radial-gradient(50%_40%_at_72%_58%,rgba(255,77,109,0.25),transparent_60%)]" />

          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-coral/30 bg-brand-coral/10 px-3 py-1 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              <Sparkles className="size-3.5" />
              Demo gratis · sin registro
            </p>
            <h1 className="font-grotesk text-display font-bold leading-[1.05] text-text-primary">
              Viví una semana del{" "}
              <span className="gradient-text">DAP</span> sin pagar.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl font-inter text-base leading-relaxed text-text-secondary md:text-lg">
              Esta es exactamente la experiencia que recibe un alumno
              suscripto. Video, activación, evaluación e impartición —
              módulo completo del programa, accesible sin login.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 font-inter text-xs text-text-tertiary">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5 text-brand-coral" />
                ~50 min total
              </span>
              <span className="text-text-tertiary/50">·</span>
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="size-3.5 text-brand-coral" />
                Módulo 01 · Raíces · Reino de Dios
              </span>
            </div>
          </div>
        </section>

        {/* ───────── SECCIÓN 01: INTRODUCCIÓN ───────── */}
        <section className="border-b border-white/[0.06] bg-surface-base px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <p className="mb-3 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              01 · Introducción
            </p>
            <h2 className="mb-6 font-grotesk text-h2 font-bold leading-tight text-text-primary">
              Qué vas a recibir esta semana
            </h2>
            <div className="space-y-4 font-inter text-base leading-relaxed text-text-secondary">
              <p>
                <strong className="text-text-primary">Objetivo:</strong>{" "}
                Reconocer al Reino de Dios no como una idea futura o
                lejana, sino como una realidad presente operando aquí y
                ahora — y descubrir cómo se manifiesta en tu vida diaria.
              </p>
              <p>
                <strong className="text-text-primary">Revelación principal:</strong>{" "}
                El Reino no es solo un concepto teológico. Es gobierno
                tangible. Donde llega el Rey, llega el Reino, y donde
                llega el Reino, todo cambia: tu casa, tu ministerio, tu
                comunidad.
              </p>
              <p>
                <strong className="text-text-primary">Aplicación inmediata:</strong>{" "}
                Vas a aprender a reconocer las áreas de tu vida donde el
                Reino todavía no está manifestándose, y vas a recibir
                herramientas concretas para ejercer autoridad sobre ellas.
              </p>
              <p className="border-l-2 border-brand-coral pl-4 italic">
                &ldquo;Mas buscad primeramente el reino de Dios y su justicia, y
                todas estas cosas os serán añadidas.&rdquo; — Mateo 6:33
              </p>
            </div>
          </div>
        </section>

        {/* ───────── SECCIÓN 02: ENSEÑANZA (VIDEO) ───────── */}
        <section className="border-b border-white/[0.06] bg-gradient-to-br from-brand-violet/[0.06] via-surface-base to-brand-coral/[0.04] px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <p className="mb-3 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              02 · Enseñanza
            </p>
            <h2 className="mb-6 font-grotesk text-h2 font-bold leading-tight text-text-primary">
              Video del Ap. Max · 40 min
            </h2>

            <div className="rounded-2xl border border-white/[0.08] bg-surface-elevated/60 p-8 backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-coral/15 text-brand-coral">
                  <Headphones className="size-7" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-grotesk text-h4 font-semibold text-text-primary">
                    Reino de Dios — La realidad presente
                  </p>
                  <p className="mt-1 font-inter text-sm text-text-secondary">
                    40 minutos · Video principal del módulo
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-dashed border-white/[0.12] bg-white/[0.02] p-5 text-center">
                <Clock className="mx-auto mb-2 size-5 text-text-tertiary" />
                <p className="font-grotesk text-sm font-semibold text-text-primary">
                  Video en producción
                </p>
                <p className="mt-1 font-inter text-xs text-text-tertiary">
                  Suscribite al programa y recibí el video completo más los
                  otros 71 módulos. Demo de video disponible al abrir la
                  convocatoria.
                </p>
              </div>

              <p className="mt-6 font-inter text-sm leading-relaxed text-text-secondary">
                En este video el Ap. Max Hebeling desarrolla doctrinalmente
                el concepto del Reino, citando los pasajes clave de los
                evangelios donde Jesús lo describe, y bajándolo a
                aplicación práctica para pastores que están construyendo
                ministerios hoy.
              </p>
            </div>
          </div>
        </section>

        {/* ───────── SECCIÓN 03: ACTIVACIÓN ───────── */}
        <section className="border-b border-white/[0.06] bg-surface-base px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <p className="mb-3 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              03 · Activación
            </p>
            <h2 className="mb-6 font-grotesk text-h2 font-bold leading-tight text-text-primary">
              Llevá la enseñanza a la práctica
            </h2>

            <div className="space-y-5 font-inter text-base leading-relaxed text-text-secondary">
              <p>
                Cada módulo del DAP incluye una activación escrita que el{" "}
                <strong className="text-text-primary">Dr. Max corrige personalmente</strong>{" "}
                y te devuelve con feedback estructurado en 48 horas:
              </p>
              <ul className="ml-4 list-disc space-y-2 text-sm">
                <li>Lo que vio bien en tu entrega</li>
                <li>Lo que necesitás afinar</li>
                <li>Tu próximo paso concreto</li>
                <li>Una palabra apostólica de impartición sobre tu llamado</li>
              </ul>
            </div>

            <div className="mt-8 rounded-xl border border-brand-violet/20 bg-brand-violet/[0.05] p-6">
              <p className="mb-2 font-inter text-xs font-medium uppercase tracking-widest text-brand-violet">
                Consigna del módulo 1
              </p>
              <p className="font-inter text-base leading-relaxed text-text-primary">
                Identificá 3 áreas concretas de tu vida (familia, ministerio,
                finanzas, salud, relaciones) donde el Reino de Dios{" "}
                <em>todavía no está plenamente manifestándose</em>. Por
                cada área, escribí una declaración de fe basada en
                Escritura sobre lo que querés ver transformado esta
                semana, y un paso concreto que vas a dar para alinear esa
                área con el Reino.
              </p>
            </div>

            <div className="mt-5 inline-flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 font-inter text-xs text-text-tertiary">
              <Lock className="size-3.5 text-brand-coral" />
              Para entregar tu activación y recibir el feedback del Dr. Max,
              <Link href="/suscribirme" className="ml-1 font-semibold text-brand-coral hover:underline">
                suscribite al programa
              </Link>
              .
            </div>
          </div>
        </section>

        {/* ───────── SECCIÓN 04: EVALUACIÓN (QUIZ INTERACTIVO) ───────── */}
        <section className="border-b border-white/[0.06] bg-gradient-to-br from-brand-coral/[0.04] via-surface-base to-brand-violet/[0.05] px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <p className="mb-3 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              04 · Evaluación
            </p>
            <h2 className="mb-6 font-grotesk text-h2 font-bold leading-tight text-text-primary">
              Probá el quiz del módulo
            </h2>
            <p className="mb-8 font-inter text-base leading-relaxed text-text-secondary">
              Cada módulo cierra con una evaluación corta. Necesitás{" "}
              <strong className="text-text-primary">≥ 70%</strong> para
              aprobarlo. Probalo abajo — esta versión demo te muestra la
              respuesta correcta al instante.
            </p>

            <DemoQuiz />
          </div>
        </section>

        {/* ───────── SECCIÓN 05: IMPARTICIÓN ───────── */}
        <section className="border-b border-white/[0.06] bg-surface-base px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <p className="mb-3 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              05 · Impartición
            </p>
            <h2 className="mb-6 font-grotesk text-h2 font-bold leading-tight text-text-primary">
              Palabra apostólica de cierre
            </h2>

            <div className="rounded-2xl border border-brand-coral/20 bg-gradient-to-br from-brand-coral/[0.05] via-surface-elevated/40 to-brand-violet/[0.05] p-8">
              <p className="font-inter text-lg leading-relaxed text-text-primary italic">
                Hijo, levantate y reconocé que el Reino de Dios no es un
                lugar al que vas algún día. Es el gobierno del Padre
                operando aquí, sobre tu vida, ahora. Donde te paraste,
                hay autoridad. Donde declaraste, hay efecto. Esta semana,
                vas a ver cosas moverse que llevaban años atascadas —
                porque ya no las vas a mirar como hijo huérfano sino como
                hijo de Rey.
              </p>
              <p className="mt-6 border-l-2 border-brand-coral pl-4 font-inter text-sm text-text-secondary">
                &ldquo;He aquí, yo establezco mi pacto con vosotros... y bendeciré
                a los que te bendijeren.&rdquo; — Génesis 17 / Lucas 17:21
              </p>
            </div>
          </div>
        </section>

        {/* ───────── FOOTER CTA ───────── */}
        <section className="relative isolate overflow-hidden border-y border-white/[0.06] px-6 py-24">
          <div className="absolute inset-0 -z-20 bg-gradient-cosmic opacity-90" />
          <div className="absolute inset-0 -z-10 opacity-70 [background:radial-gradient(50%_50%_at_50%_50%,rgba(123,97,255,0.35),transparent_55%)]" />

          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-inter text-xs font-medium uppercase tracking-widest text-emerald-300">
              <CheckCircle2 className="size-3.5" />
              Acabás de probar 1 de 72 semanas
            </p>
            <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
              ¿Te imaginás <span className="gradient-text">18 meses así</span>?
            </h2>
            <p className="mx-auto mt-6 max-w-xl font-inter text-base leading-relaxed text-text-secondary md:text-lg">
              71 módulos más, corrección personal del Dr. Max en cada uno,
              MasterClass mensuales en vivo, mentoría grupal apostólica
              y comunidad privada de pastores. Por $25 USD al mes.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <EnrollmentCTA href="/suscribirme" size="lg">
                Suscribirme ahora
                <ArrowRight />
              </EnrollmentCTA>
              <DapButton
                render={<Link href="/como-funciona" />}
                variant="secondary"
                size="lg"
              >
                Ver cómo funciona
              </DapButton>
            </div>
            <p className="mt-6 font-inter text-xs text-text-tertiary">
              Sin permanencia · Cancelás cuando quieras · 7 días de garantía
            </p>
          </div>
        </section>
      </main>

      <DapPublicFooter />
    </div>
  );
}
