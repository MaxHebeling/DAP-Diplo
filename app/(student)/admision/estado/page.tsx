import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  CheckCircle2,
  Clock,
  FileSearch,
  Home,
  Mail,
  XCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { DapButton } from "@/components/ui-dap/button";

export async function generateMetadata() {
  const t = await getTranslations("Student");
  return { title: t("admissionStatus.metaTitle") };
}

type ProfileRow = {
  full_name: string;
  admission_status: string;
};

type AdmissionRow = {
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function AdmisionEstadoPage() {
  const supabase = await createClient();
  const t = await getTranslations("Student");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/admision/estado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, admission_status")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (!profile) throw new Error("Tu perfil no existe en la base de datos.");

  // Si todavía no envió nada → volver al formulario.
  if (profile.admission_status === "none") {
    redirect("/admision");
  }

  // Si ya está aprobado → al dashboard.
  if (profile.admission_status === "approved") {
    redirect("/dashboard");
  }

  // Última admission del usuario (puede haber más de una si re-aplicó).
  const { data: admission } = await supabase
    .from("admissions")
    .select("status, submitted_at, reviewed_at, rejection_reason")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle<AdmissionRow>();

  const status = (admission?.status ?? profile.admission_status) as
    | "pending"
    | "under_review"
    | "rejected";

  const submittedAt = formatDate(admission?.submitted_at ?? null);

  return (
    <main className="relative min-h-screen overflow-hidden bg-surface-base text-text-primary">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(123,97,255,0.12),transparent_70%)]"
      />

      <div className="mx-auto w-full max-w-2xl px-6 py-16 sm:py-20">
        <header className="mb-10 text-center">
          <Image
            src="/dap-logo-white.png"
            alt={t("admissionStatus.logoAlt")}
            width={48}
            height={48}
            className="mx-auto size-12 rounded-lg"
            priority
          />
          <p className="mt-6 font-inter text-xs font-medium uppercase tracking-[0.3em] text-brand-coral">
            {t("admissionStatus.eyebrow")}
          </p>
          <h1 className="mt-3 font-grotesk text-h2 font-bold leading-tight">
            {t("admissionStatus.greeting", {
              firstName: profile.full_name.split(" ")[0],
            })}
          </h1>
        </header>

        {status === "pending" && (
          <StateCard
            icon={<Clock className="size-7 text-amber-400" strokeWidth={1.7} />}
            ring="border-amber-400/30 bg-amber-500/[0.04]"
            title={t("admissionStatus.pending.title")}
            description={t("admissionStatus.pending.description")}
            meta={
              submittedAt
                ? t("admissionStatus.submittedAt", { date: submittedAt })
                : null
            }
          />
        )}

        {status === "under_review" && (
          <StateCard
            icon={
              <FileSearch
                className="size-7 text-brand-violet"
                strokeWidth={1.7}
              />
            }
            ring="border-brand-violet/30 bg-brand-violet/[0.04]"
            title={t("admissionStatus.underReview.title")}
            description={t("admissionStatus.underReview.description")}
            meta={
              submittedAt
                ? t("admissionStatus.submittedAt", { date: submittedAt })
                : null
            }
          />
        )}

        {status === "rejected" && (
          <StateCard
            icon={
              <XCircle className="size-7 text-brand-coral" strokeWidth={1.7} />
            }
            ring="border-brand-coral/30 bg-brand-coral/[0.04]"
            title={t("admissionStatus.rejected.title")}
            description={
              admission?.rejection_reason ??
              t("admissionStatus.rejected.description")
            }
            meta={
              admission?.reviewed_at
                ? t("admissionStatus.reviewedAt", {
                    date: formatDate(admission.reviewed_at) ?? "",
                  })
                : null
            }
          />
        )}

        {/* Bonus: approved fallback (no debería llegar acá por el redirect, pero por seguridad) */}
        {status !== "pending" &&
          status !== "under_review" &&
          status !== "rejected" && (
            <StateCard
              icon={
                <CheckCircle2
                  className="size-7 text-emerald-400"
                  strokeWidth={1.7}
                />
              }
              ring="border-emerald-400/30 bg-emerald-500/[0.04]"
              title={t("admissionStatus.approved.title")}
              description={t("admissionStatus.approved.description")}
              meta={null}
            />
          )}

        {/* Acciones */}
        <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
          <DapButton
            size="lg"
            render={<Link href="/" />}
          >
            <Home />
            {t("common.backToHome")}
          </DapButton>
          <DapButton
            variant="secondary"
            size="lg"
            render={<Link href="mailto:admisiones@dapglobal.org" />}
          >
            <Mail />
            {t("admissionStatus.contact")}
          </DapButton>
        </div>

        <p className="mt-6 text-center font-inter text-xs text-text-tertiary">
          {t("admissionStatus.spamNote")}
        </p>
      </div>
    </main>
  );
}

function StateCard({
  icon,
  ring,
  title,
  description,
  meta,
}: {
  icon: React.ReactNode;
  ring: string;
  title: string;
  description: string;
  meta: string | null;
}) {
  return (
    <div
      className={`rounded-2xl border p-8 text-center backdrop-blur-sm ${ring}`}
    >
      <div className="mx-auto mb-4 inline-flex items-center justify-center">
        {icon}
      </div>
      <h2 className="font-grotesk text-h4 font-semibold text-text-primary">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-md font-inter text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
      {meta && (
        <p className="mt-4 font-inter text-xs text-text-tertiary">{meta}</p>
      )}
    </div>
  );
}
