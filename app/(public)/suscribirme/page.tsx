import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
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
import { isArgentina, resolveVisitorCountry } from "@/lib/launch/country";
import { MP_MONTHLY_ARS } from "@/lib/mercadopago/config";
import { CalendarClock, GraduationCap } from "lucide-react";

// Force dynamic — la página depende de auth (admin bypass) y status
// de subscription. Sin esto Next 16 puede cachearla agresivamente y
// servir la versión "coming soon" a usuarios admin recién logueados.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("Auth");
  return {
    title: t("subscribe.metaTitle"),
    description: t("subscribe.metaDescription"),
    alternates: { canonical: "/suscribirme" },
    openGraph: {
      type: "website" as const,
      url: "/suscribirme",
      title: t("subscribe.ogTitle"),
      description: t("subscribe.ogDescription"),
    },
  };
}

type SearchParams = Promise<{ cc?: string }>;

export default async function SuscribirmePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations("Auth");
  const sp = await searchParams;
  const visitorCountry = await resolveVisitorCountry(sp);
  const fromArgentina = isArgentina(visitorCountry);
  const INCLUDED = [
    t("subscribe.included.item1"),
    t("subscribe.included.item2"),
    t("subscribe.included.item3"),
    t("subscribe.included.item4"),
    t("subscribe.included.item5"),
    t("subscribe.included.item6"),
    t("subscribe.included.item7"),
  ];

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
              {t("subscribe.backToHome")}
            </Link>

            <p className="mb-4 text-xs font-medium uppercase tracking-[0.32em] text-brand-coral">
              {t("subscribe.eyebrow")}
            </p>
            <h1 className="mb-5 font-serif text-balance text-4xl font-semibold leading-tight sm:text-5xl">
              {t("subscribe.title")}
            </h1>
            <p className="mb-10 max-w-xl text-justify text-base leading-relaxed text-neutral-300 hyphens-auto">
              {t("subscribe.intro")}
            </p>

            <div className="mb-10 rounded-2xl border border-white/10 bg-neutral-900/40 p-8 sm:p-10">
              <div className="mb-7 flex items-end justify-between">
                <div>
                  <p className="font-serif text-5xl font-semibold text-neutral-50 sm:text-6xl">
                    {t("subscribe.price")}
                  </p>
                  <p className="mt-1 text-sm text-neutral-400">
                    {t("subscribe.priceUnit")}
                  </p>
                </div>
                <p className="text-xs font-medium uppercase tracking-widest text-brand-coral">
                  {t("subscribe.planSingle")}
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

            {isEnrollmentOpen() ? (
              fromArgentina ? (
                <>
                  <form
                    action="/api/checkout/create-mp-subscription"
                    method="POST"
                    className="w-full space-y-3"
                  >
                    <div className="rounded-lg border border-[#00B1EA]/40 bg-[#00B1EA]/[0.06] p-4">
                      <div className="flex items-start gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Mercado_Pago_logo.svg/320px-Mercado_Pago_logo.svg.png"
                          alt="Mercado Pago"
                          width="80"
                          height="40"
                          className="shrink-0 rounded-md bg-white p-1.5"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-neutral-50">
                            Pago con Mercado Pago
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-neutral-300">
                            <strong className="text-neutral-50">{MP_MONTHLY_ARS.toLocaleString("es-AR")} ARS/mes</strong> · Pagás con saldo MP, transferencia bancaria, RapiPago, PagoFácil o Pago Mis Cuentas. <strong className="text-neutral-50">Sin tarjeta.</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                    <input
                      type="text"
                      name="coupon"
                      placeholder="Código promocional (opcional)"
                      autoComplete="off"
                      autoCapitalize="characters"
                      className="h-11 w-full rounded-lg border border-white/10 bg-neutral-900/60 px-4 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-brand-coral focus:outline-none"
                    />
                    <Button
                      type="submit"
                      size="lg"
                      className="h-12 w-full bg-brand-coral px-7 text-base font-medium text-brand-coral-foreground hover:bg-brand-coral/90"
                    >
                      Continuar con Mercado Pago
                    </Button>
                  </form>
                  <p className="mt-5 text-center text-xs text-neutral-500">
                    Te redirigimos a Mercado Pago para elegir el método de pago.
                  </p>
                </>
              ) : (
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
                      {t("subscribe.continueToPayment")}
                    </Button>
                  </form>
                  <p className="mt-5 text-center text-xs text-neutral-500">
                    {t("subscribe.paymentNote")}
                  </p>
                </>
              )
            ) : (
              <div className="w-full rounded-2xl border border-brand-coral/30 bg-brand-coral/[0.06] p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-coral/10 text-brand-coral">
                  <CalendarClock className="h-6 w-6" />
                </div>
                <p className="font-grotesk text-lg font-bold text-neutral-50">
                  {t("subscribe.enrollmentClosed.title", {
                    date: ENROLLMENT_OPENS_LABEL,
                  })}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-300">
                  {t.rich("subscribe.enrollmentClosed.body", {
                    launchDate: t("subscribe.enrollmentClosed.launchDate"),
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
                </p>
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-brand-violet/30 bg-brand-violet/[0.08] p-3 text-left">
                  <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-brand-violet" />
                  <p className="text-sm leading-relaxed text-neutral-200">
                    <span className="font-semibold text-neutral-50">
                      {t("subscribe.enrollmentClosed.classesStartLabel")}
                    </span>{" "}
                    <span className="capitalize text-neutral-400">
                      {CLASSES_START_LABEL}
                    </span>
                  </p>
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
