import { Bell } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PushTestForm } from "./push-test-form";

export async function generateMetadata() {
  const t = await getTranslations("Admin");
  return {
    title: t("pushTest.metaTitle"),
  };
}

export default async function PushTestPage() {
  const t = await getTranslations("Admin");
  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-brand-coral/30 bg-brand-coral/[0.06] px-3 py-1 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
            <Bell className="size-3" />
            {t("pushTest.eyebrow")}
          </p>
          <h1 className="font-grotesk text-3xl font-bold tracking-tight">
            {t("pushTest.title")}
          </h1>
          <p className="font-inter text-sm text-text-secondary">
            {t("pushTest.description")}
          </p>
        </header>

        <PushTestForm />

        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-text-tertiary">
          <p className="font-medium text-text-secondary">{t("pushTest.notesTitle")}</p>
          <ul className="mt-2 space-y-1">
            <li>{t("pushTest.note1")}</li>
            <li>{t("pushTest.note2")}</li>
            <li>{t("pushTest.note3")}</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
