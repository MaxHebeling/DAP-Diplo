import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import {
  Briefcase,
  Building2,
  Coins,
  Flame,
  GraduationCap,
  Heart,
  type LucideIcon,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";

import { signOutAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { rankSlug, rankThemeFromDescription } from "@/lib/ranks/slug";
import {
  DapPublicHeader,
  type DapHeaderUser,
} from "@/components/layouts/dap-public-header";
import { DapPublicFooter } from "@/components/layouts/dap-public-footer";
import { DapButton } from "@/components/ui-dap/button";
import {
  DapRankBadge,
  type RankOrder,
} from "@/components/ui-dap/rank-badge";
import { Reveal } from "@/components/landing/reveal";

export const metadata: Metadata = {
  title: "Las 9 Dimensiones del Reino",
  description:
    "Discípulo, Hijo, Líder, Ministro, Administrador, Mayordomo, Reformador, Arquitecto, Enviado. Cada bloque del DAP entrega una dimensión nueva verificable.",
  alternates: { canonical: "/rangos" },
  openGraph: {
    type: "website",
    url: "/rangos",
    title: "Las 9 Dimensiones del Reino · DAP",
    description:
      "Discípulo, Hijo, Líder, Ministro, Administrador, Mayordomo, Reformador, Arquitecto, Enviado — la jornada apostólica completa.",
  },
};

const ICON_BY_RANK: Record<RankOrder, LucideIcon> = {
  1: GraduationCap,
  2: Heart,
  3: Users,
  4: ShieldCheck,
  5: Briefcase,
  6: Coins,
  7: Flame,
  8: Building2,
  9: Send,
};

type DimensionRow = {
  order_index: number;
  name: string;
  description: string | null;
};

export default async function RangosHubPage() {
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

  const { data: dimensions, error } = await supabase
    .from("dimensions")
    .select("order_index, name, description")
    .order("order_index", { ascending: true })
    .returns<DimensionRow[]>();

  if (error) {
    throw new Error(`No se pudieron cargar las dimensiones: ${error.message}`);
  }

  const ranks = dimensions ?? [];

  return (
    <div className="flex flex-1 flex-col bg-surface-base text-text-primary">
      <DapPublicHeader user={headerUser} onSignOut={signOutAction} />

      <main className="flex flex-1 flex-col">
        {/* Hero de la página */}
        <section className="relative isolate overflow-hidden border-b border-white/[0.06] px-6 py-28 sm:py-32">
          <div className="absolute inset-0 -z-30 bg-gradient-cosmic" />
          <div className="absolute inset-0 -z-20 opacity-50 [background:radial-gradient(60%_45%_at_30%_42%,rgba(123,97,255,0.3),transparent_60%),radial-gradient(50%_40%_at_72%_58%,rgba(255,77,109,0.22),transparent_60%)]" />

          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              El recorrido del DAP
            </p>
            <h1 className="font-grotesk text-display font-bold leading-[1.05] text-text-primary">
              Las <span className="gradient-text">9 Dimensiones</span> del Reino
            </h1>
            <p className="mx-auto mt-6 max-w-2xl font-inter text-base leading-relaxed text-text-secondary md:text-lg">
              Cada bloque completado entrega una dimensión ministerial
              verificable. No son títulos honoríficos: son etapas de proceso
              reconocidas dentro del gobierno apostólico del DAP.
            </p>
          </div>
        </section>

        {/* Grid de 9 dimensiones */}
        <section className="border-t border-white/[0.06] bg-surface-base px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ranks.map((r, i) => {
                const order = (r.order_index as RankOrder) ?? 1;
                const Icon = ICON_BY_RANK[order];
                const slug = rankSlug(r.name);
                const theme = rankThemeFromDescription(r.description);
                return (
                  <Reveal key={r.order_index} delay={i * 0.04}>
                    <Link
                      href={`/rangos/${slug}`}
                      className="group relative flex h-full flex-col rounded-xl border border-white/[0.06] bg-surface-elevated p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-violet/30 hover:shadow-glow-violet"
                    >
                      <div className="mb-6 flex items-start justify-between">
                        <DapRankBadge
                          rankOrder={order}
                          size="md"
                          icon={Icon}
                          label={r.name}
                        />
                        <span className="gradient-text font-grotesk text-h4 font-bold leading-none">
                          {String(order).padStart(2, "0")}
                        </span>
                      </div>
                      <h2 className="mb-2 font-grotesk text-h3 font-semibold text-text-primary">
                        {r.name}
                      </h2>
                      {theme && (
                        <p className="font-inter text-sm leading-relaxed text-text-secondary">
                          {theme}
                        </p>
                      )}
                      <div className="mt-auto flex items-center justify-between border-t border-white/[0.05] pt-4 font-inter text-xs">
                        <span className="font-medium uppercase tracking-wider text-brand-coral">
                          Bloque {String(order).padStart(2, "0")}
                        </span>
                        <ArrowRight className="size-4 text-text-tertiary transition-colors group-hover:text-brand-coral" />
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative isolate overflow-hidden border-y border-white/[0.06] px-6 py-24">
          <div className="absolute inset-0 -z-20 bg-gradient-cosmic opacity-90" />
          <div className="absolute inset-0 -z-10 opacity-70 [background:radial-gradient(50%_50%_at_50%_50%,rgba(123,97,255,0.35),transparent_55%)]" />
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
              Empieza tu camino a la <span className="gradient-text">primera dimensión</span>.
            </h2>
            <p className="mt-6 font-inter text-base text-text-secondary md:text-lg">
              La Semana 1 te ubica en el camino de la dimensión Discípulo.
              Después de aprobar los 8 módulos del Bloque 1, la recibes.
            </p>
            <div className="mt-10">
              <DapButton render={<Link href="/suscribirme" />} size="lg">
                Comienza tu transformación
                <ArrowRight />
              </DapButton>
            </div>
          </div>
        </section>
      </main>

      <DapPublicFooter />
    </div>
  );
}
