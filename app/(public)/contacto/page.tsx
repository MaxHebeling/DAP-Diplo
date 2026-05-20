import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  CreditCard,
  HelpCircle,
  Mail,
  MessageSquare,
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
import { Reveal } from "@/components/landing/reveal";

const SUPPORT_EMAIL = "contacto@dapglobal.org";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Hablemos. Para soporte técnico, preguntas pre-venta o consultas pastorales escribinos a contacto@dapglobal.org. Respondemos en menos de 24 horas hábiles.",
  alternates: { canonical: "/contacto" },
  openGraph: {
    type: "website",
    url: "/contacto",
    title: "Contacto · DAP",
    description:
      "Hablemos — soporte, ventas o consultas pastorales del Diplomado Apostólico Pastoral.",
  },
};

const TOPICS = [
  {
    icon: HelpCircle,
    title: "Preguntas antes de inscribirte",
    body: "¿Dudas sobre el contenido, la modalidad o si el DAP es para vos? Escribinos antes de pagar.",
    subject: "Consulta pre-venta DAP",
  },
  {
    icon: CreditCard,
    title: "Soporte de suscripción o pago",
    body: "Problemas con tu cobro, cancelación o reembolso (dentro de los 7 días).",
    subject: "Soporte suscripción DAP",
  },
  {
    icon: MessageSquare,
    title: "Soporte técnico de la plataforma",
    body: "No podés acceder, no carga un módulo, falla un quiz. Te ayudamos a resolverlo.",
    subject: "Soporte técnico DAP",
  },
  {
    icon: Sparkles,
    title: "Consultas pastorales o ministeriales",
    body: "Si querés conversar sobre tu llamado, una iglesia interesada en sumarse, o colaboraciones.",
    subject: "Consulta pastoral DAP",
  },
];

export default async function ContactoPage() {
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

          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              Estamos para ayudarte
            </p>
            <h1 className="font-grotesk text-display font-bold leading-[1.05] text-text-primary">
              <span className="gradient-text">Hablemos</span>.
            </h1>
            <p className="mx-auto mt-6 max-w-xl font-inter text-base text-text-secondary md:text-lg">
              Para cualquier consulta, soporte o conversación pastoral,
              escribinos. Respondemos en menos de 24 horas hábiles.
            </p>
          </div>
        </section>

        {/* Email principal — card destacada */}
        <section className="border-b border-white/[0.06] bg-surface-base px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="group relative flex flex-col items-center gap-6 rounded-2xl border border-white/[0.08] bg-surface-elevated p-10 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-violet/40 hover:shadow-glow-violet sm:flex-row sm:text-left"
              >
                <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-brand-violet/15 text-brand-violet transition-colors group-hover:bg-brand-violet/25">
                  <Mail className="size-7" strokeWidth={1.8} />
                </div>
                <div className="flex-1">
                  <p className="font-inter text-xs font-medium uppercase tracking-widest text-text-tertiary">
                    Email de contacto
                  </p>
                  <p className="mt-1 font-grotesk text-h3 font-bold text-text-primary sm:text-h2">
                    {SUPPORT_EMAIL}
                  </p>
                  <p className="mt-2 font-inter text-sm text-text-secondary">
                    Respuesta en menos de 24 horas hábiles.
                  </p>
                </div>
                <ArrowRight className="size-5 text-text-tertiary transition-all group-hover:translate-x-1 group-hover:text-brand-coral" />
              </a>
            </Reveal>
          </div>
        </section>

        {/* Topics — qué escribirnos */}
        <section className="border-b border-white/[0.06] bg-surface-base px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
                Sobre qué nos podés escribir
              </p>
              <h2 className="mb-12 max-w-2xl font-grotesk text-h1 font-bold leading-tight text-text-primary">
                Cualquiera de estos <span className="gradient-text">temas</span>.
              </h2>
            </Reveal>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {TOPICS.map((t, i) => {
                const Icon = t.icon;
                const subject = encodeURIComponent(t.subject);
                return (
                  <Reveal key={t.title} delay={i * 0.05}>
                    <a
                      href={`mailto:${SUPPORT_EMAIL}?subject=${subject}`}
                      className="group flex h-full flex-col rounded-xl border border-white/[0.06] bg-surface-elevated p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-violet/30 hover:shadow-glow-violet"
                    >
                      <div className="mb-4 inline-flex size-11 items-center justify-center rounded-lg bg-brand-violet/10 text-brand-violet">
                        <Icon className="size-5" strokeWidth={1.8} />
                      </div>
                      <h3 className="mb-2 font-grotesk text-h4 font-semibold text-text-primary">
                        {t.title}
                      </h3>
                      <p className="text-justify font-inter text-sm leading-relaxed text-text-secondary">
                        {t.body}
                      </p>
                      <p className="mt-4 inline-flex items-center gap-1 font-inter text-xs font-medium text-brand-coral">
                        Escribir
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                      </p>
                    </a>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ shortcut */}
        <section className="border-b border-white/[0.06] bg-surface-base px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <div className="rounded-xl border border-white/[0.08] bg-surface-elevated p-8 text-center sm:p-10">
                <HelpCircle
                  className="mx-auto mb-4 size-7 text-brand-coral"
                  strokeWidth={2}
                />
                <h3 className="mb-3 font-grotesk text-h3 font-bold text-text-primary">
                  ¿Antes de escribirnos?
                </h3>
                <p className="mb-6 font-inter text-base leading-relaxed text-text-secondary">
                  La mayoría de las preguntas las respondemos en la sección
                  de preguntas frecuentes del landing.
                </p>
                <DapButton
                  render={<Link href="/#faq" />}
                  variant="secondary"
                  size="md"
                >
                  Ver preguntas frecuentes
                  <ArrowRight />
                </DapButton>
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
              ¿Listo para <span className="gradient-text">empezar</span>?
            </h2>
            <p className="mx-auto mt-6 max-w-xl font-inter text-base text-text-secondary md:text-lg">
              No hace falta escribirnos antes. Suscribite, probá los
              primeros 7 días — si no es para vos, te devolvemos todo.
            </p>
            <div className="mt-10">
              <DapButton render={<Link href="/suscribirme" />} size="lg">
                Comienza tu transformación
                <ArrowRight />
              </DapButton>
            </div>
          </div>
        </section>
      </main>

      <DapPublicFooter />
    </div>
  );
}
