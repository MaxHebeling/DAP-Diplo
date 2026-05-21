#!/usr/bin/env node
/**
 * Genera 72 guiones DOCX (1 por módulo) + 1 template master.
 *
 * Estructura de cada guion:
 *   Hoja portada (datos del módulo) → 4 secciones cronometradas:
 *     - INTRODUCCIÓN     (0:00–2:00, ~300 palabras)
 *     - DESARROLLO       (2:00–27:00, ~3,750 palabras)
 *     - APLICACIÓN       (27:00–37:00, ~1,500 palabras)
 *     - CIERRE/IMPARTIC. (37:00–40:00, ~450 palabras)
 *
 * Asume 150 wpm de speech rate (Dr. Max promedio).
 *
 * Salida: ~/Downloads/dap-guiones/00-TEMPLATE-MASTER.docx
 *         ~/Downloads/dap-guiones/01-S01-B1-reino-de-dios.docx ... etc
 */

import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  ShadingType,
  WidthType,
  PageBreak,
  LevelFormat,
} from "docx";

// ---------- 72 módulos completos ----------
const MODULES = [
  // Bloque 1 - Raíces - Discípulo
  { semana: 1, bloque_n: 1, bloque: "Raíces", dim: "Discípulo", modulo_n: 1, titulo: "Reino de Dios" },
  { semana: 2, bloque_n: 1, bloque: "Raíces", dim: "Discípulo", modulo_n: 2, titulo: "Identidad en Cristo" },
  { semana: 3, bloque_n: 1, bloque: "Raíces", dim: "Discípulo", modulo_n: 3, titulo: "Espíritu Santo" },
  { semana: 4, bloque_n: 1, bloque: "Raíces", dim: "Discípulo", modulo_n: 4, titulo: "Oración e intercesión" },
  { semana: 5, bloque_n: 1, bloque: "Raíces", dim: "Discípulo", modulo_n: 5, titulo: "Autoridad espiritual" },
  { semana: 6, bloque_n: 1, bloque: "Raíces", dim: "Discípulo", modulo_n: 6, titulo: "Cultura del Reino" },
  { semana: 7, bloque_n: 1, bloque: "Raíces", dim: "Discípulo", modulo_n: 7, titulo: "Discipulado" },
  { semana: 8, bloque_n: 1, bloque: "Raíces", dim: "Discípulo", modulo_n: 8, titulo: "Intimidad con Dios" },
  // Bloque 2 - Forja - Hijo
  { semana: 9, bloque_n: 2, bloque: "Forja", dim: "Hijo", modulo_n: 1, titulo: "Espíritu de hijo" },
  { semana: 10, bloque_n: 2, bloque: "Forja", dim: "Hijo", modulo_n: 2, titulo: "Identidad ministerial" },
  { semana: 11, bloque_n: 2, bloque: "Forja", dim: "Hijo", modulo_n: 3, titulo: "Sanidad emocional" },
  { semana: 12, bloque_n: 2, bloque: "Forja", dim: "Hijo", modulo_n: 4, titulo: "Carácter e integridad" },
  { semana: 13, bloque_n: 2, bloque: "Forja", dim: "Hijo", modulo_n: 5, titulo: "Mentalidad de Reino" },
  { semana: 14, bloque_n: 2, bloque: "Forja", dim: "Hijo", modulo_n: 6, titulo: "Procesos formativos" },
  { semana: 15, bloque_n: 2, bloque: "Forja", dim: "Hijo", modulo_n: 7, titulo: "Vida familiar" },
  { semana: 16, bloque_n: 2, bloque: "Forja", dim: "Hijo", modulo_n: 8, titulo: "Legado personal" },
  // Bloque 3 - Antorcha - Líder
  { semana: 17, bloque_n: 3, bloque: "Antorcha", dim: "Líder", modulo_n: 1, titulo: "Liderazgo bíblico" },
  { semana: 18, bloque_n: 3, bloque: "Antorcha", dim: "Líder", modulo_n: 2, titulo: "Cómo levantar líderes" },
  { semana: 19, bloque_n: 3, bloque: "Antorcha", dim: "Líder", modulo_n: 3, titulo: "Cómo discipular" },
  { semana: 20, bloque_n: 3, bloque: "Antorcha", dim: "Líder", modulo_n: 4, titulo: "Multiplicación de líderes" },
  { semana: 21, bloque_n: 3, bloque: "Antorcha", dim: "Líder", modulo_n: 5, titulo: "Cultura de equipos" },
  { semana: 22, bloque_n: 3, bloque: "Antorcha", dim: "Líder", modulo_n: 6, titulo: "Visión y dirección" },
  { semana: 23, bloque_n: 3, bloque: "Antorcha", dim: "Líder", modulo_n: 7, titulo: "Delegación y desarrollo" },
  { semana: 24, bloque_n: 3, bloque: "Antorcha", dim: "Líder", modulo_n: 8, titulo: "Cultura de honra" },
  // Bloque 4 - Cayado - Pastor
  { semana: 25, bloque_n: 4, bloque: "Cayado", dim: "Pastor", modulo_n: 1, titulo: "Pastorado integral" },
  { semana: 26, bloque_n: 4, bloque: "Cayado", dim: "Pastor", modulo_n: 2, titulo: "Predicación y homilética" },
  { semana: 27, bloque_n: 4, bloque: "Cayado", dim: "Pastor", modulo_n: 3, titulo: "Consejería pastoral" },
  { semana: 28, bloque_n: 4, bloque: "Cayado", dim: "Pastor", modulo_n: 4, titulo: "Cobertura y mentoría" },
  { semana: 29, bloque_n: 4, bloque: "Cayado", dim: "Pastor", modulo_n: 5, titulo: "Lo profético y sensibilidad espiritual" },
  { semana: 30, bloque_n: 4, bloque: "Cayado", dim: "Pastor", modulo_n: 6, titulo: "Manejo de crisis pastorales" },
  { semana: 31, bloque_n: 4, bloque: "Cayado", dim: "Pastor", modulo_n: 7, titulo: "Liberación y sanidad" },
  { semana: 32, bloque_n: 4, bloque: "Cayado", dim: "Pastor", modulo_n: 8, titulo: "Casas de paz y discipulado en hogares" },
  // Bloque 5 - Orden - Administrador
  { semana: 33, bloque_n: 5, bloque: "Orden", dim: "Administrador", modulo_n: 1, titulo: "Administración ministerial" },
  { semana: 34, bloque_n: 5, bloque: "Orden", dim: "Administrador", modulo_n: 2, titulo: "Sistemas y procesos" },
  { semana: 35, bloque_n: 5, bloque: "Orden", dim: "Administrador", modulo_n: 3, titulo: "Planeación estratégica" },
  { semana: 36, bloque_n: 5, bloque: "Orden", dim: "Administrador", modulo_n: 4, titulo: "Presupuestos y gestión financiera" },
  { semana: 37, bloque_n: 5, bloque: "Orden", dim: "Administrador", modulo_n: 5, titulo: "Legalidad y fundaciones" },
  { semana: 38, bloque_n: 5, bloque: "Orden", dim: "Administrador", modulo_n: 6, titulo: "Gestión de equipos y voluntarios" },
  { semana: 39, bloque_n: 5, bloque: "Orden", dim: "Administrador", modulo_n: 7, titulo: "Cultura organizacional" },
  { semana: 40, bloque_n: 5, bloque: "Orden", dim: "Administrador", modulo_n: 8, titulo: "KPIs ministeriales" },
  // Bloque 6 - Cosecha - Mayordomo
  { semana: 41, bloque_n: 6, bloque: "Cosecha", dim: "Mayordomo", modulo_n: 1, titulo: "Economía bíblica" },
  { semana: 42, bloque_n: 6, bloque: "Cosecha", dim: "Mayordomo", modulo_n: 2, titulo: "Mayordomía" },
  { semana: 43, bloque_n: 6, bloque: "Cosecha", dim: "Mayordomo", modulo_n: 3, titulo: "Finanzas personales" },
  { semana: 44, bloque_n: 6, bloque: "Cosecha", dim: "Mayordomo", modulo_n: 4, titulo: "Libertad financiera" },
  { semana: 45, bloque_n: 6, bloque: "Cosecha", dim: "Mayordomo", modulo_n: 5, titulo: "Finanzas ministeriales" },
  { semana: 46, bloque_n: 6, bloque: "Cosecha", dim: "Mayordomo", modulo_n: 6, titulo: "Prosperidad bíblica" },
  { semana: 47, bloque_n: 6, bloque: "Cosecha", dim: "Mayordomo", modulo_n: 7, titulo: "Múltiples fuentes de ingreso" },
  { semana: 48, bloque_n: 6, bloque: "Cosecha", dim: "Mayordomo", modulo_n: 8, titulo: "Mentalidad de Reino vs mentalidad de pobreza" },
  // Bloque 7 - Impacto - Reformador
  { semana: 49, bloque_n: 7, bloque: "Impacto", dim: "Reformador", modulo_n: 1, titulo: "Negocios del Reino" },
  { semana: 50, bloque_n: 7, bloque: "Impacto", dim: "Reformador", modulo_n: 2, titulo: "Emprendimiento apostólico" },
  { semana: 51, bloque_n: 7, bloque: "Impacto", dim: "Reformador", modulo_n: 3, titulo: "Marca personal y branding" },
  { semana: 52, bloque_n: 7, bloque: "Impacto", dim: "Reformador", modulo_n: 4, titulo: "Marketing y ventas" },
  { semana: 53, bloque_n: 7, bloque: "Impacto", dim: "Reformador", modulo_n: 5, titulo: "Modelos de negocio" },
  { semana: 54, bloque_n: 7, bloque: "Impacto", dim: "Reformador", modulo_n: 6, titulo: "Liderazgo empresarial" },
  { semana: 55, bloque_n: 7, bloque: "Impacto", dim: "Reformador", modulo_n: 7, titulo: "Escalabilidad y expansión" },
  { semana: 56, bloque_n: 7, bloque: "Impacto", dim: "Reformador", modulo_n: 8, titulo: "Influencia cultural" },
  // Bloque 8 - Influencia - Arquitecto
  { semana: 57, bloque_n: 8, bloque: "Influencia", dim: "Arquitecto", modulo_n: 1, titulo: "IA aplicada al ministerio" },
  { semana: 58, bloque_n: 8, bloque: "Influencia", dim: "Arquitecto", modulo_n: 2, titulo: "Automatización pastoral" },
  { semana: 59, bloque_n: 8, bloque: "Influencia", dim: "Arquitecto", modulo_n: 3, titulo: "Producción audiovisual y streaming" },
  { semana: 60, bloque_n: 8, bloque: "Influencia", dim: "Arquitecto", modulo_n: 4, titulo: "Comunicación digital de impacto" },
  { semana: 61, bloque_n: 8, bloque: "Influencia", dim: "Arquitecto", modulo_n: 5, titulo: "Storytelling y narrativa apostólica" },
  { semana: 62, bloque_n: 8, bloque: "Influencia", dim: "Arquitecto", modulo_n: 6, titulo: "Marca y presencia digital" },
  { semana: 63, bloque_n: 8, bloque: "Influencia", dim: "Arquitecto", modulo_n: 7, titulo: "CRM ministerial y gestión de datos" },
  { semana: 64, bloque_n: 8, bloque: "Influencia", dim: "Arquitecto", modulo_n: 8, titulo: "Evangelismo digital" },
  // Bloque 9 - Dominio - Enviado
  { semana: 65, bloque_n: 9, bloque: "Dominio", dim: "Enviado", modulo_n: 1, titulo: "Gobierno apostólico" },
  { semana: 66, bloque_n: 9, bloque: "Dominio", dim: "Enviado", modulo_n: 2, titulo: "Cultura apostólica" },
  { semana: 67, bloque_n: 9, bloque: "Dominio", dim: "Enviado", modulo_n: 3, titulo: "Reforma y transformación cultural" },
  { semana: 68, bloque_n: 9, bloque: "Dominio", dim: "Enviado", modulo_n: 4, titulo: "Plantación de iglesias" },
  { semana: 69, bloque_n: 9, bloque: "Dominio", dim: "Enviado", modulo_n: 5, titulo: "Misiones globales" },
  { semana: 70, bloque_n: 9, bloque: "Dominio", dim: "Enviado", modulo_n: 6, titulo: "Sucesión y legado generacional" },
  { semana: 71, bloque_n: 9, bloque: "Dominio", dim: "Enviado", modulo_n: 7, titulo: "Estrategias de Reino" },
  { semana: 72, bloque_n: 9, bloque: "Dominio", dim: "Enviado", modulo_n: 8, titulo: "Comisionamiento final" },
];

