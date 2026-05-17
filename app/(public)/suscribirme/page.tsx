import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/reveal";
import { SiteHeader, type HeaderUser } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Suscribirme — DAP",
  description:
    "$25 USD al mes. Acceso completo al Diplomado Apostólico Pastoral. Cancela cuando quieras.",
};

const INCLUDED = [
  "Acceso al Bloque 1 desde el día 1, con un bloque nuevo cada 2 meses",
  "MasterClass en vivo los miércoles",
  "Activación práctica los viernes",
  "Mentoría grupal mensual",
  "Comunidad privada de pastores en formación",
  "Material descargable por módulo (PDFs, audios, plantillas)",
  "Certificado, insignia y rango ministerial al completar cada bloque",
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
              de 18 meses. Cada 2 meses se desbloquea un bloque nuevo. Cancela
              cuando quieras desde tu dashboard — tu progreso queda guardado.
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
          </div>
        </Reveal>
      </main>
      <SiteFooter />
    </div>
  );
}
