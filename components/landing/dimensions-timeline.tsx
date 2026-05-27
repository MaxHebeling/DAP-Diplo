import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
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

import { Reveal } from "@/components/landing/reveal";
import { RANK_TINT, type RankOrder } from "@/components/ui-dap/rank-badge";
import { createClient } from "@/lib/supabase/server";
import { localized } from "@/lib/i18n/localized";
import type { Locale } from "@/i18n/config";

type DimensionRow = {
  order_index: number;
  name: string;
  name_en: string | null;
  description: string | null;
  description_en: string | null;
};

const ICON_BY_RANK: Record<RankOrder, LucideIcon> = {
  1: GraduationCap, // Discípulo
  2: Heart, // Hijo
  3: Users, // Líder
  4: ShieldCheck, // Pastor
  5: Briefcase, // Administrador
  6: Coins, // Mayordomo
  7: Flame, // Reformador
  8: Building2, // Arquitecto
  9: Send, // Enviado
};

export async function DimensionsTimeline() {
  const t = await getTranslations("Landing");
  const locale = (await getLocale()) as Locale;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dimensions")
    .select("order_index, name, name_en, description, description_en")
    .order("order_index", { ascending: true })
    .returns<DimensionRow[]>();

  if (error) {
    throw new Error(`No se pudieron cargar las dimensiones: ${error.message}`);
  }

  const dimensions = data ?? [];

  return (
    <section
      id="dimensiones"
      className="relative isolate overflow-hidden border-t border-white/[0.06] bg-surface-base px-6 py-28 sm:py-36"
    >
      {/* Background photo + tints. Shift hacia la derecha y oculto progresivamente
          el lado izquierdo (donde están las 2 personas que NO van protagónicas). */}
      <Image
        src="/dimensions-bg.jpg"
        alt=""
        fill
        sizes="100vw"
        className="-z-40 object-cover opacity-25 [object-position:65%_center]"
      />
      {/* Gradient lateral: oscurece izq (donde están los 2 que tapamos),
          deja visible el centro-derecha (foco en el 2do hombre desde la derecha) */}
      <div className="absolute inset-0 -z-30 bg-gradient-to-r from-surface-base via-surface-base/80 via-35% to-transparent" />
      {/* Gradient vertical para el fade top/bottom */}
      <div className="absolute inset-0 -z-30 bg-gradient-to-b from-surface-base/70 via-transparent to-surface-base/85" />
      <div className="absolute inset-0 -z-20 bg-brand-violet/10 mix-blend-multiply" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <Reveal>
          <div className="mb-16 max-w-3xl">
            <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              {t("dimensions.eyebrow")}
            </p>
            <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
              {t("dimensions.titleDiscipulo")} <span className="gradient-text">{t("dimensions.titleHijo")}</span> {t("dimensions.titleLiderEnviado")}
            </h2>
            <p className="mt-6 text-justify font-inter text-base leading-relaxed text-text-secondary">
              {t("dimensions.intro")}
            </p>
          </div>
        </Reveal>

        <div className="relative">
          <div
            aria-hidden
            className="absolute left-7 top-4 bottom-4 w-px bg-gradient-to-b from-brand-violet/40 via-white/10 to-brand-coral/40 lg:left-0 lg:right-0 lg:top-10 lg:h-px lg:w-auto lg:bg-gradient-to-r"
          />
          <ol className="grid gap-10 lg:grid-cols-9 lg:gap-4">
            {dimensions.map((r, i) => {
              const order = (r.order_index as RankOrder) ?? 1;
              const Icon = ICON_BY_RANK[order];
              const tint = RANK_TINT[order];
              const breatheDelay = `${i * 0.35}s`;
              const glowDelay = `${i * 0.35 + 0.6}s`;
              const dimName = localized(r, "name", locale) ?? r.name;
              const dimDescription = localized(r, "description", locale);
              return (
                <Reveal key={r.order_index} delay={i * 0.04}>
                  <li className="relative pl-20 lg:pl-0 lg:text-center">
                    <div className="absolute left-0 top-0 lg:static lg:mx-auto lg:mb-6">
                      <div
                        className="group relative inline-flex size-14 items-center justify-center transition-transform duration-300 hover:-translate-y-1"
                        aria-label={dimName}
                      >
                        {/* Glow blob detrás del icono */}
                        <span
                          aria-hidden
                          className="dap-glow-pulse absolute inset-0 rounded-full blur-xl"
                          style={{
                            backgroundColor: tint,
                            animation: "dap-glow-pulse 4.5s ease-in-out infinite",
                            animationDelay: glowDelay,
                          }}
                        />
                        {/* Icono vivo */}
                        <Icon
                          className="dap-breathe relative z-10 size-10 transition-transform duration-300 group-hover:scale-110"
                          strokeWidth={1.6}
                          style={{
                            color: tint,
                            filter: `drop-shadow(0 0 10px ${tint}aa)`,
                            animation: "dap-breathe 3.2s ease-in-out infinite",
                            animationDelay: breatheDelay,
                          }}
                        />
                      </div>
                    </div>
                    <h3 className="mb-1.5 font-grotesk text-h4 font-semibold text-text-primary lg:text-base">
                      {dimName}
                    </h3>
                    {dimDescription && (
                      <p className="font-inter text-xs leading-relaxed text-text-tertiary">
                        {dimDescription.replace(
                          /^Otorgado al completar (la|el) (Fase|Bloque) \d+ — /,
                          "",
                        )}
                      </p>
                    )}
                  </li>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
