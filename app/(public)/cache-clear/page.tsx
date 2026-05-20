import type { Metadata } from "next";
import { CacheClearClient } from "./cache-clear-client";

export const metadata: Metadata = {
  title: "Limpiar caché — DAP",
  robots: { index: false, follow: false },
};

export default function CacheClearPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-base px-6 text-text-primary">
      <div className="w-full max-w-md">
        <CacheClearClient />
      </div>
    </main>
  );
}
