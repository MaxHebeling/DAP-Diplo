import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Sparkles } from "lucide-react";

import { signOutAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

import { DapStudentShell } from "@/components/layouts/dap-student-shell";
import { DapButton } from "@/components/ui-dap/button";

export type ComingSoonAction = {
  href: string;
  label: string;
};

export async function ComingSoonPage({
  topbarTitle,
  eyebrow,
  title,
  description,
  icon: Icon,
  primaryAction,
  secondaryActions,
}: {
  topbarTitle: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  primaryAction?: ComingSoonAction;
  secondaryActions?: ComingSoonAction[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/dashboard`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <DapStudentShell
      userName={profile?.full_name ?? "Alumno"}
      userAvatar={profile?.avatar_url ?? null}
      title={topbarTitle}
      onSignOut={signOutAction}
    >
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-6 inline-flex size-16 items-center justify-center rounded-2xl bg-brand-violet/10 text-brand-violet">
            <Icon className="size-7" strokeWidth={1.6} />
          </div>
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-brand-coral/30 bg-brand-coral/[0.06] px-3 py-1 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
            <Sparkles className="size-3" />
            {eyebrow}
          </p>
          <h1 className="font-grotesk text-h1 font-bold leading-[1.05] text-text-primary sm:text-display">
            {title}
          </h1>
          <p className="mx-auto mt-6 max-w-xl font-inter text-base leading-relaxed text-text-secondary">
            {description}
          </p>

          {(primaryAction || secondaryActions) && (
            <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
              {primaryAction && (
                <DapButton size="lg" render={<Link href={primaryAction.href} />}>
                  {primaryAction.label}
                  <ArrowRight />
                </DapButton>
              )}
              {(secondaryActions ?? []).map((a) => (
                <DapButton
                  key={a.href}
                  variant="secondary"
                  size="lg"
                  render={<Link href={a.href} />}
                >
                  {a.label}
                </DapButton>
              ))}
            </div>
          )}
        </div>
      </div>
    </DapStudentShell>
  );
}
