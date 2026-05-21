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

import {
  CLASSES_START_LABEL,
  ENROLLMENT_OPENS_LABEL,
} from "@/lib/launch/config";

/**
 * Brief apostólico del DAP en PDF — pieza institucional para que el
 * Dr. Max comparta con pastores de la red (y aspirantes) antes de la
 * apertura de inscripciones del 01 de Junio.
 *
 * Reutiliza el mismo branding visual de la carta de admisión (paleta
 * violeta + coral, bandas superior/inferior, tipografía Helvetica) y
 * los assets de logo en /public/admission-assets/.
 *
 * El contenido no recibe parámetros — es un documento fijo. Si en algún
 * momento se necesita personalizar por aspirante (nombre, congregación,
 * etc.), agregar props acá.
 */

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
        `Asset faltante: ${p}. Asegúrate de tener logo-dap.png, logo-red-apostolica.png y firma-max-hebeling.png en /public/admission-assets/.`,
      );
    }
  }
}

const COLORS = {
  ink: "#0B1736",
  inkSoft: "#3A4565",
  inkMuted: "#6B7390",
  violet: "#7B61FF",
  coral: "#FF4D6D",
  divider: "#E2E5F0",
  paperTint: "#FBFBFD",
  highlight: "#FFF6F8",
};

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    color: COLORS.ink,
    fontSize: 10.5,
    lineHeight: 1.55,
  },
  bandTop: {
    height: 8,
    backgroundColor: COLORS.violet,
  },
  bandTopAccent: {
    height: 3,
    backgroundColor: COLORS.coral,
  },
  inner: {
    paddingHorizontal: 52,
    paddingTop: 30,
    paddingBottom: 56,
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  headerLogo: {
    width: 56,
    height: 56,
    objectFit: "contain",
  },
  headerLogoDap: {
    width: 56,
    height: 56,
    objectFit: "contain",
    borderRadius: 5,
  },
  eyebrow: {
    fontSize: 7.5,
    letterSpacing: 4,
    color: COLORS.coral,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    letterSpacing: 0.5,
    marginBottom: 6,
    lineHeight: 1.15,
  },
  lede: {
    fontSize: 11,
    color: COLORS.inkSoft,
    marginBottom: 18,
    lineHeight: 1.5,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    marginVertical: 14,
  },
  sectionH: {
    fontSize: 12.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    marginTop: 14,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  sectionHEyebrow: {
    fontSize: 7,
    letterSpacing: 3,
    color: COLORS.violet,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 3,
  },
  para: {
    fontSize: 10.5,
    color: COLORS.ink,
    marginBottom: 9,
    textAlign: "justify",
  },
  paraSmall: {
    fontSize: 9.5,
    color: COLORS.inkSoft,
    marginBottom: 8,
    lineHeight: 1.5,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
  },
  highlight: {
    fontFamily: "Helvetica-Bold",
    color: COLORS.violet,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 4,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 12,
    fontSize: 10.5,
    color: COLORS.coral,
    fontFamily: "Helvetica-Bold",
  },
  bulletText: {
    flex: 1,
    fontSize: 10.5,
    color: COLORS.ink,
    lineHeight: 1.5,
  },
  dimensionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 5,
  },
  dimensionNum: {
    width: 28,
    fontSize: 11,
    color: COLORS.violet,
    fontFamily: "Helvetica-Bold",
  },
  dimensionName: {
    width: 95,
    fontSize: 10.5,
    color: COLORS.ink,
    fontFamily: "Helvetica-Bold",
  },
  dimensionBloque: {
    flex: 1,
    fontSize: 10,
    color: COLORS.inkSoft,
  },
  // Caja destacada para fechas / pricing
  callout: {
    marginTop: 14,
    marginBottom: 8,
    padding: 14,
    backgroundColor: COLORS.paperTint,
    borderLeft: `3 solid ${COLORS.coral}`,
    borderRadius: 4,
  },
  calloutTitle: {
    fontSize: 8,
    letterSpacing: 2.5,
    color: COLORS.coral,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  calloutRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  calloutLabel: {
    width: 130,
    fontSize: 9.5,
    color: COLORS.inkSoft,
  },
  calloutValue: {
    flex: 1,
    fontSize: 10.5,
    color: COLORS.ink,
    fontFamily: "Helvetica-Bold",
  },
  priceBig: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: COLORS.violet,
    marginBottom: 0,
  },
  priceSmall: {
    fontSize: 9,
    color: COLORS.inkSoft,
    marginBottom: 6,
  },
  signatureBlock: {
    marginTop: 28,
    alignItems: "flex-start",
  },
  signatureImage: {
    width: 140,
    height: 54,
    objectFit: "contain",
  },
  signatureLine: {
    width: 220,
    borderBottomWidth: 0.8,
    borderBottomColor: COLORS.ink,
    marginTop: 2,
    marginBottom: 5,
  },
  signatureName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: COLORS.ink,
  },
  signatureTitle: {
    fontSize: 8.5,
    color: COLORS.inkSoft,
    marginTop: 2,
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 52,
    right: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: COLORS.inkSoft,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  bandBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: COLORS.coral,
  },
  bandBottomAccent: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 3,
    height: 8,
    backgroundColor: COLORS.violet,
  },
});