// ---------- Helpers de estilos ----------
const COLORS = {
  ink: "0B1736",
  inkSoft: "3A4565",
  violet: "7B61FF",
  coral: "FF4D6D",
  divider: "E2E5F0",
  paperTint: "F6F7FB",
};

const border = { style: BorderStyle.SINGLE, size: 4, color: COLORS.divider };
const cellBorders = { top: border, bottom: border, left: border, right: border };

function P({ text, bold, size, color, italic, align, before, after, indent }) {
  return new Paragraph({
    alignment: align,
    spacing: { before: before ?? 0, after: after ?? 0 },
    indent,
    children: [
      new TextRun({
        text: text ?? "",
        bold: !!bold,
        italics: !!italic,
        size: size ?? 22,
        color: color ?? COLORS.ink,
        font: "Helvetica",
      }),
    ],
  });
}

function eyebrow(text, color = COLORS.coral) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: 16,
        color,
        font: "Helvetica",
        characterSpacing: 60,
      }),
    ],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 0, after: 240 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 44,
        color: COLORS.ink,
        font: "Helvetica",
      }),
    ],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 160 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28,
        color: COLORS.ink,
        font: "Helvetica",
      }),
    ],
  });
}

function rule() {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.coral, space: 1 } },
    children: [new TextRun({ text: "", size: 2 })],
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 60 },
    children: [
      new TextRun({ text, size: 22, color: COLORS.ink, font: "Helvetica" }),
    ],
  });
}

