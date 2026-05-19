import type { ReactNode } from "react";

import { signOutAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import {
  DapPublicHeader,
  type DapHeaderUser,
} from "@/components/layouts/dap-public-header";
import { DapPublicFooter } from "@/components/layouts/dap-public-footer";

type LegalPageLayoutProps = {
  eyebrow: string;
  title: string;
  updatedAt: string;
  children: ReactNode;
};

/**
 * Wrapper compartido para páginas legales (/terminos, /privacidad,
 * /reembolso). Header + Footer + hero minimal + container max-w-3xl
 * con estilos de typography legible.
 */
export async function LegalPageLayout({
  eyebrow,
  title,
  updatedAt,
  children,
}: LegalPageLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let headerUser: DapHeaderUser = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile) {
      headerUser = {
        fullName: profile.full_name ?? null,
        avatarUrl: profile.avatar_url ?? null,
        role: profile.role as "student" | "admin",
      };
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-surface-base text-text-primary">
      <DapPublicHeader user={headerUser} onSignOut={signOutAction} />

      <main className="flex flex-1 flex-col">
        <section className="border-b border-white/[0.06] bg-surface-base px-6 pt-28 pb-12">
          <div className="mx-auto max-w-3xl">
            <p className="mb-3 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              {eyebrow}
            </p>
            <h1 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
              {title}
            </h1>
            <p className="mt-4 font-inter text-sm text-text-tertiary">
              Última actualización: {updatedAt}
            </p>
          </div>
        </section>

        <section className="border-b border-white/[0.06] bg-surface-base px-6 py-16">
          <div
            className="mx-auto max-w-3xl space-y-8 font-inter text-base leading-relaxed text-text-secondary
                       [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:font-grotesk [&_h2]:text-h3
                       [&_h2]:font-semibold [&_h2]:text-text-primary
                       [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-grotesk [&_h3]:text-h4
                       [&_h3]:font-semibold [&_h3]:text-text-primary
                       [&_p]:text-justify [&_p]:hyphens-auto
                       [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2
                       [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2
                       [&_strong]:text-text-primary
                       [&_a]:text-brand-coral [&_a:hover]:underline"
          >
            {children}
          </div>
        </section>
      </main>

      <DapPublicFooter />
    </div>
  );
}
