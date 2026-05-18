import {
  Document,
  Font,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// Diseño basado en el template aportado por Max:
// - Fondo púrpura halftone + panel cream + columna navy + cinta + logo DAP
//   (todo dentro de public/cert/background-template.png).
// - Sobre ese background superponemos solo los campos dinámicos.
// - Tapamos la frase placeholder "quien favorablemente participó del
//   Discipulado en la ciudad de Salta, Argentina, ..." con un rectángulo
//   del color exacto del panel (#e0e0e0) y escribimos el body propio del
//   bloque/rango.
//
// Allura (script Google Font) se sirve desde public/cert/fonts/ del mismo
// dominio en producción — autosuficiente, sin CDN externo, evita 401 / fetch
// fallido en serverless.

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://dap-diplo.vercel.app";

Font.register({
  family: "Allura",
  src: `${APP_URL}/cert/fonts/Allura-Regular.ttf`,
});

// Colores muestreados del template
const PANEL_CREAM = "#e0e0e0";
const NAVY_DEEP = "#1a1430";
const INK = "#2a2438";
const MUTED = "#6b6480";

// Letter landscape: 792 x 612 pt
// Imagen base: 2200 x 1700 px @ 200 DPI = mismo aspect ratio exacto
const PAGE_W = 792;
const PAGE_H = 612;

// Helpers para px → pt (image space → page space): pt = px * 792/2200
const px2pt = (px: number) => px * (PAGE_W / 2200);

const styles = StyleSheet.create({
  page: { backgroundColor: PANEL_CREAM, padding: 0, color: INK },

  // Background: la imagen cubre toda la página (mismo aspect ratio)
  bgImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: PAGE_W,
    height: PAGE_H,
  },

  // Mask: tapa SOLO el body placeholder "quien favorablemente participó
  // del Discipulado en la ciudad de Salta, Argentina, a los 15 días del
  // mes de Noviembre, del año 2025.-" → bandas detectadas en y 916-992.
  // Padding generoso top/bottom para asegurar limpieza completa.
  bodyMask: {
    position: "absolute",
    left: px2pt(740),
    top: px2pt(890),
    width: px2pt(1320),
    height: px2pt(135),
    backgroundColor: PANEL_CREAM,
  },

  // Nombre del alumno: va sobre el área vacía entre "El presente
  // certificado se otorga a:" (banda y 663-684) y el body (y 916).
  // Centrado en y ≈ 800 px.
  recipientName: {
    position: "absolute",
    left: px2pt(740),
    top: px2pt(740),
    width: px2pt(1320),
    fontFamily: "Allura",
    fontSize: 60,
    color: NAVY_DEEP,
    textAlign: "center",
    lineHeight: 1.0,
  },

  // Body propio DAP (sustituye el placeholder)
  bodyText: {
    position: "absolute",
    left: px2pt(760),
    top: px2pt(900),
    width: px2pt(1280),
    fontFamily: "Allura",
    fontSize: 24,
    color: INK,
    textAlign: "center",
    lineHeight: 1.35,
  },
  bodyTextHi: {
    fontFamily: "Times-Bold",
    fontSize: 18,
    color: NAVY_DEEP,
  },

  // Verification code: esquina inferior derecha del panel cream.
  verifyBlock: {
    position: "absolute",
    right: px2pt(160),
    top: px2pt(1450),
    flexDirection: "column",
    alignItems: "flex-end",
  },
  verifyLabel: {
    fontFamily: "Helvetica",
    fontSize: 6.5,
    color: MUTED,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  verifyCode: {
    fontFamily: "Courier-Bold",
    fontSize: 12,
    color: NAVY_DEEP,
    letterSpacing: 2.5,
    marginBottom: 1,
  },
  verifyUrl: {
    fontFamily: "Helvetica",
    fontSize: 6,
    color: MUTED,
  },

  // Fecha de emisión: esquina inferior izquierda del panel cream.
  issuedBlock: {
    position: "absolute",
    left: px2pt(780),
    top: px2pt(1450),
    flexDirection: "column",
  },
  issuedLabel: {
    fontFamily: "Helvetica",
    fontSize: 6.5,
    color: MUTED,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  issuedValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: INK,
  },
});

const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function formatIssuedAt(d: Date): string {
  const day = d.getUTCDate();
  const month = MONTHS_ES[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} de ${month} de ${year}`;
}

type Props = {
  fullName: string;
  blockOrderIndex: number;
  blockTitle: string;
  rankName: string;
  verificationCode: string;
  issuedAt: Date;
  verifyUrl: string;
};

export function CertificateDocument({
  fullName,
  blockOrderIndex,
  blockTitle,
  rankName,
  verificationCode,
  issuedAt,
  verifyUrl,
}: Props) {
  const blockNumber = String(blockOrderIndex).padStart(2, "0");

  return (
    <Document
      title={`Certificado DAP — ${fullName}`}
      author="Diplomado Apostólico Pastoral"
      subject={`Bloque ${blockNumber}: ${blockTitle}`}
    >
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        {/* 1. Fondo del template */}
        <Image
          src={`${APP_URL}/cert/background-template.png`}
          style={styles.bgImage}
        />

        {/* 2. Máscara del body placeholder (reemplaza con texto DAP) */}
        <View style={styles.bodyMask} />

        {/* 3. Nombre del alumno (script Allura sobre el subrayado existente) */}
        <Text style={styles.recipientName}>{fullName}</Text>

        {/* 4. Body propio DAP */}
        <View style={styles.bodyText}>
          <Text>
            Por haber completado satisfactoriamente el{" "}
            <Text style={styles.bodyTextHi}>
              Bloque {blockNumber}: {blockTitle}
            </Text>
            ,{"\n"}alcanzando el rango apostólico de{" "}
            <Text style={styles.bodyTextHi}>{rankName}</Text>.
          </Text>
        </View>

        {/* NOTA: la firma "Ap. Max Hebeling / Revival & Kingdom Ministries"
           se conserva del background image (Max es el apóstol firmante). */}

        {/* 6. Fecha de emisión (footer izq) */}
        <View style={styles.issuedBlock}>
          <Text style={styles.issuedLabel}>Emitido</Text>
          <Text style={styles.issuedValue}>{formatIssuedAt(issuedAt)}</Text>
        </View>

        {/* 7. Verification code (footer der) */}
        <View style={styles.verifyBlock}>
          <Text style={styles.verifyLabel}>Código de verificación</Text>
          <Text style={styles.verifyCode}>{verificationCode}</Text>
          <Text style={styles.verifyUrl}>{verifyUrl}</Text>
        </View>
      </Page>
    </Document>
  );
}
