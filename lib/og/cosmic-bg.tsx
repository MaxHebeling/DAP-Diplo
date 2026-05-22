// Helpers compartidos para OG images. Mantiene el mismo lenguaje visual
// que la home (app/opengraph-image.tsx): cosmic gradient + glows violeta/
// coral, logo branded, tipografía blanca en gradient para destacar.
//
// Cada ruta dinámica usa Image({ params }) que arma su contenido y
// envuelve con CosmicWrapper para mantener consistencia.

import { readFile } from "fs/promises";
import { join } from "path";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png" as const;

/** Lee el logo blanco del DAP como data URL (necesario en ImageResponse). */
export async function loadLogoDataUrl(): Promise<string> {
  const buf = await readFile(
    join(process.cwd(), "public", "dap-logo-white.png"),
  );
  return `data:image/png;base64,${buf.toString("base64")}`;
}

/** Background cosmic — mismo que la home. */
export const COSMIC_BG: string = [
  "linear-gradient(180deg, #07142B 0%, #241E72 50%, #07142B 100%)",
  "radial-gradient(circle at 30% 42%, rgba(123,97,255,0.45) 0%, transparent 55%)",
  "radial-gradient(circle at 72% 58%, rgba(255,77,109,0.38) 0%, transparent 55%)",
].join(", ");

/** Colors */
export const COLORS = {
  textPrimary: "#FFFFFF",
  textSecondary: "#94A3B8",
  brandViolet: "#7B61FF",
  brandCoral: "#FF4D6D",
  surfaceBase: "#07142B",
};

/**
 * Card horizontal con logo a la izquierda + contenido a la derecha.
 * Layout usado por todos los OG de ruta profunda para mantener consistencia.
 */
export function CosmicLayout({
  logoSrc,
  eyebrow,
  title,
  subtitle,
  footer,
}: {
  logoSrc: string;
  /** Texto pequeño uppercase arriba del título (ej. "BLOQUE 01"). */
  eyebrow?: string;
  /** Título principal (ej. nombre del bloque o rango). */
  title: string;
  /** Subtítulo descriptivo (ej. promise, dimensión). */
  subtitle?: string;
  /** Pie pequeño (ej. "dapglobal.org · $25/mes"). */
  footer?: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: COLORS.surfaceBase,
        backgroundImage: COSMIC_BG,
        padding: "72px 80px",
        fontFamily: "sans-serif",
      }}
    >
      {/* Header: logo + tagline */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}
      >
        {/* next/og's ImageResponse renderea en un canvas server-side y
            sólo entiende <img> nativo — no acepta next/image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt=""
          width={64}
          height={64}
          style={{
            filter: "drop-shadow(0 0 24px rgba(123,97,255,0.6))",
          }}
        />
        <div
          style={{
            color: COLORS.textSecondary,
            fontSize: 18,
            letterSpacing: 6,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          DAP · Diplomado Apostólico Pastoral
        </div>
      </div>

      {/* Center block: eyebrow + title + subtitle */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          maxWidth: 1040,
        }}
      >
        {eyebrow && (
          <div
            style={{
              color: COLORS.brandCoral,
              fontSize: 22,
              letterSpacing: 6,
              textTransform: "uppercase",
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            {eyebrow}
          </div>
        )}
        <div
          style={{
            color: COLORS.textPrimary,
            fontSize: 84,
            lineHeight: 1.05,
            fontWeight: 800,
            letterSpacing: -1,
            // Limitar a 2 líneas máximo con un height generoso.
            display: "flex",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              color: COLORS.textSecondary,
              fontSize: 28,
              lineHeight: 1.4,
              marginTop: 20,
              maxWidth: 900,
              display: "flex",
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {/* Footer: domain + call to action */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: COLORS.textSecondary,
          fontSize: 18,
          fontWeight: 500,
        }}
      >
        <span>{footer ?? "dapglobal.org"}</span>
        <span style={{ color: COLORS.brandViolet, fontWeight: 700 }}>
          $25 USD/mes · 18 meses
        </span>
      </div>
    </div>
  );
}
