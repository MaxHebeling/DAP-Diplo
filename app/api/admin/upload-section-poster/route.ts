/**
 * POST /api/admin/upload-section-poster
 * Body: FormData con `file` (jpeg/png/webp ≤5MB) + `sectionId`
 * Returns: { ok: true, url } — URL pública del thumbnail subido
 * El frontend pega esa URL en el campo `poster_url` del form de edición.
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "section-posters";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: NextRequest) {
  const { admin: isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Solo admin" }, { status: 403 });

  const fd = await req.formData();
  const file = fd.get("file");
  const sectionId = fd.get("sectionId");

  if (!(file instanceof File)) return NextResponse.json({ error: "file requerido" }, { status: 400 });
  if (typeof sectionId !== "string" || !sectionId) return NextResponse.json({ error: "sectionId requerido" }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "Archivo vacío" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: `Máx ${MAX_BYTES / 1024 / 1024} MB` }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Solo JPG / PNG / WEBP" }, { status: 400 });

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${sectionId}/${Date.now()}.${ext}`;
  const buf = new Uint8Array(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type,
    upsert: false,
    cacheControl: "31536000",
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: pub.publicUrl });
}
