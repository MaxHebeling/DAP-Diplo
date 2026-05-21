/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer <Image> no acepta alt; el lint rule asume HTML. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

// Resolvemos los assets una sola vez al cargar el módulo. Si faltan,
// el server action falla con un mensaje claro al llamar.
const ASSETS_DIR = join(process.cwd(), "public", "admission-assets");
const LOGO_DAP = join(ASSETS_DIR, "logo-dap.png");
const LOGO_RED = join(ASSETS_DIR, "logo-red-apostolica.png");
const FIRMA = join(ASSETS_DIR, "firma-max-hebeling.png");

function assertAssetsExist(): void {
  for (const p of [LOGO_DAP, LOGO_RED, FIRMA]) {
    try {
      readFileSync(p);
    } catch {
      throw new Error(
        `Asset faltante: ${p}. Asegurate de tener logo-dap.png, logo-red-apostolica.png y firma-max-hebeling.png en /public/admission-assets/.`,
      );
    }
  }
}

export type AdmissionLetterInput = {
  fullName: string;
  matricula: string;
  programStartDate: Date;
  issuedDate: Date;
};

const COLORS = {
  ink: "#0B1736",
  inkSoft: "#3A4565",
  violet: "#7B61FF",
  coral: "#FF4D6D",
  divider: "#E2E5F0",
  paperTint: "#FBFBFD",
  // Colores extraídos del logo DAP — usados en las bandas top/bottom
  // para alineación visual con la identidad de marca.
  logoDeep: "#241555",   // Indigo profundo del cuerpo "DAP"
  logoAccent: "#E63E5C", // Rojo coral de las líneas/glow del logo
};

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    color: COLORS.ink,
    fontSize: 11,
    lineHeight: 1.55,
  },
  // Banda superior: indigo profundo del logo + accent coral
  bandTop: {
    height: 8,
    backgroundColor: COLORS.logoDeep,
  },
  bandTopAccent: {
    height: 3,
    backgroundColor: COLORS.logoAccent,
  },
  inner: {
    paddingHorizontal: 56,
    paddingTop: 32,
    paddingBottom: 48,
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  headerLogo: {
    width: 72,
    height: 72,
    objectFit: "contain",
  },
  headerLogoDap: {
    width: 72,
    height: 72,
    objectFit: "contain",
    borderRadius: 6,
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 4,
    color: COLORS.coral,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginTop: 18,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    letterSpacing: 1,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.inkSoft,
    marginBottom: 24,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    marginVertical: 16,
  },
  para: {
    fontSize: 11.5,
    color: COLORS.ink,
    marginBottom: 12,
    textAlign: "justify",
  },
  nameHighlight: {
    fontFamily: "Helvetica-Bold",
    color: COLORS.violet,
  },
  dataCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORS.paperTint,
    borderLeft: `3 solid ${COLORS.violet}`,
    borderRadius: 4,
  },
  dataRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  dataLabel: {
    width: 130,
    fontSize: 9,
    color: COLORS.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: "Helvetica-Bold",
  },
  dataValue: {
    flex: 1,
    fontSize: 11,
    color: COLORS.ink,
  },
  signatureBlock: {
    marginTop: 36,
    alignItems: "flex-start",
  },
  signatureImage: {
    width: 150,
    height: 60,
    objectFit: "contain",
  },
  signatureLine: {
    width: 220,
    borderBottomWidth: 0.8,
    borderBottomColor: COLORS.ink,
    marginTop: 2,
    marginBottom: 6,
  },
  signatureName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: COLORS.ink,
  },
  signatureTitle: {
    fontSize: 9,
    color: COLORS.inkSoft,
    marginTop: 2,
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: COLORS.inkSoft,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
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
    height: 8,
    backgroundColor: COLORS.logoDeep,
  },
});

function formatLongDate(d: Date): string {
  return d
    .toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .replace(/^\w/, (c) => c.toUpperCase());
}

