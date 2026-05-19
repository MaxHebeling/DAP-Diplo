export const metadata = { title: "DAP — Design Tokens (dev)" };

type Swatch = {
  name: string;
  cssVar: string;
  hex: string;
  utility: string;
};

const SURFACE_SWATCHES: Swatch[] = [
  { name: "surface-base", cssVar: "--surface-base", hex: "#07142B", utility: "bg-surface-base" },
  { name: "surface-elevated", cssVar: "--surface-elevated", hex: "#111827", utility: "bg-surface-elevated" },
  { name: "surface-overlay", cssVar: "--surface-overlay", hex: "rgba(15,23,42,0.9)", utility: "bg-surface-overlay" },
];

const BRAND_SWATCHES: Swatch[] = [
  { name: "brand-violet", cssVar: "--brand-violet", hex: "#7B61FF", utility: "bg-brand-violet" },
  { name: "brand-coral", cssVar: "--brand-coral", hex: "#FF4D6D", utility: "bg-brand-coral" },
  { name: "brand-deep", cssVar: "--brand-deep", hex: "#241E72", utility: "bg-brand-deep" },
  { name: "brand-amber (legacy)", cssVar: "--brand-amber", hex: "oklch(0.81 0.136 64.7) — #fdad5a", utility: "bg-brand-amber" },
];

const TEXT_SWATCHES: Swatch[] = [
  { name: "text-primary", cssVar: "--text-primary", hex: "#F8FAFC", utility: "text-text-primary" },
  { name: "text-secondary", cssVar: "--text-secondary", hex: "#94A3B8", utility: "text-text-secondary" },
  { name: "text-tertiary", cssVar: "--text-tertiary", hex: "#64748B", utility: "text-text-tertiary" },
];

const TYPE_SCALE = [
  { name: "text-display", utility: "text-display font-grotesk", sample: "Diplomado Apostólico" },
  { name: "text-h1", utility: "text-h1 font-grotesk", sample: "Formación Integral" },
  { name: "text-h2", utility: "text-h2 font-grotesk", sample: "Bloques Temáticos" },
  { name: "text-h3", utility: "text-h3 font-grotesk", sample: "Subsection title" },
  { name: "text-h4", utility: "text-h4 font-grotesk", sample: "Component title" },
  { name: "text-base · font-inter", utility: "text-base font-inter", sample: "Cuerpo de párrafo en Inter regular. The quick brown fox 0123456789." },
  { name: "text-sm · font-inter", utility: "text-sm font-inter", sample: "Texto secundario / captions." },
  { name: "text-xs · font-inter", utility: "text-xs font-inter", sample: "MICROCOPY / BADGES" },
];

const RADII = [
  { name: "rounded-sm", utility: "rounded-sm", pixels: "6px" },
  { name: "rounded-md", utility: "rounded-md", pixels: "10px" },
  { name: "rounded-lg", utility: "rounded-lg", pixels: "14px" },
  { name: "rounded-xl", utility: "rounded-xl", pixels: "20px" },
  { name: "rounded-full", utility: "rounded-full", pixels: "9999px" },
];

const SHADOWS = [
  { name: "shadow-card", utility: "shadow-card" },
  { name: "shadow-modal", utility: "shadow-modal" },
  { name: "shadow-glow-violet", utility: "shadow-glow-violet" },
  { name: "shadow-glow-coral", utility: "shadow-glow-coral" },
];

function SwatchCard({ swatch }: { swatch: Swatch }) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
      <div className={`h-24 ${swatch.utility}`} />
      <div className="p-3 text-xs font-inter">
        <p className="font-grotesk text-sm font-semibold text-text-primary">{swatch.name}</p>
        <p className="mt-1 text-text-secondary">{swatch.cssVar}</p>
        <p className="mt-0.5 text-text-tertiary">{swatch.hex}</p>
        <p className="mt-2 inline-block rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
          .{swatch.utility}
        </p>
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-grotesk text-h3 font-semibold text-text-primary border-b border-white/10 pb-2 mb-4">
      {children}
    </h2>
  );
}