function placeholder(text) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    indent: { left: 240 },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: COLORS.violet, space: 6 } },
    children: [
      new TextRun({
        text,
        italics: true,
        size: 20,
        color: COLORS.inkSoft,
        font: "Helvetica",
      }),
    ],
  });
}

// Tabla de metadatos del módulo
function metaTable(mod) {
  const rowData = [
    ["Semana del programa", `${mod.semana} de 72`],
    ["Bloque", `${String(mod.bloque_n).padStart(2, "0")} · ${mod.bloque}`],
    ["Dimensión que otorga", mod.dim],
    ["Módulo en el bloque", `${mod.modulo_n} de 8`],
    ["Formato", "Audio MP3 · 40 minutos"],
    ["Palabras estimadas", "≈ 6,000 (a 150 wpm)"],
  ];

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3600, 5760],
    rows: rowData.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              borders: cellBorders,
              width: { size: 3600, type: WidthType.DXA },
              shading: { fill: COLORS.paperTint, type: ShadingType.CLEAR, color: "auto" },
              margins: { top: 100, bottom: 100, left: 160, right: 160 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: label.toUpperCase(),
                      bold: true,
                      size: 16,
                      color: COLORS.inkSoft,
                      font: "Helvetica",
                      characterSpacing: 40,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              borders: cellBorders,
              width: { size: 5760, type: WidthType.DXA },
              margins: { top: 100, bottom: 100, left: 160, right: 160 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: value,
                      bold: true,
                      size: 22,
                      color: COLORS.ink,
                      font: "Helvetica",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
    ),
  });
}

