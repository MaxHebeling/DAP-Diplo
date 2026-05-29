import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Download,
  ShieldX,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { signedCertificateUrl } from "@/lib/certificates/upload";
import { DapPublicFooter } from "@/components/layouts/dap-public-footer";

type PageProps = { params: Promise<{ code: string }> };

type VerifyRow = {
  full_name: string;
  phase_order_index: number;
  phase_title: string;
  dimension_name: string | null;
  issued_at: string;
  pdf_url: string | null;
};

const MONTH_KEYS = [
  "monthJanuary",
  "monthFebruary",
  "monthMarch",
  "monthApril",
  "monthMay",
  "monthJune",
  "monthJuly",
  "monthAugust",
  "monthSeptember",
  "monthOctober",
  "monthNovember",
  "monthDecember",
] as const;

function formatIssuedAt(
  iso: string,
  t: Awaited<ReturnType<typeof getTranslations>>,
): string {
  const d = new Date(iso);
  return t("verify.issuedDate", {
    day: d.getUTCDate(),
    month: t(`verify.${MONTH_KEYS[d.getUTCMonth()]}`),
    year: d.getUTCFullYear(),
  });
}

export async function generateMetadata({ params }: PageProps) {
  const { code } = await params;
  const t = await getTranslations("PublicPages");
  return {
    title: t("verify.metaTitle", { code }),
    description: t("verify.metaDescription"),
    robots: { index: false, follow: true },
  };
}

export default async function VerifyCertificatePage({ params }: PageProps) {
  const { code } = await params;
  const t = await getTranslations("PublicPages");
  // Normaliza el code (los códigos son 8-hex upper). Tolerante a lower-case.
  const normalized = code.trim().toUpperCase();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_certificate", {
    p_code: normalized,
  });

  if (error) {
    console.error("[verify] rpc verify_certificate failed:", error);
    return <VerificationError code={normalized} />;
  }
  const rows = (data ?? []) as VerifyRow[];
  const cert = rows[0];
  if (!cert) {
    return <VerificationError code={normalized} />;
  }

  // Signed URL 5 min para descarga / vista del PDF (si ya está subido).
  let signedUrl: string | null = null;
  if (cert.pdf_url) {
    try {
      const admin = createAdminClient();
      // Reusa el helper, pero acepta TTL custom
      void admin; // ya usado vía signedCertificateUrl
      signedUrl = await signedCertificateUrl(cert.pdf_url, 300);
    } catch (err) {
      // Si el PDF aún no se subió o expiró el bucket, no rompemos la página.
      console.error("[verify] signed URL failed:", err);
    }
  }

  const phaseN = String(cert.phase_order_index).padStart(2, "0");

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-brand-coral"
        >
          <ArrowLeft className="size-3.5" />
          {t("verify.home")}
        </Link>

        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          {/* Banner verde */}
          <div className="flex items-center gap-4 border-b bg-emerald-500/10 px-8 py-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/20">
              <BadgeCheck className="size-6 text-emerald-600" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                {t("verify.verifiedLabel")}
              </p>
              <p className="font-grotesk text-2xl font-semibold leading-tight text-emerald-900 dark:text-emerald-100">
                {t("verify.verifiedStatus")}
              </p>
            </div>
          </div>

          <div className="px-8 py-8 space-y-6">
            <DataRow
              icon={<UserIcon className="size-4" />}
              label={t("verify.rowGrantedTo")}
              value={cert.full_name}
              big
            />
            <DataRow
              icon={null}
              label={t("verify.rowForCompleting")}
              value={t("verify.rowPhaseValue", {
                number: phaseN,
                title: cert.phase_title,
              })}
            />
            {cert.dimension_name && (
              <DataRow
                icon={null}
                label={t("verify.rowDimensionReached")}
                value={cert.dimension_name}
                emphColor
              />
            )}
            <DataRow
              icon={<CalendarDays className="size-4" />}
              label={t("verify.rowIssuedDate")}
              value={formatIssuedAt(cert.issued_at, t)}
            />
            <div className="border-t pt-6">
              <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {t("verify.verificationCodeLabel")}
              </p>
              <p className="font-mono text-lg font-bold tracking-[0.25em] text-foreground">
                {normalized}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              {signedUrl ? (
                <Button render={<a href={signedUrl} target="_blank" rel="noopener noreferrer" />}>
                  <Download className="size-4" />
                  {t("verify.viewPdf")}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("verify.pdfNotAvailable")}
                </p>
              )}
              <Button variant="outline" render={<Link href="/" />}>
                {t("verify.goToDiplomado")}
              </Button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("verify.footerNote")}
        </p>
      </div>
      <DapPublicFooter />
    </main>
  );
}

function DataRow({
  icon,
  label,
  value,
  big = false,
  emphColor = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  big?: boolean;
  emphColor?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p
        className={[
          big ? "font-grotesk text-2xl font-semibold" : "text-base font-medium",
          emphColor ? "text-brand-coral" : "text-foreground",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

async function VerificationError({ code }: { code: string }) {
  const t = await getTranslations("PublicPages");
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-brand-coral"
        >
          <ArrowLeft className="size-3.5" />
          {t("verify.home")}
        </Link>

        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center gap-4 border-b bg-red-500/10 px-8 py-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-red-500/20">
              <ShieldX className="size-6 text-red-600" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-red-700 dark:text-red-400">
                {t("verify.errorLabel")}
              </p>
              <p className="font-grotesk text-2xl font-semibold leading-tight text-red-900 dark:text-red-100">
                {t("verify.errorStatus")}
              </p>
            </div>
          </div>

          <div className="px-8 py-8 space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("verify.errorBodyPre")}
              <span className="font-mono font-bold text-foreground">
                {code}
              </span>
              {t("verify.errorBodyPost")}
            </p>
            <div className="pt-2">
              <Button variant="outline" render={<Link href="/" />}>
                {t("verify.backToHome")}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <DapPublicFooter />
    </main>
  );
}
