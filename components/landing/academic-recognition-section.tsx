import { getTranslations } from "next-intl/server";

import { Reveal } from "./reveal";
import { AcademicVideoFrame } from "./academic-video-frame";

/**
 * Sección de respaldo académico institucional (UCM).
 * Ubicación: entre HowItWorks y ModuleStructure en el landing.
 *
 * Layout:
 * - Desktop: 50% video / 50% contenido
 * - Mobile: video primero, contenido segundo
 *
 * Si pasás videoSrc, el play funciona; sin él, muestra "próximamente".
 */
export async function AcademicRecognitionSection({
  videoSrc,
  posterSrc,
}: {
  videoSrc?: string | null;
  posterSrc?: string;
} = {}) {
  const t = await getTranslations("Landing.academicRecognition");

  const cards = [
    { icon: "🏛️", title: t("card1Title"), body: t("card1Body") },
    { icon: "📜", title: t("card2Title"), body: t("card2Body") },
    { icon: "🌎", title: t("card3Title"), body: t("card3Body") },
  ];

  return (
    <section
      id="reconocimiento-academico"
      aria-labelledby="academic-recognition-heading"
      className="relative isolate overflow-hidden border-t border-white/[0.06] bg-[#07142B] px-6 py-28 sm:py-36"
    >
      {/* Fondo futurista — radiales + grid + neural network sutil */}
      <SectionBackdrop />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-20">
        {/* Video (orden mobile = primero; desktop = izquierda) */}
        <div className="order-1 lg:order-1">
          <AcademicVideoFrame
            videoSrc={videoSrc ?? null}
            posterSrc={posterSrc}
            playLabel={t("videoPlay")}
            comingSoonLabel={t("videoComingSoon")}
            directorCaption={t("videoCaption")}
          />
        </div>

        {/* Content */}
        <div className="order-2 lg:order-2">
          <Reveal y={16}>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#7B61FF]/30 bg-[#241E72]/30 px-3.5 py-1.5 font-inter text-[11px] font-semibold uppercase tracking-[0.18em] text-[#F8FAFC]/90 backdrop-blur-sm">
              <span aria-hidden>🎓</span>
              {t("eyebrow")}
            </p>
          </Reveal>

          <Reveal delay={0.05} y={18} tilt={0}>
            <h2
              id="academic-recognition-heading"
              className="font-grotesk text-h1 font-bold leading-[1.05] text-[#F8FAFC]"
            >
              {t("titleLead")}{" "}
              <span className="bg-gradient-to-r from-[#7B61FF] via-[#A78BFA] to-[#FF4D6D] bg-clip-text text-transparent">
                {t("titleHighlight")}
              </span>
              {t("titleTrail")}
            </h2>
          </Reveal>

          <Reveal delay={0.12} y={14} tilt={0}>
            <p className="mt-6 font-grotesk text-lg leading-snug text-[#F8FAFC]/90">
              {t("subheadline")}
            </p>
          </Reveal>

          <Reveal delay={0.18} y={14} tilt={0}>
            <div className="mt-5 space-y-4 font-inter text-base leading-relaxed text-[#F8FAFC]/70">
              <p>{t("body1")}</p>
              <p>{t("body2")}</p>
            </div>
          </Reveal>

          {/* 3 Highlight cards */}
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {cards.map((c, i) => (
              <Reveal key={c.title} delay={0.22 + i * 0.08} y={20} tilt={0}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0F1A38]/80 to-[#070F25]/90 p-5 backdrop-blur-md transition-all duration-500 hover:border-[#7B61FF]/40 hover:shadow-[0_20px_50px_-15px_rgba(123,97,255,0.45)]">
                  {/* Glow halo en hover */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 [background:radial-gradient(60%_50%_at_50%_0%,rgba(123,97,255,0.30),transparent_70%)]"
                  />
                  <div
                    aria-hidden
                    className="text-2xl"
                  >
                    {c.icon}
                  </div>
                  <h3 className="relative mt-3 font-grotesk text-sm font-semibold leading-snug text-[#F8FAFC]">
                    {c.title}
                  </h3>
                  <p className="relative mt-2 font-inter text-[13px] leading-relaxed text-[#F8FAFC]/65">
                    {c.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* Trust indicator */}
      <Reveal delay={0.35} y={12} tilt={0}>
        <div className="relative mx-auto mt-20 max-w-3xl text-center sm:mt-28">
          <div className="mx-auto mb-6 h-px w-24 bg-gradient-to-r from-transparent via-[#7B61FF]/50 to-transparent" />
          <p className="font-grotesk text-xl leading-snug text-[#F8FAFC]/90 sm:text-2xl">
            {t("trustLine1")}
            <br />
            <span className="bg-gradient-to-r from-[#7B61FF] to-[#FF4D6D] bg-clip-text text-transparent">
              {t("trustLine2")}
            </span>
          </p>
        </div>
      </Reveal>
    </section>
  );
}

/**
 * Fondo decorativo: radiales violeta/coral + grid sutil + glow esquinas.
 * Aria-hidden, performance-friendly (CSS puro, sin canvas/JS).
 */
function SectionBackdrop() {
  return (
    <>
      {/* Radial superior izquierda — violeta */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(123,97,255,0.22)_0%,transparent_60%)] blur-3xl"
      />
      {/* Radial inferior derecha — coral */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(255,77,109,0.16)_0%,transparent_60%)] blur-3xl"
      />
      {/* Grid sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #F8FAFC 1px, transparent 1px), linear-gradient(to bottom, #F8FAFC 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* Halo central muy sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/3 mx-auto h-[300px] w-[60%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(36,30,114,0.35)_0%,transparent_70%)] blur-3xl"
      />
    </>
  );
}