export default function TokensDevPage() {
  return (
    <div className="min-h-screen bg-surface-base text-text-primary font-inter">
      <div className="mx-auto max-w-6xl px-6 py-12 space-y-12">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-widest text-brand-violet">
            DAP · Design tokens · dev
          </p>
          <h1 className="font-grotesk text-display gradient-text leading-none">
            Design System v2
          </h1>
          <p className="max-w-2xl text-text-secondary">
            QA visual de los tokens base del DAP (dark-tech-premium). Si algo aquí no se ve correctamente, las fases B-E no pueden empezar.
          </p>
        </header>

        <section>
          <SectionHeading>Surfaces</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SURFACE_SWATCHES.map((s) => <SwatchCard key={s.name} swatch={s} />)}
          </div>
        </section>

        <section>
          <SectionHeading>Brand</SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {BRAND_SWATCHES.map((s) => <SwatchCard key={s.name} swatch={s} />)}
          </div>
        </section>

        <section>
          <SectionHeading>Text</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TEXT_SWATCHES.map((s) => (
              <div key={s.name} className="rounded-lg border border-white/10 bg-surface-elevated p-4">
                <p className={`font-grotesk text-h4 ${s.utility}`}>The quick brown fox</p>
                <p className="mt-3 text-xs text-text-tertiary">{s.cssVar} · {s.hex}</p>
                <p className="mt-1 inline-block rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                  .{s.utility}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeading>Gradientes</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="overflow-hidden rounded-xl border border-white/10">
              <div className="h-40 bg-gradient-brand" />
              <div className="p-4 text-sm">
                <p className="font-grotesk font-semibold">gradient-brand</p>
                <p className="text-text-secondary text-xs mt-1">linear-gradient(135deg, #7B61FF → #FF4D6D)</p>
                <p className="mt-2 inline-block rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                  .bg-gradient-brand
                </p>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <div className="h-40 bg-gradient-cosmic" />
              <div className="p-4 text-sm">
                <p className="font-grotesk font-semibold">gradient-cosmic</p>
                <p className="text-text-secondary text-xs mt-1">linear-gradient(180deg, navy → deep → navy)</p>
                <p className="mt-2 inline-block rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                  .bg-gradient-cosmic
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <SectionHeading>Tipografía y escala</SectionHeading>
          <div className="space-y-6 rounded-xl border border-white/10 bg-surface-elevated p-6">
            {TYPE_SCALE.map((t) => (
              <div key={t.name} className="flex flex-col gap-2 border-b border-white/5 pb-4 last:border-none last:pb-0">
                <p className={t.utility}>{t.sample}</p>
                <p className="text-xs text-text-tertiary">
                  <span className="font-mono">{t.name}</span> · <span className="font-mono">.{t.utility}</span>
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeading>Border radius</SectionHeading>
          <div className="grid grid-cols-5 gap-4">
            {RADII.map((r) => (
              <div key={r.name} className="text-center">
                <div className={`mx-auto h-20 w-20 bg-brand-violet ${r.utility}`} />
                <p className="mt-2 font-mono text-xs text-text-secondary">{r.name}</p>
                <p className="text-xs text-text-tertiary">{r.pixels}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeading>Sombras</SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 p-6 bg-surface-base">
            {SHADOWS.map((s) => (
              <div key={s.name} className="text-center">
                <div className={`mx-auto h-24 w-24 rounded-lg bg-surface-elevated ${s.utility}`} />
                <p className="mt-3 font-mono text-xs text-text-secondary">{s.name}</p>
                <p className="mt-1 font-mono text-[10px] text-text-tertiary">.{s.utility}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeading>Helpers</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-surface-elevated p-6">
              <p className="font-grotesk text-h2 gradient-text font-bold">.gradient-text</p>
              <p className="mt-2 text-sm text-text-secondary">Texto con el gradiente brand aplicado al fill.</p>
            </div>
            <div className="glass rounded-xl p-6">
              <p className="font-grotesk text-h3 text-text-primary">.glass</p>
              <p className="mt-2 text-sm text-text-secondary">Glassmorphism oscuro: bg white/3% + blur xl + border subtle.</p>
            </div>
          </div>
        </section>

        <footer className="pt-12 text-xs text-text-tertiary border-t border-white/10">
          Página interna de QA · DAP design system v2 · ver <code className="font-mono">DESIGN-SYSTEM.md</code>.
        </footer>
      </div>
    </div>
  );
}
