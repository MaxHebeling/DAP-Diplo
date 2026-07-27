// Helper genérico para cargar un módulo del Bloque 2.
// Pasarle un objeto config con todo el contenido y lo persiste end-to-end.
//
// Uso: import { loadModule } from "./load-bloque-2-modulo.mjs";
//      await loadModule({...config});

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Faltan envs");
  process.exit(1);
}

function shuffleOptions(options, correctIndex, salt) {
  const hash = createHash("sha256").update(salt).digest();
  const indexed = options.map((opt, i) => ({
    opt,
    originalIdx: i,
    sortKey: hash[i % hash.length] * 31 + i,
  }));
  indexed.sort((a, b) => a.sortKey - b.sortKey);
  return {
    options: indexed.map((x) => x.opt),
    correctIndex: indexed.findIndex((x) => x.originalIdx === correctIndex),
  };
}

async function sb(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...opts,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      ...opts.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`${path} → ${res.status}: ${await res.text()}`);
  }
  return res;
}

async function uploadPdf(localPath, storagePath) {
  const buf = readFileSync(localPath);
  await sb(`/storage/v1/object/module-pdfs/${storagePath}`, {
    method: "POST",
    headers: { "Content-Type": "application/pdf", "x-upsert": "true" },
    body: buf,
  });
  return `${SUPABASE_URL}/storage/v1/object/public/module-pdfs/${storagePath}`;
}

export async function loadModule(cfg) {
  const {
    moduleId, slug, leccionNum,
    title, subtitle, objective, mainRevelation, impartationPhrase, durationMinutes,
    pdfLessonPath, pdfComplementPath,
    bodyIntro, bodyTeaching, bodyActivation, bodyImpartation,
    quizQuestions,
    titleUpdate, // si != null, también corrige title + slug del módulo
  } = cfg;

  console.log(`\n========== Módulo ${leccionNum} · ${title} ==========`);

  // 1) Subir PDFs
  console.log("1) Subiendo PDFs...");
  const lessonStorageBase = `bloque-2-leccion-${String(leccionNum).padStart(2, "0")}-${slug}`;
  const lessonUrl = await uploadPdf(pdfLessonPath, `${moduleId}/es/${lessonStorageBase}.pdf`);
  const complementUrl = await uploadPdf(pdfComplementPath, `${moduleId}/es/${lessonStorageBase}-complemento.pdf`);
  console.log("   ✅ 2 PDFs subidos");

  // 2) Module_resources
  console.log("2) Resources...");
  await sb(`/rest/v1/module_resources?module_id=eq.${moduleId}&locale=eq.es`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  await sb(`/rest/v1/module_resources`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify([
      { module_id: moduleId, title: `${title} — Lección completa`, kind: "pdf", url: lessonUrl, order_index: 0, locale: "es" },
      { module_id: moduleId, title: "Material complementario — Tareas, examen e impartición", kind: "pdf", url: complementUrl, order_index: 1, locale: "es" },
    ]),
  });
  console.log("   ✅");

  // 3) Update módulo
  console.log("3) Actualizando módulo...");
  const modulePatch = {
    subtitle,
    objective,
    main_revelation: mainRevelation,
    impartation_phrase: impartationPhrase,
    duration_minutes: durationMinutes,
  };
  if (titleUpdate) {
    modulePatch.title = titleUpdate.title;
    modulePatch.slug = titleUpdate.slug;
  }
  await sb(`/rest/v1/modules?id=eq.${moduleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(modulePatch),
  });
  console.log("   ✅");

  // 4) Body de las secciones
  console.log("4) body_md de las 5 secciones...");
  const bodyEvaluation = `## Evaluación · Comprensión del módulo

Esta evaluación verifica que la enseñanza haya tomado raíz en tu comprensión. Son **8 preguntas** sobre los puntos centrales de la lección.

- **Umbral de aprobación:** 70% (mínimo 6 de 8 correctas)
- **Intentos disponibles:** 3
- Las preguntas salen mezcladas en cada intento

> 📌 *No es un examen para juzgar tu vida espiritual. Es una herramienta para asegurar que entendiste los conceptos doctrinales antes de avanzar al siguiente módulo.*

Cuando estés listo, abre el quiz desde el panel del alumno.`;

  const sections = {
    intro: bodyIntro,
    teaching: bodyTeaching,
    activation: bodyActivation,
    evaluation: bodyEvaluation,
    impartation: bodyImpartation,
  };
  for (const [kind, body_md] of Object.entries(sections)) {
    await sb(`/rest/v1/module_sections?module_id=eq.${moduleId}&kind=eq.${kind}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ body_md }),
    });
  }
  console.log("   ✅");

  // 5) Quiz
  console.log("5) Quiz...");
  const evalRes = await sb(`/rest/v1/module_sections?module_id=eq.${moduleId}&kind=eq.evaluation&select=id`);
  const [{ id: evalSectionId }] = await evalRes.json();

  // Limpiar quiz/preguntas viejas
  const oldQuizRes = await sb(`/rest/v1/quizzes?module_section_id=eq.${evalSectionId}&select=id`);
  const oldQuizzes = await oldQuizRes.json();
  for (const q of oldQuizzes) {
    await sb(`/rest/v1/quiz_questions?quiz_id=eq.${q.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    await sb(`/rest/v1/quizzes?id=eq.${q.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  }

  const newQuizRes = await sb(`/rest/v1/quizzes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      module_section_id: evalSectionId,
      title: `Evaluación — ${title}`,
      description: "8 preguntas de comprensión sobre los puntos centrales de la lección.",
      pass_threshold: 70,
      max_attempts: 3,
      shuffle_questions: true,
    }),
  });
  const [{ id: quizId }] = await newQuizRes.json();

  const questionsPayload = quizQuestions.map((q, i) => {
    const { options, correctIndex } = shuffleOptions(q.options, q.correctIndex, q.prompt);
    return {
      quiz_id: quizId,
      kind: "multiple_choice",
      prompt: q.prompt,
      payload: { options, correct_index: correctIndex },
      order_index: i + 1,
    };
  });
  await sb(`/rest/v1/quiz_questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(questionsPayload),
  });
  console.log("   ✅ Quiz creado con 8 preguntas");

  console.log(`========== ✅ Módulo ${leccionNum} cargado ==========\n`);
}
