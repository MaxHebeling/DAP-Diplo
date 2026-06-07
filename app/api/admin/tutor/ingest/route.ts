import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { ingestPdf } from "@/lib/tutor/ingest";

export const runtime = "nodejs";
// Embedding de un PDF de hasta 20pg puede tardar 10-30s en serverless.
// Vercel free permite 60s para Node runtime.
export const maxDuration = 60;

const inputSchema = z.object({
  storagePath: z.string().min(1).max(500),
  sourceTitle: z.string().trim().min(2).max(200),
});

export async function POST(request: Request) {
  const { admin: isAdmin, userId } = await requireAdmin();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input inválido" }, { status: 400 });
  }

  try {
    const result = await ingestPdf({
      storagePath: parsed.data.storagePath,
      sourceTitle: parsed.data.sourceTitle,
      createdBy: userId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ingest] failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
