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

// Assets locales (mismo set que la carta de admisión)
const ASSETS_DIR = join(process.cwd(), "public", "admission-assets");
const LOGO_DAP = join(ASSETS_DIR, "logo-dap.png");
const LOGO_RED = join(ASSETS_DIR, "logo-red-apostolica.png");
const FIRMA = join(ASSETS_DIR, "firma-max-hebeling.png");

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
    paddingHorizontal: 64,
    paddingTop: 24,
    paddingBottom: 60,
    flexGrow: 1,
  },

  // ---- Header row con logos ----
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerLogo: { width: 56, height: 56, objectFit: "contain" },
  headerLogoDap: {
    width: 56,
    height: 56,
    objectFit: "contain",
    borderRadius: 6,
  },

  // ---- Eyebrow + Title ----
  centerBlock: { alignItems: "center" },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 4.5,
    color: COLORS.logoAccent,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  title: {
    fontSize: 30,
    fontFamily: "Helvetica-Bold",
    color: COLORS.logoDeep,
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.inkSoft,
    letterSpacing: 1.2,
    marginBottom: 12,
  },

  divider: {
    width: 80,
    height: 2,
    backgroundColor: COLORS.logoAccent,
    marginVertical: 10,
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
    marginBottom: 6,
  },

  // ---- NOMBRE — script Allura grande ----
  recipientName: {
    fontFamily: "Allura",
    fontSize: 60,
    color: COLORS.logoDeep,
    textAlign: "center",
    lineHeight: 1.05,
    marginBottom: 12,
  },

  // ---- Body explanatory ----
  body: {
    fontSize: 11.5,
    color: COLORS.ink,
    textAlign: "center",
    lineHeight: 1.7,
    maxWidth: 540,
    marginHorizontal: "auto",
    marginBottom: 14,
  },
  bodyHighlight: {
    fontFamily: "Helvetica-Bold",
    color: COLORS.logoDeep,
  },

  // ---- Dimensión otorgada (highlight box) ----
  dimensionBox: {
    alignItems: "center",
    marginVertical: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
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
    marginBottom: 5,
  },
  dimensionName: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: COLORS.logoDeep,
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // ---- Footer row: firma izq + verification der ----
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 18,
  },
  signatureBlock: { alignItems: "flex-start" },
  signatureImage: {
    width: 130,
    height: 44,
    objectFit: "contain",
    marginBottom: -4,
  },
  signatureLine: {
    width: 190,
    borderBottomWidth: 0.8,
    borderBottomColor: COLORS.ink,
    marginBottom: 5,
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
    lineHeight: 1.4,
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
};

export function CertificateDocument({
  fullName,
  phaseOrderIndex,
  phaseTitle,
  dimensionName,
  verificationCode,
  issuedAt,
  verifyUrl,
}: Props) {
  const phaseNumber = String(phaseOrderIndex).padStart(2, "0");
  const hasLogos = assetExists(LOGO_DAP) && assetExists(LOGO_RED);

  return (
    <Document
      title={`Certificado DAP — ${fullName}`}
      author="Diplomado Apostólico Pastoral"
      subject={`Bloque ${phaseNumber}: ${phaseTitle}`}
    >
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <View style={styles.bandTop} fixed />
        <View style={styles.bandTopAccent} fixed />

        <View style={styles.inner}>
          {/* Header: logos en esquinas */}
          {hasLogos ? (
            <View style={styles.headerRow}>
              <Image src={LOGO_RED} style={styles.headerLogo} />
              <Image src={LOGO_DAP} style={styles.headerLogoDap} />
            </View>
          ) : null}

          {/* Título central */}
          <View style={styles.centerBlock}>
            <Text style={styles.eyebrow}>
              Diplomado Apostólico Pastoral
            </Text>
            <Text style={styles.title}>Certificado de Bloque</Text>
            <Text style={styles.subtitle}>
              Bloque {phaseNumber} · {phaseTitle}
            </Text>
            <View style={styles.divider} />
          </View>

          {/* Otorgado a */}
          <Text style={styles.awardedTo}>Se otorga a</Text>
          <Text style={styles.recipientName}>{fullName}</Text>

          {/* Body */}
          <Text style={styles.body}>
            En reconocimiento por haber completado satisfactoriamente los{" "}
            <Text style={styles.bodyHighlight}>ocho módulos</Text> del
            Bloque {phaseNumber} —{" "}
            <Text style={styles.bodyHighlight}>{phaseTitle}</Text> — del
            Diplomado Apostólico Pastoral, dando testimonio de la formación
            integral recibida.
          </Text>

          {/* Dimensión otorgada */}
          <View style={styles.dimensionBox}>
            <Text style={styles.dimensionLabel}>
              Dimensión ministerial otorgada
            </Text>
            <Text style={styles.dimensionName}>{dimensionName}</Text>
          </View>

          {/* Footer: firma + verification */}
          <View style={styles.footerRow}>
            <View style={styles.signatureBlock}>
              {HAS_FIRMA ? (
                <Image src={FIRMA} style={styles.signatureImage} />
              ) : null}
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>Dr. Max Hebeling</Text>
              <Text style={styles.signatureTitle}>
                Apóstol & CEO{"\n"}
                Red Apostólica Reino y Avivamiento{"\n"}
                Revival &amp; Kingdom Ministries, INC
              </Text>
            </View>

            <View style={styles.verifyBlock}>
              <Text style={styles.verifyLabel}>Código de verificación</Text>
              <Text style={styles.verifyCode}>{verificationCode}</Text>
              <Text style={styles.verifyUrl}>{verifyUrl}</Text>
              <Text style={styles.issuedDate}>
                Emitido el {formatIssuedAt(issuedAt)}
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
