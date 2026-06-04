import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const baseSchema = z.object({
  kind: z.enum(["highlight", "strike", "comment", "box"]),
  color: z.enum(["yellow", "red", "blue", "green"]).default("yellow"),
  comment: z.string().max(2000).nullable().optional(),
});

const textSchema = baseSchema.extend({
  target: z.literal("text"),
  text_start: z.number().int().min(0),
  text_end: z.number().int().min(1),
});

const attachmentSchema = baseSchema.extend({
  target: z.literal("attachment"),
  rect_x: z.number().min(0).max(1),
  rect_y: z.number().min(0).max(1),
  rect_w: z.number().min(0).max(1),
  rect_h: z.number().min(0).max(1),
});

const schema = z.discriminatedUnion("target", [textSchema, attachmentSchema]);

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

// GET — lista anotaciones de la submission
export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await ctx.params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("submission_annotations")
    .select("*")
    .eq("submission_id", id)
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ annotations: data ?? [] });
}

// POST — crea una anotación
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await ctx.params;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.message },
      { status: 400 },
    );
  }

  // Validación cross-target: rangos coherentes
  if (parsed.data.target === "text" && parsed.data.text_end <= parsed.data.text_start) {
    return NextResponse.json(
      { error: "text_end debe ser mayor que text_start" },
      { status: 400 },
    );
  }
  if (
    parsed.data.target === "attachment" &&
    (parsed.data.rect_x + parsed.data.rect_w > 1.001 ||
      parsed.data.rect_y + parsed.data.rect_h > 1.001)
  ) {
    return NextResponse.json(
      { error: "rect fuera de [0,1]" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Defensa: existe la submission
  const { data: sub } = await admin
    .from("assignment_submissions")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!sub) {
    return NextResponse.json({ error: "submission no existe" }, { status: 404 });
  }

  const insertPayload: Record<string, unknown> =
    parsed.data.target === "text"
      ? {
          submission_id: id,
          target: "text",
          kind: parsed.data.kind,
          color: parsed.data.color,
          comment: parsed.data.comment ?? null,
          text_start: parsed.data.text_start,
          text_end: parsed.data.text_end,
          created_by: auth.userId,
        }
      : {
          submission_id: id,
          target: "attachment",
          kind: parsed.data.kind,
          color: parsed.data.color,
          comment: parsed.data.comment ?? null,
          rect_x: parsed.data.rect_x,
          rect_y: parsed.data.rect_y,
          rect_w: parsed.data.rect_w,
          rect_h: parsed.data.rect_h,
          created_by: auth.userId,
        };

  const { data, error } = await admin
    .from("submission_annotations")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ annotation: data }, { status: 201 });
}
