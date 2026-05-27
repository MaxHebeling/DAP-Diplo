import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import {
  signedAdmissionLetterUrl,
  signedConsentLetterUrl,
} from "@/lib/admission/storage";
import { AdmissionActions } from "./admission-actions";

export async function generateMetadata() {
  const t = await getTranslations("Admin");
  return {
    title: t("admissionDetail.metaTitle"),
  };
}

type T = Awaited<ReturnType<typeof getTranslations>>;

type AdmissionDetail = {
  id: string;
  user_id: string;
  full_name: string;
  birth_date: string | null;
  country: string;
  city: string | null;
  phone: string;
  email: string;
  church_name: string | null;
  ministry_name: string | null;
  profession: string | null;
  company_or_sector: string | null;
  belongs_to_network: boolean;
  network_name: string | null;
  consent_letter_url: string | null;
  status: "pending" | "under_review" | "approved" | "rejected";
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  approved_at: string | null;
  admission_letter_url: string | null;
  admission_letter_sent_at: string | null;
};

type ProfileMini = {
  matricula: string | null;
  program_start_date: string | null;
  admission_status: string;
};

function statusBadge(s: AdmissionDetail["status"], t: T) {
  switch (s) {
    case "pending":
      return <Badge variant="outline">{t("admissionDetail.badgePending")}</Badge>;
    case "under_review":
      return <Badge className="bg-amber-500/15 text-amber-300 hover:bg-amber-500/15">{t("admissionDetail.badgeUnderReview")}</Badge>;
    case "approved":
      return <Badge className="bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15">{t("admissionDetail.badgeApproved")}</Badge>;
    case "rejected":
      return <Badge className="bg-brand-coral/15 text-brand-coral hover:bg-brand-coral/15">{t("admissionDetail.badgeRejected")}</Badge>;
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function formatDateShort(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function networkLabel(d: AdmissionDetail, t: T): string {
  if (!d.belongs_to_network) return t("admissionDetail.networkNoLetter");
  if (d.network_name === "reino_y_avivamiento")
    return t("admissionDetail.networkReino");
  if (d.network_name === "revival_kingdom")
    return t("admissionDetail.networkRevival");
  return t("admissionDetail.networkYesUnspecified");
}

export default async function AdmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Admin");
  const supabase = await createClient();

  const { data: admission, error } = await supabase
    .from("admissions")
    .select(
      "id, user_id, full_name, birth_date, country, city, phone, email, church_name, ministry_name, profession, company_or_sector, belongs_to_network, network_name, consent_letter_url, status, rejection_reason, submitted_at, reviewed_at, reviewed_by, approved_at, admission_letter_url, admission_letter_sent_at",
    )
    .eq("id", id)
    .maybeSingle<AdmissionDetail>();

  if (error) {
    throw new Error(t("admissionDetail.loadError", { message: error.message }));
  }
  if (!admission) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("matricula, program_start_date, admission_status")
    .eq("id", admission.user_id)
    .maybeSingle<ProfileMini>();

  // Signed URLs (24h) — solo si existen.
  const consentUrl = admission.consent_letter_url
    ? await signedConsentLetterUrl(admission.consent_letter_url)
    : null;
  const letterUrl = admission.admission_letter_url
    ? await signedAdmissionLetterUrl(admission.admission_letter_url)
    : null;

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-4xl">
        {/* Top nav */}
        <Link
          href="/admin/admisiones"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {t("admissionDetail.backToAdmissions")}
        </Link>

        {/* Header */}
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              {t("admissionDetail.eyebrow")}
            </p>
            <h1 className="mt-1 font-grotesk text-3xl font-bold tracking-tight">
              {admission.full_name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("admissionDetail.submittedOn", {
                date: formatDate(admission.submitted_at),
              })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {statusBadge(admission.status, t)}
            {profile?.matricula && (
              <p className="font-mono text-xs text-muted-foreground">
                {profile.matricula}
              </p>
            )}
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Datos personales */}
          <DetailCard title={t("admissionDetail.personalDataTitle")}>
            <DetailRow label={t("admissionDetail.rowEmail")} value={admission.email} />
            <DetailRow label={t("admissionDetail.rowPhone")} value={admission.phone} />
            <DetailRow label={t("admissionDetail.rowCountry")} value={admission.country} />
            <DetailRow label={t("admissionDetail.rowCity")} value={admission.city ?? "—"} />
            <DetailRow
              label={t("admissionDetail.rowBirth")}
              value={formatDateShort(admission.birth_date)}
            />
          </DetailCard>

          {/* Pertenencia */}
          <DetailCard title={t("admissionDetail.membershipTitle")}>
            <DetailRow label={t("admissionDetail.rowChurch")} value={admission.church_name ?? "—"} />
            <DetailRow label={t("admissionDetail.rowMinistry")} value={admission.ministry_name ?? "—"} />
            <DetailRow label={t("admissionDetail.rowProfession")} value={admission.profession ?? "—"} />
            <DetailRow
              label={t("admissionDetail.rowCompanySector")}
              value={admission.company_or_sector ?? "—"}
            />
          </DetailCard>

          {/* Red Apostólica */}
          <DetailCard title={t("admissionDetail.networkTitle")} className="md:col-span-2">
            <p className="text-sm text-foreground">{networkLabel(admission, t)}</p>

            {admission.consent_letter_url && (
              <div className="mt-4 rounded-lg border border-brand-violet/25 bg-brand-violet/[0.06] p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  {t("admissionDetail.consentLetterLabel")}
                </p>
                {consentUrl ? (
                  <Link
                    href={consentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-brand-coral hover:underline"
                  >
                    <FileText className="size-4" />
                    {t("admissionDetail.viewSignedLetter")}
                    <ExternalLink className="size-3" />
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("admissionDetail.consentLinkError")}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("admissionDetail.signedLinkNote")}
                </p>
              </div>
            )}
          </DetailCard>

          {/* Estado post-aprobación */}
          {admission.status === "approved" && (
            <DetailCard title={t("admissionDetail.academicDataTitle")} className="md:col-span-2">
              <DetailRow label={t("admissionDetail.rowMatricula")} value={profile?.matricula ?? "—"} />
              <DetailRow
                label={t("admissionDetail.rowProgramStart")}
                value={formatDateShort(profile?.program_start_date ?? null)}
              />
              <DetailRow
                label={t("admissionDetail.rowApproved")}
                value={formatDate(admission.approved_at)}
              />
              <DetailRow
                label={t("admissionDetail.rowLetterSent")}
                value={
                  admission.admission_letter_sent_at
                    ? formatDate(admission.admission_letter_sent_at)
                    : t("admissionDetail.letterPending")
                }
              />
              {letterUrl && (
                <div className="mt-2">
                  <Link
                    href={letterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-brand-coral hover:underline"
                  >
                    <FileText className="size-4" />
                    {t("admissionDetail.downloadLetter")}
                    <ExternalLink className="size-3" />
                  </Link>
                </div>
              )}
            </DetailCard>
          )}

          {/* Rechazo */}
          {admission.status === "rejected" && (
            <DetailCard title={t("admissionDetail.rejectionTitle")} className="md:col-span-2">
              <p className="text-sm text-foreground">
                {admission.rejection_reason ?? "—"}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {t("admissionDetail.rejectedOn", {
                  date: formatDate(admission.reviewed_at),
                })}
              </p>
            </DetailCard>
          )}
        </div>

        {/* Acciones — pending/under_review muestra aprobar/rechazar.
            approved muestra reenviar carta. rejected no muestra nada. */}
        {admission.status !== "rejected" && (
          <div className="mt-8">
            <AdmissionActions
              admissionId={admission.id}
              status={admission.status}
              letterSentAt={admission.admission_letter_sent_at}
            />
          </div>
        )}
      </div>
    </main>
  );
}

function DetailCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm ${className ?? ""}`}
    >
      <p className="mb-3 font-grotesk text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
