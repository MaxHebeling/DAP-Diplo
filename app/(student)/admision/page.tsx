import { redirect } from "next/navigation";
import Image from "next/image";

import { createClient } from "@/lib/supabase/server";
import { AdmissionForm } from "./admission-form";

export const metadata = {
  title: "Admisión — DAP",
  description:
    "Completá tu formulario de admisión al Diplomado Apostólico Pastoral.",
};

type ProfileRow = {
  full_name: string;
  admission_status: string;
};

export default async function AdmisionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/admision");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, admission_status")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  // Si ya hay solicitud en marcha (pending/under_review/approved/rejected)
  // → redirigir a /admision/estado. Solo 'none' permite mostrar el form.
  if (profile && profile.admission_status !== "none") {
    redirect("/admision/estado");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-surface-base text-text-primary">
      {/* Background ambient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(123,97,255,0.12),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(40%_40%_at_70%_30%,rgba(255,77,109,0.08),transparent_70%)]"
      />

      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-20">
        {/* Header */}
        <header className="mb-12 text-center">
          <Image
            src="/dap-logo-white.png"
            alt="DAP"
            width={56}
            height={56}
            className="mx-auto size-14 rounded-lg"
            priority
          />
          <p className="mt-6 font-inter text-xs font-medium uppercase tracking-[0.3em] text-brand-coral">
            Diplomado Apostólico Pastoral
          </p>
          <h1 className="mt-3 font-grotesk text-h2 font-bold leading-tight text-text-primary">
            Tu formulario de admisión
          </h1>
          <p className="mx-auto mt-4 max-w-xl font-inter text-base leading-relaxed text-text-secondary">
            Completá estos datos para que el equipo de admisiones revise tu
            solicitud. Te avisaremos por email apenas esté lista.
          </p>
        </header>

        {/* Form */}
        <AdmissionForm
          prefill={{
            fullName: profile?.full_name ?? "",
            email: user.email ?? "",
          }}
        />

        <p className="mt-10 text-center font-inter text-xs text-text-tertiary">
          ¿Dudas? Escribinos a{" "}
          <a
            href="mailto:admisiones@dapglobal.org"
            className="text-brand-coral hover:underline"
          >
            admisiones@dapglobal.org
          </a>
          .
        </p>
      </div>
    </main>
  );
}
