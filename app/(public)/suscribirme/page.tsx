import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/reveal";
import { SiteHeader, type HeaderUser } from "@/components/landing/site-header";
import { DapPublicFooter } from "@/components/layouts/dap-public-footer";
import { createClient } from "@/lib/supabase/server";
import {
  CLASSES_START_LABEL,
  ENROLLMENT_OPENS_LABEL,
  isEnrollmentOpen,
} from "@/lib/launch/config";
import { CalendarClock, GraduationCap } from "lucide-react";

export const metadata = {
  title: "Suscribirme",
  description:
    "$25 USD al mes. Acceso completo al Diplomado Apostólico Pastoral. Cancela cuando quieras.",
  alternates: { canonical: "/suscribirme" },
  openGraph: {
    type: "website" as const,
    url: "/suscribirme",
    title: "Suscribirme · DAP",
    description:
      "Acceso completo al Diplomado Apostólico Pastoral por $25 USD/mes. 72 módulos en 18 meses · 1 módulo por semana · cancela cuando quieras.",
  },
};

const INCLUDED = [
  "Calendario semanal personal: 1 módulo por semana durante 72 semanas",
  "MasterClass en vivo por evento (mínimo 1 garantizada al mes)",
  "Mentoría grupal por convocatoria del apóstol",
  "Corrección personalizada de tu activación con la voz del Dr. Max (48h)",
  "Comunidad privada de pastores en formación",
  "Material descargable por módulo (PDFs, audios, plantillas)",
  "Certificado, insignia y dimensión nueva al completar cada bloque",
];

export default async function SuscribirmePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/suscribirme");
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .maybeSingle();
  const stillActive =
    !!sub &&
    (sub.current_period_end === null ||
      new Date(sub.current_period_end) > new Date());
  if (stillActive) {
    redirect("/dashboard?toast=already-subscribed");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role")
    .eq("id", user.id)
    .maybeSingle();

  // Admin bypass del launch gate: les permite testear el checkout
  // y los flows de pago aunque las inscripciones públicas estén cerradas.
  const isAdmin = profile?.role === "admin";
  const headerUser: HeaderUser = profile
    ? {
        fullName: profile.full_name ?? null,
        avatarUrl: profile.avatar_url ?? null,
        role: profile.role as "student" | "admin",
      }
    : null;

  return (
    <div className="flex flex-1 flex-col bg-neutral-950 text-neutral-50">
      <SiteHeader user={headerUser} />
      <main className="flex flex-1 items-start justify-center px-6 pt-32 pb-20 sm:pt-36">
        <Reveal>
          <div className="mx-auto w-full max-w-2xl">
            <Link
              href="/"
              className="mb-10 inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-brand-coral"
            >
              <ArrowLeft className="size-4" />
              Volver al inicio
            </Link>

            <p className="mb-4 text-xs font-medium uppercase tracking-[0.32em] text-brand-coral">
              Suscripción
            </p>
            <h1 className="mb-5 font-serif text-balance text-4xl font-semibold leading-tight sm:text-5xl">
              Diplomado Apostólico Pastoral
            </h1>
            <p className="mb-10 max-w-xl text-justify text-base leading-relaxed text-neutral-300 hyphens-auto">
              Una sola suscripción mensual te da acceso al diplomado completo
              de 18 meses. Recibís un módulo nuevo cada semana (martes 00:01).
              Cancela cuando quieras desde tu dashboard — tu progreso queda
              guardado.
            </p>

            <div className="mb-10 rounded-2xl border border-white/10 bg-neutral-900/40 p-8 sm:p-10">
              <div className="mb-7 flex items-end justify-between">
                <div>
                  <p className="font-serif text-5xl font-semibold text-neutral-50 sm:text-6xl">
                    $25
                  </p>
                  <p className="mt-1 text-sm text-neutral-400">USD por mes</p>
                </div>
                <p className="text-xs font-medium uppercase tracking-widest text-brand-coral">
                  Plan único
                </p>
              </div>
              <ul className="space-y-3.5">
                {INCLUDED.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm leading-relaxed text-neutral-200"
                  >
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-brand-coral"
                      strokeWidth={2.5}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {isEnrollmentOpen() || isAdmin ? (
              <>
                <form
                  action="/api/checkout/create-subscription"
                  method="POST"
                  className="w-full"
                >
                  <Button
                    type="submit"
                    size="lg"
                    className="h-12 w-full bg-brand-coral px-7 text-base font-medium text-brand-coral-foreground hover:bg-brand-coral/90"
                  >
                    Continuar a pago
                  </Button>
                </form>
                <p className="mt-5 text-center text-xs text-neutral-500">
                  Procesado por Stripe. Sin contrato. Cancela en un click cuando
                  quieras.
                </p>
              </>
            ) : (
              <div className="w-full rounded-2xl border border-brand-coral/30 bg-brand-coral/[0.06] p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-coral/10 text-brand-coral">
                  <CalendarClock className="h-6 w-6" />
                </div>
                <p className="font-grotesk text-lg font-bold text-neutral-50">
                  Inscripciones abren el {ENROLLMENT_OPENS_LABEL}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-300">
                  La primera convocatoria del Diplomado Apostólico Pastoral
                  abre inscripciones el <strong>01 de Junio de 2026</strong>.
                  En esa fecha podrás activar tu suscripción y asegurar tu
                  lugar.
                </p>
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-brand-violet/30 bg-brand-violet/[0.08] p-3 text-left">
                  <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-brand-violet" />
                  <div className="text-sm leading-relaxed text-neutral-200">
                    <p className="font-semibold text-neutral-50">
                      Clases comienzan oficialmente
                    </p>
                    <p className="capitalize text-neutral-400">
                      {CLASSES_START_LABEL}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Reveal>
      </main>
      <DapPublicFooter />
    </div>
  );
}