const DIMENSIONS = [
  { n: 1, name: "Discípulo", bloque: "Fundamentos Espirituales" },
  { n: 2, name: "Hijo", bloque: "Identidad y Carácter" },
  { n: 3, name: "Líder", bloque: "Liderazgo y Discipulado" },
  { n: 4, name: "Pastor", bloque: "Ministerio y Pastorado" },
  { n: 5, name: "Administrador", bloque: "Administración y Gobierno" },
  { n: 6, name: "Mayordomo", bloque: "Finanzas y Economía del Reino" },
  { n: 7, name: "Reformador", bloque: "Empresas y Expansión" },
  { n: 8, name: "Arquitecto", bloque: "Tecnología, IA y Comunicación" },
  { n: 9, name: "Enviado", bloque: "Gobierno Apostólico y Reforma" },
] as const;

const INCLUIDO = [
  "Calendario semanal personal — 1 módulo nuevo cada semana, durante 72 semanas",
  "Corrección personalizada de cada activación escrita, en la voz pastoral del Dr. Max (devuelta en 48 horas)",
  "MasterClass en vivo con el Dr. Max — mínimo 1 garantizada al mes",
  "Mentoría grupal por convocatoria apostólica",
  "Comunidad privada de pastores en formación",
  "Tutor IA del DAP — entrenado con todos los materiales del programa, disponible 24/7",
  "Material descargable por módulo (PDFs, audios, plantillas)",
  "Certificado, insignia y nueva dimensión ministerial al aprobar cada bloque",
];

