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

  // Mask: tapa la frase placeholder "quien favorablemente participó..."
  // del background. Coords px en el original 2200x1700: x≈755-2030,
  // y≈660-820 → convertimos a pt.
  bodyMask: {
    position: "absolute",
    left: px2pt(740),
    top: px2pt(640),
    width: px2pt(1300),
    height: px2pt(200),
    backgroundColor: PANEL_CREAM,
  },

  // Mask del área de firma para poner "Apóstol DAP" en lugar de
  // "Ap. Max Hebeling / Revival & Kingdom Ministries, INC".
  // No tapamos el subrayado (queda intacto a y≈980).
  signatureMask: {
    position: "absolute",
    left: px2pt(740),
    top: px2pt(1010),
    width: px2pt(700),
    height: px2pt(90),
    backgroundColor: PANEL_CREAM,
  },

  // Nombre del alumno: va sobre el área vacía entre "El presente
  // certificado se otorga a:" (y≈430) y el subrayado (y≈600).
  recipientName: {
    position: "absolute",
    left: px2pt(740),
    top: px2pt(460),
    width: px2pt(1320),
    fontFamily: "Allura",
    fontSize: 56,
    color: NAVY_DEEP,
    textAlign: "center",
    lineHeight: 1.1,
  },

  // Body propio: completa el masking
  bodyText: {
    position: "absolute",
    left: px2pt(740),
    top: px2pt(660),
    width: px2pt(1300),
    fontFamily: "Allura",
    fontSize: 22,
    color: INK,
    textAlign: "center",
    lineHeight: 1.45,
  },
  bodyTextHi: {
    fontFamily: "Times-Bold",
    fontSize: 18,
    color: NAVY_DEEP,
  },

  // Firma renombrada
  signatureName: {
    position: "absolute",
    left: px2pt(745),
    top: px2pt(1020),
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: INK,
  },
  signatureTitle: {
    position: "absolute",
    left: px2pt(745),
    top: px2pt(1058),
    fontFamily: "Helvetica-Oblique",
    fontSize: 9,
    color: MUTED,
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

        {/* 2. Máscaras de las áreas a reemplazar */}
        <View style={styles.bodyMask} />
        <View style={styles.signatureMask} />

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

        {/* 5. Firma renombrada */}
        <Text style={styles.signatureName}>Apóstol responsable</Text>
        <Text style={styles.signatureTitle}>
          Director · Diplomado Apostólico Pastoral
        </Text>

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
