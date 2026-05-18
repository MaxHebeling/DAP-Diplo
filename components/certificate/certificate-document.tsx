import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// Paleta DAP (navy + coral + neutros). Helvetica/Times-Roman son built-in
// y soportan Latin extendido (incluye acentos del español).

const COLOR_NAVY = "#1a1430";
const COLOR_NAVY_DEEP = "#0d0820";
const COLOR_CORAL = "#fdad5a";
const COLOR_PAPER = "#fbfaf6";
const COLOR_INK = "#2a2438";
const COLOR_MUTED = "#6b6480";

const styles = StyleSheet.create({
  // Página
  page: {
    backgroundColor: COLOR_PAPER,
    padding: 0,
    color: COLOR_INK,
  },

  // Borde decorativo doble
  outerBorder: {
    position: "absolute",
    top: 18,
    left: 18,
    right: 18,
    bottom: 18,
    borderWidth: 1,
    borderColor: COLOR_NAVY,
  },
  innerBorder: {
    position: "absolute",
    top: 30,
    left: 30,
    right: 30,
    bottom: 30,
    borderWidth: 0.5,
    borderColor: COLOR_CORAL,
  },

  // Contenido
  body: {
    flexDirection: "column",
    alignItems: "center",
    paddingTop: 70,
    paddingHorizontal: 80,
    paddingBottom: 60,
    height: "100%",
  },

  // Header: logo + banner
  brandWordmark: {
    fontFamily: "Times-Bold",
    fontSize: 32,
    letterSpacing: 8,
    color: COLOR_NAVY_DEEP,
  },
  banner: {
    marginTop: 6,
    fontFamily: "Helvetica",
    fontSize: 9,
    letterSpacing: 4,
    color: COLOR_CORAL,
    textTransform: "uppercase",
  },

  divider: {
    width: 90,
    height: 1,
    backgroundColor: COLOR_CORAL,
    marginVertical: 28,
  },

  certifiesLabel: {
    fontFamily: "Times-Italic",
    fontSize: 14,
    color: COLOR_MUTED,
    marginBottom: 18,
  },

  // Nombre — pieza principal
  fullName: {
    fontFamily: "Times-Roman",
    fontSize: 56,
    color: COLOR_NAVY_DEEP,
    textAlign: "center",
    lineHeight: 1.1,
    marginBottom: 14,
  },
  nameUnderline: {
    width: 320,
    height: 0.75,
    backgroundColor: COLOR_NAVY,
    marginBottom: 32,
  },

  // Statement
  statement: {
    fontFamily: "Helvetica",
    fontSize: 12,
    color: COLOR_INK,
    textAlign: "center",
    maxWidth: 520,
    lineHeight: 1.5,
    marginBottom: 18,
  },
  blockTitleEmph: {
    fontFamily: "Helvetica-Bold",
    color: COLOR_NAVY_DEEP,
  },

  rankLine: {
    fontFamily: "Times-Italic",
    fontSize: 18,
    color: COLOR_NAVY_DEEP,
    textAlign: "center",
    marginBottom: 8,
  },
  rankName: {
    fontFamily: "Times-Bold",
    fontSize: 24,
    color: COLOR_CORAL,
    textAlign: "center",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // Footer
  footer: {
    position: "absolute",
    left: 80,
    right: 80,
    bottom: 70,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerCol: {
    flexDirection: "column",
    minWidth: 200,
  },
  footerColRight: {
    alignItems: "flex-end",
  },
  footerLabel: {
    fontFamily: "Helvetica",
    fontSize: 7,
    color: COLOR_MUTED,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  footerValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: COLOR_INK,
  },
  verificationCode: {
    fontFamily: "Courier-Bold",
    fontSize: 13,
    color: COLOR_NAVY_DEEP,
    letterSpacing: 2,
    marginBottom: 4,
  },
  verifyUrl: {
    fontFamily: "Helvetica",
    fontSize: 7,
    color: COLOR_MUTED,
  },

  // Firma
  signatureLine: {
    width: 200,
    height: 0.75,
    backgroundColor: COLOR_NAVY,
    marginBottom: 6,
  },
  signatureName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: COLOR_INK,
  },
  signatureTitle: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: COLOR_MUTED,
    marginTop: 2,
  },

  // Watermark sutil al fondo
  watermark: {
    position: "absolute",
    bottom: 18,
    left: 0,
    right: 0,
    textAlign: "center",
    fontFamily: "Helvetica",
    fontSize: 6,
    color: COLOR_MUTED,
    letterSpacing: 2,
    textTransform: "uppercase",
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
        <View style={styles.outerBorder} />
        <View style={styles.innerBorder} />

        <View style={styles.body}>
          <Text style={styles.brandWordmark}>DAP</Text>
          <Text style={styles.banner}>
            Diplomado Apostólico Pastoral
          </Text>

          <View style={styles.divider} />

          <Text style={styles.certifiesLabel}>Certifica que</Text>
          <Text style={styles.fullName}>{fullName}</Text>
          <View style={styles.nameUnderline} />

          <Text style={styles.statement}>
            Ha completado satisfactoriamente el{" "}
            <Text style={styles.blockTitleEmph}>
              Bloque {blockNumber}: {blockTitle}
            </Text>
            , cumpliendo con todos los módulos, evaluaciones y prácticas
            requeridas por el programa.
          </Text>

          <Text style={styles.rankLine}>Por lo tanto, alcanza el rango de</Text>
          <Text style={styles.rankName}>{rankName}</Text>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          {/* IZQ — verification */}
          <View style={styles.footerCol}>
            <Text style={styles.footerLabel}>Código de verificación</Text>
            <Text style={styles.verificationCode}>{verificationCode}</Text>
            <Text style={styles.verifyUrl}>{verifyUrl}</Text>
          </View>

          {/* CENTRO — fecha */}
          <View style={[styles.footerCol, { alignItems: "center" }]}>
            <Text style={styles.footerLabel}>Emitido</Text>
            <Text style={styles.footerValue}>
              {formatIssuedAt(issuedAt)}
            </Text>
          </View>

          {/* DER — firma */}
          <View style={[styles.footerCol, styles.footerColRight]}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>Apóstol responsable</Text>
            <Text style={styles.signatureTitle}>
              Director · Diplomado Apostólico Pastoral
            </Text>
          </View>
        </View>

        <Text style={styles.watermark}>
          dap-diplo · documento generado digitalmente
        </Text>
      </Page>
    </Document>
  );
}
