/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer <Image> no acepta alt; el lint rule asume HTML. */
import { Document, Image, Page, Text, View } from "@react-pdf/renderer";

import {
  CLASSES_START_LABEL,
  ENROLLMENT_OPENS_LABEL,
} from "@/lib/launch/config";

import { FIRMA, LOGO_DAP, LOGO_RED } from "./brief-assets";
import { DIMENSIONS, FOR_WHOM, INCLUIDO } from "./brief-content";
import { styles } from "./brief-styles";

/**
 * Brief apostólico del DAP en PDF — pieza institucional editorial-grade.
 *
 * Estructura (4 páginas, sin blancos):
 *   1. Cover — fondo cosmic, logos, título grande, año, fechas
 *   2. Apertura · Para quién es · Visión
 *   3. Estructura · 9 dimensiones · Metodología
 *   4. Lo que incluye · Inversión · Fechas · Inscripción · Firma
 *
 * Estilos en `brief-styles.ts`, copy en `brief-content.ts`, paths +
 * fuentes en `brief-assets.ts`.
 */
export function BriefDocument() {
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
            <View style={styles.rule} />
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
            <View style={styles.rule} />
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
              Ap. Max Hebeling (40 min),{" "}
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
                <Text style={styles.bulletNum}>01.</Text>
                <Text style={styles.bulletText}>
                  Entra a{" "}
                  <Text style={styles.bold}>dapglobal.org</Text> y
                  completa el formulario de admisión.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={styles.bulletNum}>02.</Text>
                <Text style={styles.bulletText}>
                  Si no perteneces a la Red Apostólica, se requiere carta
                  de consentimiento de tu pastor o cobertura ministerial.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={styles.bulletNum}>03.</Text>
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
