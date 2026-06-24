/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer <Image> no acepta alt; el lint rule asume HTML. */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  Document,
  Font,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { type useTranslations } from "next-intl";

// @react-pdf requiere un componente SÍNCRONO; por eso el `t` se resuelve
// en el caller async (lib/certificates/generate.ts) y se pasa como prop.
type CertificateTranslator = ReturnType<typeof useTranslations<"Certificate">>;

/**
 * Certificado de bloque del DAP — pieza ceremonial generada al aprobar
 * los 8 módulos de un bloque.
 *
 * Diseño alineado con la carta de admisión (lib/admission/generate-letter.tsx):
 * misma paleta indigo midnight + coral, mismas bandas top/bottom, mismos
 * logos en header, misma firma del Dr. Max. Pero LANDSCAPE y con el
 * nombre del alumno en script Allura como elemento dominante.
 */

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dapglobal.org";

Font.register({
  family: "Allura",
  src: `${APP_URL}/cert/fonts/Allura-Regular.ttf`,
});

// Assets locales (mismo set que la carta de admisión + UCM cobranding)
const ASSETS_DIR = join(process.cwd(), "public", "admission-assets");
const LOGO_DAP = join(ASSETS_DIR, "logo-dap.png");
const LOGO_RED = join(ASSETS_DIR, "logo-red-apostolica.png");
const LOGO_UCM = join(ASSETS_DIR, "logo-ucm.png");
const FIRMA = join(ASSETS_DIR, "firma-max-hebeling.png");
const FIRMA_LIZBETH = join(ASSETS_DIR, "firma-lizbeth.png");

// Si los assets no existen al cargar el módulo (build time en algunos
// edge cases), no rompemos — el render fallará después con un error
// claro si realmente faltan.
function assetExists(p: string): boolean {
  try {
    readFileSync(p);
    return true;
  } catch {
    return false;
  }
}
const HAS_FIRMA = existsSync(FIRMA);
const HAS_FIRMA_LIZBETH = existsSync(FIRMA_LIZBETH);
const HAS_LOGO_UCM = existsSync(LOGO_UCM);

