import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  comment: z.string().max(2000).nullable().optional(),
  color: z.enum(["yellow", "red", "blue", "green"]).optional(),
});

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "No autenticado" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();
  if (profile?.role !== "admin") {
    return { ok: false as const, status: 403, error: "Solo admin" };
  }
  return { ok: true as const, userId: user.id };
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; annId: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id, annId } = await ctx.params;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.message },
      { status: 400 },
    );
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "nada para actualizar" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("submission_annotations")
    .update(parsed.data)
    .eq("id", annId)
    .eq("submission_id", id) // defensa: no permite mover entre submissions
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ annotation: data });
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string; annId: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id, annId } = await ctx.params;
  const admin = createAdminClient();
  const { error } = await admin
    .from("submission_annotations")
    .delete()
    .eq("id", annId)
    .eq("submission_id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
