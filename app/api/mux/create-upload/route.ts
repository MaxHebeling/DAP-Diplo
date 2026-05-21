import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { muxClient } from "@/lib/mux/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
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
    return NextResponse.json(
      { error: "Solo admin puede subir el audio del módulo." },
      { status: 403 },
    );
  }

  let body: { sectionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const sectionId =
    typeof body.sectionId === "string" ? body.sectionId : "";
  if (!sectionId) {
    return NextResponse.json(
      { error: "Falta sectionId" },
      { status: 400 },
    );
  }

  const { data: section } = await supabase
    .from("module_sections")
    .select("id, kind")
    .eq("id", sectionId)
    .maybeSingle();
  if (!section) {
    return NextResponse.json(
      { error: "Sección no encontrada" },
      { status: 404 },
    );
  }
  if (section.kind !== "teaching") {
    return NextResponse.json(
      { error: "Solo la sección de enseñanza acepta audio." },
      { status: 400 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_APP_URL no configurado" },
      { status: 500 },
    );
  }
  const requestOrigin = req.headers.get("origin");
  const allowedOrigins = new Set<string>([appUrl]);
  if (process.env.VERCEL_URL) {
    allowedOrigins.add(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.NODE_ENV !== "production") {
    allowedOrigins.add("http://localhost:3000");
  }
  const corsOrigin =
    requestOrigin && allowedOrigins.has(requestOrigin) ? requestOrigin : appUrl;

  const upload = await muxClient().video.uploads.create({
    cors_origin: corsOrigin,
    new_asset_settings: {
      playback_policies: ["signed"],
      video_quality: "basic",
      passthrough: section.id,
    },
  });

  // Guardamos el upload_id en la sección para que el webhook lo encuentre.
  const { error: updateError } = await supabase
    .from("module_sections")
    .update({ mux_upload_id: upload.id })
    .eq("id", section.id);
  if (updateError) {
    return NextResponse.json(
      { error: `No se pudo asociar upload con la sección: ${updateError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    uploadUrl: upload.url,
    uploadId: upload.id,
  });
}
