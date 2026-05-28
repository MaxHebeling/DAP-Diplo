import { Link } from "@/i18n/navigation";
import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { Reveal } from "@/components/landing/reveal";
import { DapPublicFooter } from "@/components/layouts/dap-public-footer";

export async function generateMetadata() {
  const t = await getTranslations("Auth");
  return {
    title: t("subscribeSuccess.metaTitle"),
    robots: { index: false, follow: true },
  };
}

export default async function SubscribeSuccessPage() {
  const t = await getTranslations("Auth");
  return (
    <div className="flex flex-1 flex-col bg-neutral-950 text-neutral-50">
      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <Reveal>
          <div className="mx-auto max-w-md text-center">
            <div className="mb-10 flex justify-center">
              <Logo size="lg" variant="light" />
            </div>
            <div className="mx-auto mb-8 flex size-16 items-center justify-center rounded-full bg-brand-coral/15">
              <Check
                className="size-8 text-brand-coral"
                strokeWidth={2.5}
                aria-hidden
              />
            </div>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.32em] text-brand-coral">
              {t("subscribeSuccess.eyebrow")}
            </p>
            <h1 className="mb-6 font-serif text-balance text-4xl font-semibold leading-tight sm:text-5xl">
              {t("subscribeSuccess.title")}
            </h1>
            <p className="mb-10 text-base leading-relaxed text-neutral-300">
              {t("subscribeSuccess.body")}
            </p>
            <Button
              size="lg"
              className="h-12 bg-brand-coral px-8 text-base font-medium text-brand-coral-foreground hover:bg-brand-coral/90"
              render={<Link href="/dashboard" />}
            >
              {t("subscribeSuccess.goToDashboard")}
            </Button>
            <p className="mt-5 text-xs text-neutral-500">
              {t("subscribeSuccess.accessNote")}
            </p>
          </div>
        </Reveal>
      </main>
      <DapPublicFooter />
    </div>
  );
}
