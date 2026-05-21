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

import {
  CLASSES_START_LABEL,
  ENROLLMENT_OPENS_LABEL,
} from "@/lib/launch/config";

/**
 * Brief apostólico del DAP en PDF — pieza institucional para que el
 * Dr. Max comparta con pastores de la red (y aspirantes) antes de la
 * apertura de inscripciones del 01 de Junio.
 *
 * Estructura (4 páginas, sin blancos):
 *   1. Cover — fondo cosmic, logos, título grande, año, fechas
 *   2. Apertura · Para quién es · Visión
 *   3. Estructura · 9 dimensiones · Metodología semanal
 *   4. Lo que incluye · Inversión · Fechas · Cómo inscribirse · Firma
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
  violetDark: "#5B43D1",
  coral: "#FF4D6D",
  coralDark: "#E63E5C",
  divider: "#E2E5F0",
  cardTint: "#FBFBFD",
  cosmic: "#07142B",
};

const styles = StyleSheet.create({
  // ---------- Interior page chrome ----------
  page: {
    padding: 0,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    color: COLORS.ink,
    fontSize: 10.5,
    lineHeight: 1.65,
  },
  bandTop: { height: 7, backgroundColor: COLORS.violet },
  bandTopAccent: { height: 3, backgroundColor: COLORS.coral },
  inner: {
    paddingHorizontal: 58,
    paddingTop: 44,
    paddingBottom: 72,
    flexGrow: 1,
  },

  // ---------- Interior page header (eyebrow + page number) ----------
  pageHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  pageHeaderEyebrow: {
    fontSize: 7.5,
    letterSpacing: 3.5,
    color: COLORS.coral,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  pageHeaderPage: {
    fontSize: 8,
    letterSpacing: 1.8,
    color: COLORS.inkMuted,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },

  // ---------- Typography ----------
  sectionEyebrow: {
    fontSize: 7.5,
    letterSpacing: 3.5,
    color: COLORS.violet,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  h1: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    letterSpacing: 0.2,
    marginBottom: 18,
    lineHeight: 1.2,
  },
  h2: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    marginBottom: 12,
    lineHeight: 1.25,
  },
  para: {
    fontSize: 10.5,
    color: COLORS.ink,
    marginBottom: 12,
    textAlign: "justify",
    lineHeight: 1.7,
  },
  paraSmall: {
    fontSize: 9.5,
    color: COLORS.inkSoft,
    marginBottom: 8,
    lineHeight: 1.6,
  },
  bold: { fontFamily: "Helvetica-Bold", color: COLORS.ink },
  highlight: { fontFamily: "Helvetica-Bold", color: COLORS.violet },

  // ---------- Section block spacing ----------
  sectionBlock: { marginBottom: 28 },
  sectionBlockTight: { marginBottom: 20 },
  dividerThin: {
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.divider,
    marginTop: 4,
    marginBottom: 22,
  },

  // ---------- Bullets ----------
  bulletList: { marginTop: 4 },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 10,
    paddingLeft: 2,
  },
  bulletDot: {
    width: 14,
    fontSize: 10.5,
    color: COLORS.coral,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.7,
  },
  bulletNum: {
    width: 18,
    fontSize: 10.5,
    color: COLORS.violet,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.7,
  },
  bulletText: {
    flex: 1,
    fontSize: 10.5,
    color: COLORS.ink,
    lineHeight: 1.7,
  },

  // ---------- 9 Dimensiones table ----------
  dimRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.divider,
  },
  dimRowLast: { borderBottomWidth: 0 },
  dimNum: {
    width: 32,
    fontSize: 12,
    color: COLORS.violet,
    fontFamily: "Helvetica-Bold",
  },
  dimName: {
    width: 108,
    fontSize: 11,
    color: COLORS.ink,
    fontFamily: "Helvetica-Bold",
  },
  dimBloque: {
    flex: 1,
    fontSize: 10,
    color: COLORS.inkSoft,
  },

  // ---------- Callouts ----------
  callout: {
    marginTop: 4,
    marginBottom: 18,
    padding: 18,
    backgroundColor: COLORS.cardTint,
    borderLeft: `3 solid ${COLORS.coral}`,
    borderRadius: 4,
  },
  calloutTitle: {
    fontSize: 7.5,
    letterSpacing: 2.5,
    color: COLORS.coral,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
  },
  calloutRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  calloutLabel: {
    width: 145,
    fontSize: 9.5,
    color: COLORS.inkSoft,
    lineHeight: 1.5,
  },
  calloutValue: {
    flex: 1,
    fontSize: 10.5,
    color: COLORS.ink,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.5,
  },
  priceBig: {
    fontSize: 30,
    fontFamily: "Helvetica-Bold",
    color: COLORS.violet,
    letterSpacing: 0.5,
  },
  priceSmall: {
    fontSize: 9,
    color: COLORS.inkSoft,
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 1.6,
  },

  // ---------- Signature ----------
  signatureBlock: {
    marginTop: 24,
    alignItems: "flex-start",
  },
  signatureImage: {
    width: 150,
    height: 56,
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
    fontSize: 11.5,
    color: COLORS.ink,
  },
  signatureTitle: {
    fontSize: 8.5,
    color: COLORS.inkSoft,
    marginTop: 3,
    lineHeight: 1.5,
  },

  // ---------- Interior page footer ----------
  footer: {
    position: "absolute",
    bottom: 24,
    left: 58,
    right: 58,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: COLORS.inkMuted,
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
    height: 7,
    backgroundColor: COLORS.violet,
  },

  // ============================================================
  // COVER PAGE
  // ============================================================
  coverPage: {
    padding: 0,
    fontFamily: "Helvetica",
    backgroundColor: COLORS.cosmic,
    color: "#FFFFFF",
    flexDirection: "column",
  },
  // Gradient simulation: 2 layered semi-transparent blocks
  coverGlowTop: {
    position: "absolute",
    top: -40,
    left: -40,
    width: 360,
    height: 360,
    backgroundColor: COLORS.violetDark,
    opacity: 0.35,
    borderRadius: 180,
  },
  coverGlowBottom: {
    position: "absolute",
    bottom: -60,
    right: -80,
    width: 380,
    height: 380,
    backgroundColor: COLORS.coral,
    opacity: 0.18,
    borderRadius: 190,
  },
  // Left spine
  coverSpine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 14,
    backgroundColor: COLORS.coral,
  },
  coverSpineAccent: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 14,
    width: 4,
    backgroundColor: COLORS.violet,
  },
  // Bottom heavy bands
  coverBottomBand: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 18,
    backgroundColor: COLORS.coral,
  },
  coverBottomBandAccent: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 18,
    height: 6,
    backgroundColor: COLORS.violet,
  },
  coverInner: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 90,
    paddingLeft: 64,
    paddingRight: 64,
    flexDirection: "column",
  },
  coverHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 100,
  },
  coverLogoRed: {
    width: 72,
    height: 72,
    objectFit: "contain",
  },
  coverLogoDap: {
    width: 72,
    height: 72,
    objectFit: "contain",
  },
  coverEyebrow: {
    fontSize: 9,
    letterSpacing: 5,
    color: COLORS.coral,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 28,
  },
  coverTitle: {
    fontSize: 44,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
    lineHeight: 1.1,
    marginBottom: 22,
  },
  coverTitleAccent: {
    color: COLORS.coral,
  },
  coverTagline: {
    fontSize: 13,
    color: "rgba(255,255,255,0.78)",
    lineHeight: 1.65,
    marginBottom: 36,
    maxWidth: 400,
  },
  // Bottom info block
  coverFooterRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: "auto",
  },
  coverYearBlock: { flexDirection: "column" },
  coverYearLabel: {
    fontSize: 8,
    letterSpacing: 3,
    color: "rgba(255,255,255,0.55)",
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 5,
  },
  coverYear: {
    fontSize: 52,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
    lineHeight: 1,
    letterSpacing: 1,
  },
  coverDateBlock: { alignItems: "flex-end" },
  coverDateLabel: {
    fontSize: 8,
    letterSpacing: 3,
    color: "rgba(255,255,255,0.55)",
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  coverDateValue: {
    fontSize: 11,
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  coverDateSecond: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
  },
  coverFooterCaption: {
    fontSize: 7.5,
    letterSpacing: 1.8,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    textAlign: "center",
    position: "absolute",
    bottom: 34,
    left: 0,
    right: 0,
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

const FOR_WHOM = [
  "Eres pastor, líder de ministerio o aspirante a serlo y quieres formación con cobertura apostólica real.",
  "Sientes que tu llamado pide profundidad doctrinal, identidad de hijo y capacidad de gobernar — no sólo dones operando sueltos.",
  "Quieres ser formado en ministerio, gobierno, finanzas, empresa y tecnología para no sólo levantar gente, sino estructuras del Reino.",
  "Buscas un programa serio que respete tu tiempo: 100% online, a tu ritmo dentro de la semana, sin viajes obligatorios.",
];

function BriefDocument() {
  return (
    <Document
      title="Brief Apostólico — Diplomado Apostólico Pastoral 2026"
      author="Dr. Max Hebeling — Red Apostólica Reino y Avivamiento"
      subject="DAP — Convocatoria 2026"
    >
      {/* ============================================================ */}
      {/* COVER PAGE                                                    */}
      {/* ============================================================ */}
      <Page size="LETTER" style={styles.coverPage}>
        <View style={styles.coverGlowTop} fixed />
        <View style={styles.coverGlowBottom} fixed />
        <View style={styles.coverSpine} fixed />
        <View style={styles.coverSpineAccent} fixed />

        <View style={styles.coverInner}>
          <View style={styles.coverHeader}>
            <Image src={LOGO_RED} style={styles.coverLogoRed} />
            <Image src={LOGO_DAP} style={styles.coverLogoDap} />
          </View>

          <Text style={styles.coverEyebrow}>Brief de Convocatoria</Text>
          <Text style={styles.coverTitle}>
            Diplomado{"\n"}
            Apostólico{"\n"}
            <Text style={styles.coverTitleAccent}>Pastoral.</Text>
          </Text>
          <Text style={styles.coverTagline}>
            Formación integral de dieciocho meses para pastores, líderes y
            padres apostólicos preparados para esta hora del Reino.
          </Text>

          <View style={styles.coverFooterRow}>
            <View style={styles.coverYearBlock}>
              <Text style={styles.coverYearLabel}>Convocatoria</Text>
              <Text style={styles.coverYear}>2026</Text>
            </View>
            <View style={styles.coverDateBlock}>
              <Text style={styles.coverDateLabel}>Fechas clave</Text>
              <Text style={styles.coverDateValue}>
                Inscripciones · 01 Junio 2026
              </Text>
              <Text style={styles.coverDateSecond}>
                Clases · Martes 23 Junio 2026
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.coverFooterCaption} fixed>
          DAPGLOBAL.ORG  ·  RED APOSTÓLICA REINO Y AVIVAMIENTO
        </Text>
        <View style={styles.coverBottomBandAccent} fixed />
        <View style={styles.coverBottomBand} fixed />
      </Page>

      {/* ============================================================ */}
      {/* PAGE 2 — Apertura · Para quién · Visión                       */}
      {/* ============================================================ */}
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.bandTop} fixed />
        <View style={styles.bandTopAccent} fixed />

        <View style={styles.inner}>
          <View style={styles.pageHeaderRow}>
            <Text style={styles.pageHeaderEyebrow}>
              Diplomado Apostólico Pastoral
            </Text>
            <Text style={styles.pageHeaderPage}>02</Text>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionEyebrow}>Palabra de apertura</Text>
            <Text style={styles.h1}>Pastor amado,</Text>
            <Text style={styles.para}>
              El Señor está levantando una generación de{" "}
              <Text style={styles.highlight}>líderes de impacto</Text>{" "}
              capaces de gobernar, formar y enviar. No basta con buenos
              predicadores — la hora pide pastores con identidad de hijo,
              mentalidad de Reino y capacidad real de construir.
            </Text>
            <Text style={styles.para}>
              El{" "}
              <Text style={styles.bold}>
                Diplomado Apostólico Pastoral (DAP)
              </Text>{" "}
              nace de la{" "}
              <Text style={styles.highlight}>
                Red Apostólica Reino y Avivamiento
              </Text>{" "}
              como respuesta concreta a esa necesidad: no un curso más,
              sino un proceso de dieciocho meses, paso a paso, donde cada
              semana recibes enseñanza, corrección personal y activación
              práctica en tu llamado.
            </Text>
          </View>

          <View style={styles.dividerThin} />

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionEyebrow}>Para quién es</Text>
            <Text style={styles.h2}>Este diplomado es para ti si...</Text>
            <View style={styles.bulletList}>
              {FOR_WHOM.map((item, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>·</Text>
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.dividerThin} />

          <View style={styles.sectionBlockTight}>
            <Text style={styles.sectionEyebrow}>Visión</Text>
            <Text style={styles.h2}>De Discípulo a Enviado</Text>
            <Text style={styles.para}>
              El DAP forma en{" "}
              <Text style={styles.highlight}>
                nueve dimensiones ministeriales
              </Text>
              , una por cada bloque del programa. Cada dimensión es una
              capa de identidad y autoridad que se imparte sobre tu vida
              al aprobar los 8 módulos del bloque correspondiente — desde
              la primera dimensión de Discípulo hasta la novena de
              Enviado.
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

      {/* ============================================================ */}
      {/* PAGE 3 — Estructura · 9 Dimensiones · Metodología             */}
      {/* ============================================================ */}
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.bandTop} fixed />
        <View style={styles.bandTopAccent} fixed />

        <View style={styles.inner}>
          <View style={styles.pageHeaderRow}>
            <Text style={styles.pageHeaderEyebrow}>
              Estructura del Programa
            </Text>
            <Text style={styles.pageHeaderPage}>03</Text>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionEyebrow}>El programa</Text>
            <Text style={styles.h1}>
              18 meses · 72 módulos · 9 bloques
            </Text>
            <Text style={styles.para}>
              <Text style={styles.bold}>Un módulo nuevo cada semana</Text>
              {" "}durante 72 semanas. Cada bloque agrupa 8 módulos y, al
              completarse, otorga una nueva dimensión ministerial al
              alumno. Las 9 dimensiones del DAP son:
            </Text>
          </View>

          <View style={styles.sectionBlock}>
            {DIMENSIONS.map((d, i) => (
              <View
                key={d.n}
                style={[
                  styles.dimRow,
                  i === DIMENSIONS.length - 1 ? styles.dimRowLast : {},
                ]}
              >
                <Text style={styles.dimNum}>
                  {String(d.n).padStart(2, "0")}
                </Text>
                <Text style={styles.dimName}>{d.name}</Text>
                <Text style={styles.dimBloque}>
                  Bloque {d.n} — {d.bloque}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.dividerThin} />

          <View style={styles.sectionBlockTight}>
            <Text style={styles.sectionEyebrow}>Metodología semanal</Text>
            <Text style={styles.h2}>De martes a lunes, paso a paso</Text>
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
              <Text style={styles.bold}>(2)</Text> enseñanza en video del
              Dr. Max (45–60 min),{" "}
              <Text style={styles.bold}>(3)</Text> activación práctica
              escrita,{" "}
              <Text style={styles.bold}>(4)</Text> evaluación con quiz
              autocorregible (pasa con ≥70%), y{" "}
              <Text style={styles.bold}>(5)</Text> impartición — palabra
              apostólica de cierre.
            </Text>
            <Text style={styles.para}>
              Tu activación escrita es revisada{" "}
              <Text style={styles.highlight}>personalmente</Text> con la
              voz pastoral del Dr. Max y devuelta en 48 horas con feedback
              estructurado: lo que se vio, lo que necesitas afinar, tu
              próximo paso y una palabra de impartación.
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

      {/* ============================================================ */}
      {/* PAGE 4 — Incluye · Inversión · Fechas · Inscripción · Firma   */}
      {/* ============================================================ */}
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.bandTop} fixed />
        <View style={styles.bandTopAccent} fixed />

        <View style={styles.inner}>
          <View style={styles.pageHeaderRow}>
            <Text style={styles.pageHeaderEyebrow}>
              Inversión & Convocatoria
            </Text>
            <Text style={styles.pageHeaderPage}>04</Text>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionEyebrow}>Lo que incluye</Text>
            <Text style={styles.h2}>
              Acceso completo al ecosistema DAP
            </Text>
            <View style={styles.bulletList}>
              {INCLUIDO.map((item, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>·</Text>
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.callout}>
            <Text style={styles.calloutTitle}>Inversión</Text>
            <Text style={styles.priceBig}>$25 USD / mes</Text>
            <Text style={styles.priceSmall}>
              Modelo de suscripción flexible. Cancelas cuando quieras
              desde tu dashboard — tu progreso queda guardado. Si
              reactivas, retomas desde la semana donde dejaste.
            </Text>
            <Text style={styles.paraSmall}>
              <Text style={styles.bold}>Garantía de 7 días:</Text> si
              dentro de la primera semana sientes que el DAP no es para
              ti, te devolvemos el 100% del primer pago.
            </Text>
          </View>

          <View style={styles.callout}>
            <Text style={styles.calloutTitle}>Fechas clave</Text>
            <View style={styles.calloutRow}>
              <Text style={styles.calloutLabel}>
                Apertura de inscripciones
              </Text>
              <Text style={styles.calloutValue}>
                {ENROLLMENT_OPENS_LABEL}
              </Text>
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

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionEyebrow}>Cómo inscribirse</Text>
            <Text style={styles.h2}>
              3 pasos a partir del 01 de Junio
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletRow}>
                <Text style={styles.bulletNum}>1.</Text>
                <Text style={styles.bulletText}>
                  Entra a{" "}
                  <Text style={styles.bold}>dapglobal.org</Text> y
                  completa el formulario de admisión.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={styles.bulletNum}>2.</Text>
                <Text style={styles.bulletText}>
                  Si no perteneces a la Red Apostólica, se requiere carta
                  de consentimiento de tu pastor o cobertura ministerial.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={styles.bulletNum}>3.</Text>
                <Text style={styles.bulletText}>
                  El equipo revisa tu solicitud manualmente. Una vez
                  aprobada, activas tu suscripción y entras al programa.
                </Text>
              </View>
            </View>
            <Text style={styles.paraSmall}>
              Consultas:{" "}
              <Text style={styles.bold}>admisiones@dapglobal.org</Text>
            </Text>
          </View>

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
