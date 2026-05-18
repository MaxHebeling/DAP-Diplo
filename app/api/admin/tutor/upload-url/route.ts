import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const inputSchema = z.object({
  path: z
    .string()
    .min(3)
    .max(500)
    .regex(/^[\w.\-]+$/, "Path inválido (sin slashes ni espacios)"),
});

/**
 * Genera un signed upload URL para que el cliente suba el PDF directo a
 * Storage sin pasar los bytes por nuestro server. Bucket 'ai-documents'
 * es privado y admin-only.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
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
    return NextResponse.json({ error: "Path inválido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("ai-documents")
    .createSignedUploadUrl(parsed.data.path);
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "No se pudo generar upload URL" },
      { status: 500 },
    );
  }
  return NextResponse.json({ token: data.token, path: data.path });
}