// Bloque de instrucciones por sección del guion
function sectionBlock({ num, title, time, words, objective, prompts, isLast }) {
  const children = [
    eyebrow(`${time}  ·  ≈ ${words} palabras`, COLORS.violet),
    h2(`${String(num).padStart(2, "0")}. ${title}`),
    rule(),
    P({ text: "Objetivo de esta sección:", bold: true, before: 80, after: 60 }),
    P({ text: objective, after: 160 }),
    P({ text: "Preguntas que el guion debe responder:", bold: true, before: 80, after: 60 }),
  ];
  for (const q of prompts) {
    children.push(bullet(q));
  }
  children.push(P({ text: "Texto del guion:", bold: true, before: 240, after: 100 }));
  children.push(placeholder("Escribí acá el contenido oral palabra por palabra. Lo que se va a decir, no notas. Manten el ritmo: frases cortas, pausas, repeticiones intencionales (la repetición ayuda al oyente). Recordá que es AUDIO — no hay imágenes para apoyar."));
  // Espacio para escribir
  for (let i = 0; i < 8; i++) {
    children.push(P({ text: "" }));
  }
  if (!isLast) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }
  return children;
}

function buildDoc(mod, isTemplate = false) {
  const title = isTemplate
    ? "Template Master — Guion de Módulo DAP"
    : `Módulo ${mod.modulo_n} — ${mod.titulo}`;
  const subtitle = isTemplate
    ? "Cloná este archivo, completá los datos del módulo arriba y desarrollá las 4 secciones cronometradas abajo."
    : `${mod.bloque} · Semana ${mod.semana} · Dimensión ${mod.dim}`;

  const portada = [
    eyebrow("DAP · Guion de enseñanza · Convocatoria 2026"),
    h1(title),
    P({ text: subtitle, italic: true, color: COLORS.inkSoft, size: 24, after: 360 }),
    rule(),
    P({ text: "" }),
  ];

  if (!isTemplate) {
    portada.push(metaTable(mod));
    portada.push(P({ text: "" }));
  } else {
    portada.push(P({ text: "Reemplazá los datos de abajo por los del módulo correspondiente:", italic: true, color: COLORS.inkSoft, after: 160 }));
    portada.push(metaTable({ semana: "—", bloque_n: 0, bloque: "—", dim: "—", modulo_n: 0, titulo: "—" }));
    portada.push(P({ text: "" }));
  }

  portada.push(eyebrow("Cómo usar este guion", COLORS.violet));
  portada.push(P({ text: "Estructura cronometrada para audio de 40 minutos a ritmo natural (≈150 palabras por minuto). Cada sección incluye objetivo, preguntas guía y un espacio para que escribas el guion palabra por palabra.", after: 80 }));
  portada.push(bullet("0:00–2:00 · Introducción — gancho + qué van a aprender"));
  portada.push(bullet("2:00–27:00 · Desarrollo doctrinal — la enseñanza central"));
  portada.push(bullet("27:00–37:00 · Aplicación práctica — cómo se aplica esta semana"));
  portada.push(bullet("37:00–40:00 · Cierre e impartición — palabra apostólica final"));
  portada.push(new Paragraph({ children: [new PageBreak()] }));

  // ---------- Sección 1: INTRODUCCIÓN ----------
  const s1 = sectionBlock({
    num: 1,
    title: "Introducción",
    time: "0:00 – 2:00",
    words: 300,
    objective: "Captar la atención del oyente en los primeros 30 segundos. Posicionar por qué este módulo importa AHORA en la vida del pastor. Anunciar qué va a quedar instalado al final.",
    prompts: [
      "¿Cuál es el dolor / pregunta real del pastor que este módulo responde?",
      "¿Qué imagen, historia o frase abre el módulo con peso?",
      "¿Qué van a poder decir / hacer / discernir al terminar esta semana?",
      "¿Qué versículo ancla abre el módulo?",
    ],
    isLast: false,
  });

  // ---------- Sección 2: DESARROLLO ----------
  const s2 = sectionBlock({
    num: 2,
    title: "Desarrollo doctrinal",
    time: "2:00 – 27:00",
    words: 3750,
    objective: "Enseñar la doctrina del módulo con profundidad pero accesible. Apoyarse en Escritura, historia bíblica y revelación apostólica. NO improvisar exégesis. El alumno tiene que terminar con la verdad central clara y argumentada.",
    prompts: [
      "¿Cuál es la verdad central que define este módulo? (1 frase clara)",
      "¿Qué 3-4 puntos doctrinales sostienen esa verdad?",
      "¿Qué pasajes bíblicos clave la confirman? (mínimo 3)",
      "¿Qué malentendidos o herejías comunes debe corregir esta enseñanza?",
      "¿Hay alguna historia bíblica o histórica que ilustre con fuerza?",
      "¿Qué autoridades apostólicas históricas han enseñado sobre esto?",
    ],
    isLast: false,
  });

  // ---------- Sección 3: APLICACIÓN ----------
  const s3 = sectionBlock({
    num: 3,
    title: "Aplicación práctica",
    time: "27:00 – 37:00",
    words: 1500,
    objective: "Bajar la doctrina a la vida del pastor esta semana. Específico, accionable, medible. NO conceptos generales. Que el oyente termine con 2-3 pasos concretos que va a ejecutar antes del próximo módulo.",
    prompts: [
      "¿Cuál es la primera acción que el pastor debería tomar hoy mismo?",
      "¿Qué hábito o disciplina semanal queda instalada?",
      "¿Cómo se aplica esto en su iglesia / equipo / familia / vida personal?",
      "¿Qué obstáculos comunes va a enfrentar al aplicarlo y cómo los supera?",
      "¿Qué métrica concreta puede medir para saber si está caminando en esta verdad?",
    ],
    isLast: false,
  });

  // ---------- Sección 4: CIERRE ----------
  const s4 = sectionBlock({
    num: 4,
    title: "Cierre e impartición",
    time: "37:00 – 40:00",
    words: 450,
    objective: "Sellar la enseñanza con peso apostólico. Declaración profética sobre la vida del oyente. NO repetir lo dicho — IMPARTIR lo recibido. Termina con oración corta o frase que queda resonando.",
    prompts: [
      "¿Qué se declara apostólicamente sobre la vida del oyente al recibir este módulo?",
      "¿Qué identidad nueva activa esta enseñanza en él?",
      "¿Con qué versículo o frase cierra el audio (lo que queda resonando)?",
      "¿Hay una oración corta de impartición para hacer juntos?",
    ],
    isLast: false,
  });

  // ---------- Notas finales ----------
  const notas = [
    eyebrow("Notas de producción", COLORS.violet),
    h2("Notas y referencias"),
    rule(),
    P({ text: "Material de apoyo, links, citas exactas, recursos descargables que acompañan este módulo:", italic: true, color: COLORS.inkSoft, after: 160 }),
    placeholder("Referencias bíblicas adicionales, libros citados, links a recursos, plantillas a adjuntar, ideas para PDFs/audios descargables, etc."),
    P({ text: "" }),
    P({ text: "" }),
    P({ text: "" }),
    P({ text: "" }),
    P({ text: "" }),
    P({ text: "" }),
    P({ text: "" }),
    rule(),
    P({ text: "Versión:", bold: true, before: 240, after: 40 }),
    P({ text: "Borrador 1  ·  Fecha: ____________  ·  Autor: ____________", color: COLORS.inkSoft, after: 80 }),
    P({ text: "Revisado por Dr. Max:", bold: true, after: 40 }),
    P({ text: "☐ Aprobado para grabación   ☐ Requiere cambios", color: COLORS.inkSoft }),
  ];

  return new Document({
    creator: "DAP — Diplomado Apostólico Pastoral",
    title,
    description: "Guion de módulo del Diplomado Apostólico Pastoral",
    styles: {
      default: {
        document: { run: { font: "Helvetica", size: 22 } },
      },
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 480, hanging: 240 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children: [
          ...portada,
          ...s1,
          ...s2,
          ...s3,
          ...s4,
          ...notas,
        ],
      },
    ],
  });
}

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  const outDir = join(homedir(), "Downloads", "dap-guiones");

  // 1. Master template
  const masterBuf = await Packer.toBuffer(buildDoc(MODULES[0], true));
  await writeFile(join(outDir, "00-TEMPLATE-MASTER.docx"), masterBuf);
  console.log("✓ 00-TEMPLATE-MASTER.docx");

  // 2. 72 módulos
  for (const mod of MODULES) {
    const buf = await Packer.toBuffer(buildDoc(mod));
    const filename = `${String(mod.semana).padStart(2, "0")}-S${String(mod.semana).padStart(2, "0")}-B${mod.bloque_n}-${slugify(mod.titulo)}.docx`;
    await writeFile(join(outDir, filename), buf);
  }
  console.log(`✓ 72 guiones generados en ${outDir}`);
}

await main();
