// Helper para cargar campos _en de un módulo del Bloque 2.
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

export async function loadModuleEn(cfg) {
  const {
    moduleId, titleEs, // titleEs sirve para encontrar el quiz_question por prompt ES, no se modifica
    titleEn, subtitleEn, objectiveEn, mainRevelationEn, impartationPhraseEn,
    bodyIntroEn, bodyTeachingEn, bodyActivationEn, bodyImpartationEn,
    sectionTitleEn, // {intro, teaching, activation, evaluation, impartation}
    quizTitleEn,
    quizQuestionsEn, // [{promptEs, promptEn, optionsEn, correctIndex}]
  } = cfg;

  console.log(`\n========== EN · ${titleEn} ==========`);

  // 1) Update módulo
  console.log("1) Actualizando módulo (campos _en)...");
  await sb(`/rest/v1/modules?id=eq.${moduleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      title_en: titleEn,
      subtitle_en: subtitleEn,
      objective_en: objectiveEn,
      main_revelation_en: mainRevelationEn,
      impartation_phrase_en: impartationPhraseEn,
    }),
  });
  console.log("   ✅");

  // 2) Actualizar secciones
  console.log("2) body_md_en + title_en de las 5 secciones...");
  const bodyEvaluationEn = `## Evaluation · Module comprehension

This evaluation verifies that the teaching has taken root in your understanding. There are **8 questions** on the central points of the lesson.

- **Passing threshold:** 70% (minimum 6 out of 8 correct)
- **Available attempts:** 3
- Questions are shuffled in each attempt

> 📌 *This is not an exam to judge your spiritual life. It is a tool to ensure you understood the doctrinal concepts before advancing to the next module.*

When you are ready, open the quiz from the student panel.`;

  const sections = {
    intro: { body: bodyIntroEn, title: sectionTitleEn?.intro ?? "Introduction" },
    teaching: { body: bodyTeachingEn, title: sectionTitleEn?.teaching ?? "Teaching" },
    activation: { body: bodyActivationEn, title: sectionTitleEn?.activation ?? "Activation" },
    evaluation: { body: bodyEvaluationEn, title: sectionTitleEn?.evaluation ?? "Evaluation" },
    impartation: { body: bodyImpartationEn, title: sectionTitleEn?.impartation ?? "Impartation phrase" },
  };
  for (const [kind, { body, title }] of Object.entries(sections)) {
    await sb(`/rest/v1/module_sections?module_id=eq.${moduleId}&kind=eq.${kind}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ body_md_en: body, title_en: title }),
    });
  }
  console.log("   ✅");

  // 3) Quiz EN (quizzes table has no _en cols — solo se actualizan las preguntas)
  console.log("3) 8 preguntas EN...");
  const evalRes = await sb(`/rest/v1/module_sections?module_id=eq.${moduleId}&kind=eq.evaluation&select=id`);
  const [{ id: evalSectionId }] = await evalRes.json();
  const quizRes = await sb(`/rest/v1/quizzes?module_section_id=eq.${evalSectionId}&select=id`);
  const [{ id: quizId }] = await quizRes.json();

  // Cargar preguntas existentes y matchear por order_index → set prompt_en + payload_en
  const qsRes = await sb(`/rest/v1/quiz_questions?quiz_id=eq.${quizId}&select=id,prompt,payload,order_index`);
  const existingQs = await qsRes.json();

  for (const qEn of quizQuestionsEn) {
    // Encontrar por order_index (que coincide con el orden del array original)
    const existing = existingQs.find((x) => x.order_index === qEn.orderIndex);
    if (!existing) {
      console.warn(`   ⚠ No encontré pregunta con order_index=${qEn.orderIndex}`);
      continue;
    }
    // Aplicar el mismo shuffle que se hizo para ES, usando el prompt ES como salt
    // (para que la posición de la correcta coincida exactamente con el ES)
    const { options, correctIndex } = shuffleOptions(qEn.optionsEn, qEn.correctIndex, qEn.promptEs);

    await sb(`/rest/v1/quiz_questions?id=eq.${existing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({
        prompt_en: qEn.promptEn,
        payload_en: { options, correct_index: correctIndex },
      }),
    });
  }
  console.log(`   ✅ 8 preguntas EN`);

  console.log(`========== ✅ EN ${titleEn} listo ==========\n`);
}