function BriefDocument() {
  return (
    <Document
      title="Brief Apostólico — Diplomado Apostólico Pastoral 2026"
      author="Dr. Max Hebeling — Red Apostólica Reino y Avivamiento"
      subject="DAP — Convocatoria 2026"
    >
      {/* ============ PAGE 1 — Apertura, Visión, Para Quién ============ */}
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.bandTop} fixed />
        <View style={styles.bandTopAccent} fixed />

        <View style={styles.inner}>
          <View style={styles.headerRow}>
            <Image src={LOGO_RED} style={styles.headerLogo} />
            <Image src={LOGO_DAP} style={styles.headerLogoDap} />
          </View>

          <Text style={styles.eyebrow}>
            Brief Apostólico · Convocatoria 2026
          </Text>
          <Text style={styles.title}>Diplomado Apostólico Pastoral</Text>
          <Text style={styles.lede}>
            Formación integral de dieciocho meses para pastores, líderes y
            padres apostólicos que se están preparando para esta hora del
            Reino.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionHEyebrow}>Palabra de apertura</Text>
          <Text style={styles.sectionH}>Pastor amado,</Text>
          <Text style={styles.para}>
            El Señor está levantando una generación de{" "}
            <Text style={styles.highlight}>padres apostólicos</Text> capaces
            de gobernar, formar y enviar. No basta con buenos predicadores
            — la hora pide pastores con identidad de hijo, mentalidad de
            Reino y capacidad real de construir.
          </Text>
          <Text style={styles.para}>
            El{" "}
            <Text style={styles.bold}>Diplomado Apostólico Pastoral (DAP)</Text>{" "}
            nace de la{" "}
            <Text style={styles.highlight}>
              Red Apostólica Reino y Avivamiento
            </Text>{" "}
            como respuesta concreta a esa necesidad: no un curso más, sino
            un proceso de dieciocho meses, paso a paso, donde cada semana
            recibes enseñanza, corrección personal y activación práctica
            en tu llamado.
          </Text>

          <Text style={styles.sectionHEyebrow}>Para quién es</Text>
          <Text style={styles.sectionH}>Este diplomado es para ti si...</Text>
          <View style={styles.bulletRow}>
            <Text style={styles.bulletDot}>·</Text>
            <Text style={styles.bulletText}>
              Eres pastor, líder de ministerio o aspirante a serlo y quieres
              formación con{" "}
              <Text style={styles.bold}>cobertura apostólica real</Text>.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.bulletDot}>·</Text>
            <Text style={styles.bulletText}>
              Sientes que tu llamado pide profundidad doctrinal, identidad
              de hijo y capacidad de gobernar — no sólo dones operando
              sueltos.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.bulletDot}>·</Text>
            <Text style={styles.bulletText}>
              Quieres ser formado en{" "}
              <Text style={styles.bold}>
                ministerio, gobierno, finanzas, empresa y tecnología
              </Text>
              {" "}para no sólo levantar gente, sino estructuras del Reino.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.bulletDot}>·</Text>
            <Text style={styles.bulletText}>
              Buscas un programa serio que respete tu tiempo: 100% online,
              a tu ritmo dentro de la semana, sin viajes obligatorios.
            </Text>
          </View>

          <Text style={styles.sectionHEyebrow}>Visión</Text>
          <Text style={styles.sectionH}>De Discípulo a Enviado</Text>
          <Text style={styles.para}>
            El DAP forma en{" "}
            <Text style={styles.highlight}>nueve dimensiones ministeriales</Text>
            , una por cada bloque del programa. Cada dimensión es una capa
            de identidad y autoridad que se imparte sobre tu vida al
            aprobar los 8 módulos del bloque correspondiente — desde la
            primera dimensión de Discípulo hasta la novena de Enviado.
          </Text>
        </View>

        <Text style={styles.footer} fixed>
          <Text>DAPGLOBAL.ORG</Text>
          <Text>BRIEF · CONVOCATORIA 2026</Text>
        </Text>
        <View style={styles.bandBottomAccent} fixed />
        <View style={styles.bandBottom} fixed />
      </Page>

      {/* ============ PAGE 2 — Estructura + Dimensiones + Metodología ============ */}
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.bandTop} fixed />
        <View style={styles.bandTopAccent} fixed />

        <View style={styles.inner}>
          <Text style={styles.sectionHEyebrow}>Estructura del programa</Text>
          <Text style={styles.sectionH}>
            18 meses · 72 módulos · 9 bloques · 9 dimensiones
          </Text>
          <Text style={styles.para}>
            <Text style={styles.bold}>Un módulo nuevo cada semana</Text>,
            durante 72 semanas. Cada bloque agrupa 8 módulos y, al
            completarse, otorga una nueva dimensión ministerial al alumno.
            Las 9 dimensiones del DAP son:
          </Text>

          {DIMENSIONS.map((d) => (
            <View key={d.n} style={styles.dimensionRow}>
              <Text style={styles.dimensionNum}>0{d.n}</Text>
              <Text style={styles.dimensionName}>{d.name}</Text>
              <Text style={styles.dimensionBloque}>
                Bloque {d.n} — {d.bloque}
              </Text>
            </View>
          ))}

          <Text style={styles.sectionHEyebrow}>Metodología semanal</Text>
          <Text style={styles.sectionH}>De martes a lunes, paso a paso</Text>
          <Text style={styles.para}>
            Cada{" "}
            <Text style={styles.bold}>martes 00:01 (hora San Diego)</Text>
            {" "}se abre tu módulo de la semana. La activación práctica
            cierra el{" "}
            <Text style={styles.bold}>lunes 23:59</Text>. El contenido
            pasado queda accesible para repaso indefinidamente.
          </Text>
          <Text style={styles.para}>
            Cada módulo tiene 5 secciones:{" "}
            <Text style={styles.bold}>(1)</Text> introducción y contexto,{" "}
            <Text style={styles.bold}>(2)</Text> enseñanza en video del Dr.
            Max (45–60 min),{" "}
            <Text style={styles.bold}>(3)</Text> activación práctica escrita,{" "}
            <Text style={styles.bold}>(4)</Text> evaluación con quiz
            autocorregible (pasa con ≥70%), y{" "}
            <Text style={styles.bold}>(5)</Text> impartición — palabra
            apostólica de cierre.
          </Text>
          <Text style={styles.para}>
            Tu activación escrita es revisada{" "}
            <Text style={styles.highlight}>personalmente</Text> con la voz
            pastoral del Dr. Max y devuelta en 48 horas con feedback
            estructurado: lo que se vio, lo que necesitas afinar, tu
            próximo paso y una palabra de impartación.
          </Text>
        </View>

        <Text style={styles.footer} fixed>
          <Text>DAPGLOBAL.ORG</Text>
          <Text>BRIEF · CONVOCATORIA 2026</Text>
        </Text>
        <View style={styles.bandBottomAccent} fixed />
        <View style={styles.bandBottom} fixed />
      </Page>

      {/* ============ PAGE 3 — Incluye, Inversión, Fechas, Cierre ============ */}
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.bandTop} fixed />
        <View style={styles.bandTopAccent} fixed />

        <View style={styles.inner}>
          <Text style={styles.sectionHEyebrow}>Lo que incluye</Text>
          <Text style={styles.sectionH}>Acceso completo al ecosistema DAP</Text>
          {INCLUIDO.map((item, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>·</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}

          <View style={styles.callout}>
            <Text style={styles.calloutTitle}>Inversión</Text>
            <Text style={styles.priceBig}>$25 USD / mes</Text>
            <Text style={styles.priceSmall}>
              Modelo de suscripción flexible. Cancelas cuando quieras desde
              tu dashboard — tu progreso queda guardado. Si reactivas,
              retomas desde la semana donde dejaste.
            </Text>
            <Text style={styles.paraSmall}>
              Garantía de 7 días: si dentro de la primera semana sientes
              que el DAP no es para ti, te devolvemos el 100% del primer
              pago.
            </Text>
          </View>

          <View style={styles.callout}>
            <Text style={styles.calloutTitle}>Fechas clave</Text>
            <View style={styles.calloutRow}>
              <Text style={styles.calloutLabel}>Apertura de inscripciones</Text>
              <Text style={styles.calloutValue}>{ENROLLMENT_OPENS_LABEL}</Text>
            </View>
            <View style={styles.calloutRow}>
              <Text style={styles.calloutLabel}>Inicio de clases</Text>
              <Text style={styles.calloutValue}>
                {CLASSES_START_LABEL.replace(/^./, (c) => c.toUpperCase())}
              </Text>
            </View>
            <Text style={styles.paraSmall}>
              Una vez aprobada tu admisión y activada tu suscripción,
              recibes acceso a la plataforma. El primer módulo se abre
              automáticamente el martes 23 de Junio de 2026.
            </Text>
          </View>

          <Text style={styles.sectionHEyebrow}>Cómo inscribirse</Text>
          <Text style={styles.sectionH}>3 pasos a partir del 01 de Junio</Text>
          <View style={styles.bulletRow}>
            <Text style={styles.bulletDot}>1.</Text>
            <Text style={styles.bulletText}>
              Entra a{" "}
              <Text style={styles.bold}>dapglobal.org</Text> y completa el
              formulario de admisión.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.bulletDot}>2.</Text>
            <Text style={styles.bulletText}>
              Si no perteneces a la Red Apostólica, se requiere carta de
              consentimiento de tu pastor o cobertura ministerial.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.bulletDot}>3.</Text>
            <Text style={styles.bulletText}>
              El equipo revisa tu solicitud manualmente. Una vez aprobada,
              activas tu suscripción y entras al programa.
            </Text>
          </View>

          <Text style={styles.paraSmall}>
            Consultas:{" "}
            <Text style={styles.bold}>admisiones@dapglobal.org</Text>
          </Text>

          <View style={styles.signatureBlock}>
            <Image src={FIRMA} style={styles.signatureImage} />
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>Dr. Max Hebeling</Text>
            <Text style={styles.signatureTitle}>
              Apóstol &amp; CEO{"\n"}
              Red Apostólica Reino y Avivamiento{"\n"}
              Revival &amp; Kingdom Ministries, INC
            </Text>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          <Text>DAPGLOBAL.ORG</Text>
          <Text>BRIEF · CONVOCATORIA 2026</Text>
        </Text>
        <View style={styles.bandBottomAccent} fixed />
        <View style={styles.bandBottom} fixed />
      </Page>
    </Document>
  );
}

export async function generatePastorBrief(): Promise<Buffer> {
  assertAssetsExist();
  return await renderToBuffer(<BriefDocument />);
}
