import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { generatePastorBrief } from "@/lib/brief/generate-pastor-brief";

// Necesitamos runtime nodejs para fs (cargar PNGs) y @react-pdf/renderer.
export const runtime = "nodejs";

/**
 * Endpoint admin-only que genera el brief PDF del DAP y lo sirve para
 * descargar. Lo usa la página /admin/brief-pastores con un <a download>
 * que apunta acá.
 *
 * Auth: doble check — el layout de /admin ya guarda por rol, pero acá
 * además verificamos antes de gastar tiempo en renderizar el PDF.
 */
export async function GET() {
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
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const buffer = await generatePastorBrief();
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="brief-dap-pastores-2026.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error generando PDF";
    console.error("[brief-pastores/download] FAILED:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
