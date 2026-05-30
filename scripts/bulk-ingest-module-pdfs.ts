// Uso: pnpm exec tsx scripts/bulk-ingest-module-pdfs.ts [--dry-run]
//
// Recorre todos los PDFs del bucket `module-pdfs` y los ingesta al
// corpus del Tutor IA (ai_document_sources + ai_documents). Skip si
// ya fue ingestado (chequea por storage_path en ai_document_sources).
//
// El título de la fuente usa el nombre del módulo + locale del PDF
// si están en module_resources, sino el filename limpio.
//
// Requiere .env.local con SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y
// VOYAGE_API_KEY. Corré primero `vercel env pull .env.local`.
//
// Idempotente: corré múltiples veces — solo procesa lo nuevo.

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { ingestPdf } from "../lib/tutor/ingest";

const DRY_RUN = process.argv.includes("--dry-run");
const BUCKET = "module-pdfs";

function env(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Falta env var: ${name}`);
    process.exit(1);
  }
  return v;
}

type ModuleResource = {
  url: string;
  title: string;
  locale: "es" | "en" | null;
  module: { title: string; title_en: string | null; course_week: number | null } | null;
};

async function main() {
  const supabase = createClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("SUPABASE_SERVICE_ROLE_KEY"),
  );

  // 1) Resolver admin user_id (cualquier admin sirve para created_by).
  const { data: admin } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  if (!admin) {
    console.error("No hay ningún profile con role='admin'. Aborto.");
    process.exit(1);
  }
  console.log(`▸ created_by = ${admin.full_name} (${admin.id})`);

  // 2) Listar todos los PDFs del bucket (recursivo: el bucket suele
  //    tener subcarpetas por módulo).
  const allPaths = await listBucketRecursive(supabase, BUCKET, "");
  const pdfPaths = allPaths.filter((p) => p.toLowerCase().endsWith(".pdf"));
  console.log(`▸ ${pdfPaths.length} PDFs en bucket ${BUCKET}`);

  // 3) Lista de paths ya ingestados.
  const { data: existing } = await supabase
    .from("ai_document_sources")
    .select("storage_path")
    .not("storage_path", "is", null);
  const ingested = new Set((existing ?? []).map((r) => r.storage_path));
  console.log(`▸ ${ingested.size} ya ingestados (skip)`);

  const pending = pdfPaths.filter((p) => !ingested.has(p));
  console.log(`▸ ${pending.length} pendientes`);
  if (pending.length === 0) return;

  // 4) Trae los module_resources de esos paths para construir títulos
  //    descriptivos. La URL en module_resources es la signed URL pública
  //    (forma: /storage/v1/object/public/module-pdfs/<path>). El path
  //    está al final.
  const { data: resources } = await supabase
    .from("module_resources")
    .select(
      "url, title, locale, module:modules(title, title_en, course_week)",
    )
    .eq("kind", "pdf")
    .returns<ModuleResource[]>();
  const resourceByPath = new Map<string, ModuleResource>();
  for (const r of resources ?? []) {
    const m = r.url.match(/\/object\/public\/module-pdfs\/(.+)$/);
    if (m) resourceByPath.set(m[1], r);
  }

  // 5) Ingest secuencial (Voyage rate-limit-safe).
  let ok = 0;
  let fail = 0;
  for (const [i, path] of pending.entries()) {
    const r = resourceByPath.get(path);
    const sourceTitle = r
      ? buildTitle(r)
      : path.split("/").pop()?.replace(/\.pdf$/i, "") ?? path;

    console.log(
      `[${i + 1}/${pending.length}] ${DRY_RUN ? "[DRY] " : ""}${sourceTitle}`,
    );
    console.log(`    path=${path}`);

    if (DRY_RUN) continue;
    try {
      const res = await ingestPdf({
        storagePath: path,
        sourceTitle,
        createdBy: admin.id,
        bucket: BUCKET,
      });
      console.log(
        `    OK chunks=${res.chunks_count} tokens=${res.tokens_used} chars=${res.total_chars}`,
      );
      ok++;
    } catch (err) {
      fail++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`    FAIL ${msg}`);
    }
  }
  console.log(`\n▸ done: ok=${ok} fail=${fail} (de ${pending.length})`);
}

function buildTitle(r: ModuleResource): string {
  const modTitle = r.module?.title ?? "Módulo";
  const week = r.module?.course_week ? `Semana ${r.module.course_week} — ` : "";
  const lang = r.locale === "en" ? " [EN]" : r.locale === "es" ? " [ES]" : "";
  return `${week}${modTitle}${lang}`;
}

async function listBucketRecursive(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const out: string[] = [];
  const { data: items, error } = await supabase.storage
    .from(bucket)
    .list(prefix, { limit: 1000 });
  if (error) {
    console.error(`list ${prefix} falló: ${error.message}`);
    return out;
  }
  for (const item of items ?? []) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
    // Folders en supabase storage no traen id; archivos sí.
    if (item.id) {
      out.push(fullPath);
    } else {
      const sub = await listBucketRecursive(supabase, bucket, fullPath);
      out.push(...sub);
    }
  }
  return out;
}

void main();
