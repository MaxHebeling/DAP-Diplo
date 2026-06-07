import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Font } from "@react-pdf/renderer";

/**
 * Paths a los assets (logos + firma) e instalación de tipografías para
 * el PDF del brief. Se cargan al import time — el side-effect de
 * Font.register se ejecuta una sola vez por proceso.
 */

const ASSETS_DIR = join(process.cwd(), "public", "admission-assets");
const FONTS_DIR = join(process.cwd(), "public", "fonts");

export const LOGO_DAP = join(ASSETS_DIR, "logo-dap.png");
export const LOGO_RED = join(ASSETS_DIR, "logo-red-apostolica.png");
export const FIRMA = join(ASSETS_DIR, "firma-max-hebeling.png");

export const SANS = "Inter";
export const SERIF = "EB Garamond";

export const COLORS = {
  ink: "#0B1736",
  inkSoft: "#3A4565",
  inkMuted: "#6B7390",
  violet: "#7B61FF",
  violetDark: "#5B43D1",
  coral: "#FF4D6D",
  coralDark: "#E63E5C",
  divider: "#E2E5F0",
  cardTint: "#FAFAFC",
  cosmic: "#07142B",
} as const;

Font.register({
  family: SANS,
  fonts: [
    { src: join(FONTS_DIR, "Inter-Regular.ttf"), fontWeight: 400 },
    { src: join(FONTS_DIR, "Inter-Medium.ttf"), fontWeight: 500 },
    { src: join(FONTS_DIR, "Inter-SemiBold.ttf"), fontWeight: 600 },
    { src: join(FONTS_DIR, "Inter-Bold.ttf"), fontWeight: 700 },
  ],
});
Font.register({
  family: SERIF,
  fonts: [
    { src: join(FONTS_DIR, "EBGaramond-Regular.ttf"), fontWeight: 400 },
    {
      src: join(FONTS_DIR, "EBGaramond-Italic.ttf"),
      fontWeight: 400,
      fontStyle: "italic",
    },
    { src: join(FONTS_DIR, "EBGaramond-SemiBold.ttf"), fontWeight: 600 },
  ],
});

// Desactivamos hyphenation automática — el español del DAP usa marcas
// duras (em-dash, ·) y la hyphenation default deja palabras cortadas
// que arruinan la justificación.
Font.registerHyphenationCallback((word) => [word]);

export function assertAssetsExist(): void {
  for (const p of [LOGO_DAP, LOGO_RED, FIRMA]) {
    try {
      readFileSync(p);
    } catch {
      throw new Error(
        `Asset faltante: ${p}. Asegúrate de tener logo-dap.png, logo-red-apostolica.png y firma-max-hebeling.png en /public/admission-assets/.`,
      );
    }
  }
}