const COLORS = {
  ink: "#0B1736",
  inkSoft: "#3A4565",
  inkMuted: "#6B7390",
  paperTint: "#FBFBFD",
  divider: "#E2E5F0",
  // Mismos colores del logo que usa la carta de admisión
  logoDeep: "#150832",
  logoAccent: "#E63E5C",
};

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    color: COLORS.ink,
    fontSize: 10,
    lineHeight: 1.5,
  },

  // ---- BANDS top/bottom (mismo estilo que la carta) ----
  bandTop: { height: 9, backgroundColor: COLORS.logoDeep },
  bandTopAccent: { height: 3, backgroundColor: COLORS.logoAccent },
  bandBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: COLORS.logoAccent,
  },
  bandBottomAccent: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 3,
    height: 9,
    backgroundColor: COLORS.logoDeep,
  },

  inner: {
    paddingHorizontal: 70,
    paddingTop: 18,
    paddingBottom: 28,
    flexGrow: 1,
  },

  // ---- Header row con logos (3 en cobranding: Red Apostólica + DAP + UCM) ----
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLogo: { width: 46, height: 46, objectFit: "contain" },
  headerLogoDap: {
    width: 46,
    height: 46,
    objectFit: "contain",
    borderRadius: 5,
  },
  headerLogoUcm: { width: 50, height: 50, objectFit: "contain" },

  // ---- Eyebrow + Title ----
  centerBlock: { alignItems: "center" },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 4.5,
    color: COLORS.logoAccent,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: COLORS.logoDeep,
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: 8,
    lineHeight: 1.1,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.inkSoft,
    letterSpacing: 1.2,
  },

  divider: {
    width: 64,
    height: 2,
    backgroundColor: COLORS.logoAccent,
    marginTop: 10,
    marginBottom: 18,
    alignSelf: "center",
  },

  // ---- "Se otorga a:" ----
  awardedTo: {
    fontSize: 9.5,
    letterSpacing: 2.5,
    color: COLORS.inkMuted,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 8,
  },

  // ---- NOMBRE — script Allura grande ----
  recipientName: {
    fontFamily: "Allura",
    fontSize: 54,
    color: COLORS.logoDeep,
    textAlign: "center",
    lineHeight: 1.05,
    marginBottom: 18,
  },

  // ---- Body explanatory ----
  body: {
    fontSize: 11,
    color: COLORS.ink,
    textAlign: "center",
    lineHeight: 1.65,
    maxWidth: 540,
    marginHorizontal: "auto",
    marginBottom: 16,
  },
  bodyHighlight: {
    fontFamily: "Helvetica-Bold",
    color: COLORS.logoDeep,
  },

  // ---- Dimensión otorgada (highlight box) ----
  dimensionBox: {
    alignItems: "center",
    marginTop: 4,
    marginBottom: 0,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderTop: `1 solid ${COLORS.divider}`,
    borderBottom: `1 solid ${COLORS.divider}`,
    alignSelf: "center",
  },
  dimensionLabel: {
    fontSize: 8,
    letterSpacing: 3,
    color: COLORS.inkMuted,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  dimensionName: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: COLORS.logoDeep,
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // ---- Footer row: 2 firmas (Max + Lizbeth) + verification der ----
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: "auto",
    gap: 24,
  },
  signaturesGroup: {
    flexDirection: "row",
    gap: 36,
    alignItems: "flex-end",
  },
  signatureBlock: { alignItems: "flex-start" },
  // Ambas firmas con mismas dimensiones de box para que se vean alineadas
  // y de tamaño visual equivalente. objectFit:contain hace que cada una
  // se ajuste manteniendo su aspect ratio dentro del box.
  signatureImage: {
    width: 150,
    height: 52,
    objectFit: "contain",
    marginBottom: -6,
  },
  signatureImageLizbeth: {
    width: 150,
    height: 52,
    objectFit: "contain",
    marginBottom: -6,
  },
  signatureLine: {
    width: 175,
    borderBottomWidth: 0.8,
    borderBottomColor: COLORS.ink,
    marginBottom: 4,
  },
  signatureName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
    color: COLORS.ink,
  },
  signatureTitle: {
    fontSize: 8,
    color: COLORS.inkSoft,
    marginTop: 2,
    lineHeight: 1.35,
  },

  verifyBlock: { alignItems: "flex-end" },
  verifyLabel: {
    fontSize: 7.5,
    letterSpacing: 2,
    color: COLORS.inkMuted,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },
  verifyCode: {
    fontFamily: "Courier-Bold",
    fontSize: 13,
    color: COLORS.logoDeep,
    letterSpacing: 2.5,
    marginBottom: 2,
  },
  verifyUrl: {
    fontFamily: "Helvetica",
    fontSize: 7,
    color: COLORS.inkMuted,
  },
  issuedDate: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: COLORS.inkMuted,
    marginTop: 4,
  },
});

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatIssuedAt(d: Date): string {
  const day = d.getUTCDate();
  const month = MONTHS_ES[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} de ${month} de ${year}`;
}

type Props = {
  fullName: string;
  phaseOrderIndex: number;
  phaseTitle: string;
  dimensionName: string;
  verificationCode: string;
  issuedAt: Date;
  verifyUrl: string;
  t: CertificateTranslator;
};

export function CertificateDocument({
  fullName,
  phaseOrderIndex,
  phaseTitle,
  dimensionName,
  verificationCode,
  issuedAt,
  verifyUrl,
  t,
}: Props) {
  const phaseNumber = String(phaseOrderIndex).padStart(2, "0");
  const hasLogos = assetExists(LOGO_DAP) && assetExists(LOGO_RED);

  return (
    <Document
      title={t("document.docTitle", { fullName })}
      author={t("document.author")}
      subject={t("document.subject", { phaseNumber, phaseTitle })}
    >
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <View style={styles.bandTop} fixed />
        <View style={styles.bandTopAccent} fixed />

        <View style={styles.inner}>
          {/* Header: logos en cobranding (Red Apostólica + DAP + UCM Centro de Posgrado) */}
          {hasLogos ? (
            <View style={styles.headerRow}>
              <Image src={LOGO_RED} style={styles.headerLogo} />
              <Image src={LOGO_DAP} style={styles.headerLogoDap} />
              {HAS_LOGO_UCM ? (
                <Image src={LOGO_UCM} style={styles.headerLogoUcm} />
              ) : null}
            </View>
          ) : null}

          {/* Título central */}
          <View style={styles.centerBlock}>
            <Text style={styles.eyebrow}>
              {t("document.eyebrow")}
            </Text>
            <Text style={styles.title}>{t("document.title")}</Text>
            <Text style={styles.subtitle}>
              {t("document.subtitle", { phaseNumber, phaseTitle })}
            </Text>
            <View style={styles.divider} />
          </View>

          {/* Otorgado a */}
          <Text style={styles.awardedTo}>{t("document.awardedTo")}</Text>
          <Text style={styles.recipientName}>{fullName}</Text>

          {/* Body */}
          <Text style={styles.body}>
            {t("document.bodyBefore")}
            <Text style={styles.bodyHighlight}>{t("document.bodyModules")}</Text>
            {t("document.bodyMiddle", { phaseNumber })}
            <Text style={styles.bodyHighlight}>{phaseTitle}</Text>
            {t("document.bodyAfter")}
          </Text>

          {/* Dimensión otorgada */}
          <View style={styles.dimensionBox}>
            <Text style={styles.dimensionLabel}>
              {t("document.dimensionLabel")}
            </Text>
            <Text style={styles.dimensionName}>{dimensionName}</Text>
          </View>

          {/* Footer: 2 firmas (Dr. Max + Lic. Lizbeth UCM) + verification */}
          <View style={styles.footerRow}>
            <View style={styles.signaturesGroup}>
              <View style={styles.signatureBlock}>
                {HAS_FIRMA ? (
                  <Image src={FIRMA} style={styles.signatureImage} />
                ) : null}
                <View style={styles.signatureLine} />
                <Text style={styles.signatureName}>{t("document.signatureName")}</Text>
                <Text style={styles.signatureTitle}>
                  {t("document.signatureTitle")}
                </Text>
              </View>

              {HAS_FIRMA_LIZBETH ? (
                <View style={styles.signatureBlock}>
                  <Image
                    src={FIRMA_LIZBETH}
                    style={styles.signatureImageLizbeth}
                  />
                  <View style={styles.signatureLine} />
                  <Text style={styles.signatureName}>
                    Lic. Martha Lizbeth Dueñas González
                  </Text>
                  <Text style={styles.signatureTitle}>
                    Directora{"\n"}
                    Universidad Cultural Metropolitana{"\n"}
                    Centro de Posgrado
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.verifyBlock}>
              <Text style={styles.verifyLabel}>{t("document.verifyLabel")}</Text>
              <Text style={styles.verifyCode}>{verificationCode}</Text>
              <Text style={styles.verifyUrl}>{verifyUrl}</Text>
              <Text style={styles.issuedDate}>
                {t("document.issuedOn", { date: formatIssuedAt(issuedAt) })}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bandBottomAccent} fixed />
        <View style={styles.bandBottom} fixed />
      </Page>
    </Document>
  );
}
