import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CacheClearClient } from "./cache-clear-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PublicPages");
  return {
    title: t("cacheClear.metaTitle"),
    robots: { index: false, follow: false },
  };
}

export default function CacheClearPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-base px-6 text-text-primary">
      <div className="w-full max-w-md">
        <CacheClearClient />
      </div>
    </main>
  );
}
