// Sube los 16 PDFs en inglés del Bloque 2 a Storage y crea module_resources con locale='en'
import { readFileSync } from "node:fs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = "/Users/maxhebeling/Library/CloudStorage/Dropbox/DAP Diplomado/EN/Blocks/2.- Forja";

async function sb(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...opts,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, ...opts.headers },
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${await res.text()}`);
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

// (moduleId, lessonNum, slug, title-EN)
const MODULES = [
  ["9ba983aa-2525-43b1-9e1a-81c4c5ca4718", 1, "the-spirit-of-sonship", "The Spirit of Sonship"],
  ["5e568bdd-56f9-4f22-a78c-b606fe43fbfe", 2, "ministerial-identity", "Ministerial Identity"],
  ["87ac4516-93b0-4f95-885f-4ca62705c88e", 3, "emotional-healing", "Emotional Healing"],
  ["660d3df9-310f-4b29-89b8-558dd0f9ca5e", 4, "character-and-integrity", "Character and Integrity"],
  ["9444e542-998c-45d9-ab9d-5d34c4a3ce21", 5, "kingdom-mindset", "Kingdom Mindset"],
  ["9171c2d8-c6dc-4756-afaf-c6437a14cf8e", 6, "formative-processes", "Formative Processes"],
  ["2511fa1f-4ef9-4824-8563-be37c04c2a26", 7, "personal-prayer-life", "Personal Prayer Life"],
  ["15198ee1-2bf8-4bf0-8bd6-c8dbdb6a8984", 8, "community-and-accountability", "Community and Accountability"],
];

const PDF_NAMES = {
  1: ["Block-2-Lesson-01-The-Spirit-of-Sonship.pdf", "Supplement-Block-2-Lesson-01-The-Spirit-of-Sonship.pdf"],
  2: ["Block-2-Lesson-02-Ministerial-Identity.pdf", "Supplement-Block-2-Lesson-02-Ministerial-Identity.pdf"],
  3: ["Block-2-Lesson-03-Emotional-Healing.pdf", "Supplement-Block-2-Lesson-03-Emotional-Healing.pdf"],
  4: ["Block-2-Lesson-04-Character-and-Integrity.pdf", "Supplement-Block-2-Lesson-04-Character-and-Integrity.pdf"],
  5: ["Block-2-Lesson-05-Kingdom-Mindset.pdf", "Supplement-Block-2-Lesson-05-Kingdom-Mindset.pdf"],
  6: ["Block-2-Lesson-06-Formative-Processes.pdf", "Supplement-Block-2-Lesson-06-Formative-Processes.pdf"],
  7: ["Block-2-Lesson-07-Personal-Prayer-Life.pdf", "Supplement-Block-2-Lesson-07-Personal-Prayer-Life.pdf"],
  8: ["Block-2-Lesson-08-Community-and-Accountability.pdf", "Supplement-Block-2-Lesson-08-Community-and-Accountability.pdf"],
};

for (const [moduleId, leccionNum, slug, title] of MODULES) {
  console.log(`\nMódulo ${leccionNum} · ${title}`);
  const [lessonName, supplementName] = PDF_NAMES[leccionNum];

  const lessonPath = `${moduleId}/en/block-2-lesson-${String(leccionNum).padStart(2, "0")}-${slug}.pdf`;
  const suppPath = `${moduleId}/en/block-2-lesson-${String(leccionNum).padStart(2, "0")}-${slug}-supplement.pdf`;

  const lessonUrl = await uploadPdf(`${BASE}/${lessonName}`, lessonPath);
  const suppUrl = await uploadPdf(`${BASE}/suplements/${supplementName}`, suppPath);
  console.log("   ✅ 2 PDFs subidos");

  // Reemplazar resources EN
  await sb(`/rest/v1/module_resources?module_id=eq.${moduleId}&locale=eq.en`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  await sb(`/rest/v1/module_resources`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify([
      { module_id: moduleId, title: `${title} — Complete lesson`, kind: "pdf", url: lessonUrl, order_index: 0, locale: "en" },
      { module_id: moduleId, title: "Supplementary material — Tasks, evaluation and impartation", kind: "pdf", url: suppUrl, order_index: 1, locale: "en" },
    ]),
  });
  console.log("   ✅ Resources EN insertados");
}

console.log("\n✅ Todos los PDFs EN subidos.");
