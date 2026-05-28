import { FileText, Download, Calendar, GraduationCap } from "lucide-react";
import { getTranslations } from "next-intl/server";

import {
  CLASSES_START_LABEL,
  ENROLLMENT_OPENS_LABEL,
} from "@/lib/launch/config";

export async function generateMetadata() {
  const t = await getTranslations("Admin");
  return { title: t("pastorBrief.metaTitle") };
}

export default async function AdminBriefPastoresPage() {
  const t = await getTranslations("Admin");
  const secciones = [
    {
      n: 1,
      title: t("pastorBrief.section1Title"),
      body: t("pastorBrief.section1Body"),
    },
    {
      n: 2,
      title: t("pastorBrief.section2Title"),
      body: t("pastorBrief.section2Body"),
    },
    {
      n: 3,
      title: t("pastorBrief.section3Title"),
      body: t("pastorBrief.section3Body"),
    },
  ];
  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-coral/15 text-brand-coral">
            <FileText className="size-5" />
          </div>
          <div>
            <p className="font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              {t("pastorBrief.eyebrow")}
            </p>
            <h1 className="mt-1 font-grotesk text-3xl font-bold tracking-tight">
              {t("pastorBrief.title")}
            </h1>
            <p className="mt-2 max-w-2xl font-inter text-sm leading-relaxed text-text-secondary">
              {t("pastorBrief.description")}
            </p>
          </div>
        </header>

        <div className="rounded-2xl border border-brand-violet/25 bg-brand-violet/[0.05] p-6 sm:p-8">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="font-grotesk text-xl font-bold text-text-primary">
                brief-dap-pastores-2026.pdf
              </p>
              <p className="font-inter text-sm text-text-secondary">
                {t("pastorBrief.fileMeta")}
              </p>
            </div>
            <a
              href="/admin/brief-pastores/download"
              download
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-brand-violet to-brand-coral px-6 py-3 font-inter text-sm font-semibold text-white shadow-lg shadow-brand-violet/20 transition-transform hover:scale-[1.02]"
            >
              <Download className="size-4" />
              {t("pastorBrief.downloadPdf")}
            </a>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="font-grotesk text-lg font-semibold text-text-primary">
            {t("pastorBrief.whatsInside")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {secciones.map((s) => (
              <div
                key={s.n}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5"
              >
                <p className="font-grotesk text-2xl font-bold text-brand-violet">
                  0{s.n}
                </p>
                <p className="mt-1 font-grotesk text-sm font-semibold text-text-primary">
                  {s.title}
                </p>
                <p className="mt-2 font-inter text-xs leading-relaxed text-text-secondary">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border border-brand-coral/25 bg-brand-coral/[0.05] p-5">
            <Calendar className="mt-0.5 size-5 shrink-0 text-brand-coral" />
            <div>
              <p className="font-inter text-xs uppercase tracking-widest text-brand-coral">
                {t("pastorBrief.enrollmentOpensLabel")}
              </p>
              <p className="mt-1 font-grotesk text-base font-semibold text-text-primary">
                {ENROLLMENT_OPENS_LABEL}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-brand-violet/25 bg-brand-violet/[0.05] p-5">
            <GraduationCap className="mt-0.5 size-5 shrink-0 text-brand-violet" />
            <div>
              <p className="font-inter text-xs uppercase tracking-widest text-brand-violet">
                {t("pastorBrief.classesStartLabel")}
              </p>
              <p className="mt-1 font-grotesk text-base font-semibold capitalize text-text-primary">
                {CLASSES_START_LABEL}
              </p>
            </div>
          </div>
        </section>

        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-text-tertiary">
          <p className="font-medium text-text-secondary">{t("pastorBrief.notesTitle")}</p>
          <ul className="mt-2 space-y-1">
            <li>{t("pastorBrief.note1Prefix")}{" "}
              <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[11px]">
                lib/brief/generate-pastor-brief.tsx
              </code>
              {" "}{t("pastorBrief.note1Suffix")}
            </li>
            <li>{t("pastorBrief.note2Prefix")}{" "}
              <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[11px]">
                lib/launch/config.ts
              </code>
              {" "}{t("pastorBrief.note2Suffix")}
            </li>
            <li>{t("pastorBrief.note3")}</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