function AdmissionLetterDocument({
  fullName,
  matricula,
  programStartDate,
  issuedDate,
}: AdmissionLetterInput) {
  return (
    <Document
      title={`Carta de Admisión — ${fullName}`}
      author="DAP — Diplomado Apostólico Pastoral"
      subject={`Admisión ${matricula}`}
    >
      <Page size="LETTER" style={styles.page} wrap>
        {/* Banda superior */}
        <View style={styles.bandTop} fixed />
        <View style={styles.bandTopAccent} fixed />

        <View style={styles.inner}>
          {/* Header con logos */}
          <View style={styles.headerRow}>
            <Image src={LOGO_RED} style={styles.headerLogo} />
            <Image src={LOGO_DAP} style={styles.headerLogoDap} />
          </View>

          {/* Eyebrow + título */}
          <Text style={styles.eyebrow}>
            Diplomado Apostólico Pastoral
          </Text>
          <Text style={styles.title}>CARTA DE ADMISIÓN</Text>
          <Text style={styles.subtitle}>
            Emitida el {formatLongDate(issuedDate)}
          </Text>

          <View style={styles.divider} />

          {/* Cuerpo pastoral-formal — 2 párrafos */}
          <Text style={styles.para}>
            Por medio de la presente, en nombre de la{" "}
            <Text style={styles.nameHighlight}>
              Red Apostólica Reino y Avivamiento
            </Text>{" "}
            y de{" "}
            <Text style={styles.nameHighlight}>
              Revival &amp; Kingdom Ministries, INC
            </Text>
            , se hace constar que{" "}
            <Text style={styles.nameHighlight}>{fullName}</Text> ha sido
            formalmente admitido al{" "}
            <Text style={styles.nameHighlight}>
              Diplomado Apostólico Pastoral (DAP)
            </Text>
            , programa de formación integral de dieciocho meses para
            pastores y líderes ministeriales.
          </Text>

          <Text style={styles.para}>
            Recibimos con honor el llamado que pesa sobre tu vida y nos
            comprometemos a acompañarte semana a semana en este proceso
            de formación bíblica, ministerial, gubernamental, financiera y
            tecnológica. Que el Señor te halle fiel a la palabra que será
            depositada en ti, y que esta etapa marque un antes y un
            después en el ejercicio de tu llamado.
          </Text>

          {/* Datos formales */}
          <View style={styles.dataCard}>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Matrícula</Text>
              <Text style={styles.dataValue}>{matricula}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Fecha de emisión</Text>
              <Text style={styles.dataValue}>
                {formatLongDate(issuedDate)}
              </Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Inicio del programa</Text>
              <Text style={styles.dataValue}>
                {formatLongDate(programStartDate)}
              </Text>
            </View>
          </View>

          {/* Firma */}
          <View style={styles.signatureBlock}>
            <Image src={FIRMA} style={styles.signatureImage} />
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>Dr. Max Hebeling</Text>
            <Text style={styles.signatureTitle}>
              CEO &amp; Apóstol{"\n"}
              Red Apostólica Reino y Avivamiento{"\n"}
              Revival &amp; Kingdom Ministries, INC
            </Text>
          </View>
        </View>

        {/* Footer fijo */}
        <Text style={styles.footer} fixed>
          <Text>DAPGLOBAL.ORG</Text>
          <Text>{matricula}</Text>
        </Text>
        <View style={styles.bandBottomAccent} fixed />
        <View style={styles.bandBottom} fixed />
      </Page>
    </Document>
  );
}

/**
 * Genera la carta de admisión como Buffer (PDF).
 *
 * Llamada desde el cron 24h y desde server actions de admin para preview.
 * No persiste nada; el caller decide si subir a storage y/o adjuntar al
 * email.
 */
export async function generateAdmissionLetter(
  input: AdmissionLetterInput,
): Promise<Buffer> {
  assertAssetsExist();
  return await renderToBuffer(<AdmissionLetterDocument {...input} />);
}
