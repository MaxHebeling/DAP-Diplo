import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Permite al alumno solicitar 1 extensión de 60 días para la fase del
 * mes actual cuando su suscripción está pausada. La RPC controla:
 *   - Solo si la sub está pausada.
 *   - Solo si NO ha pedido extensión antes para esa fase.
 *
 * Devuelve { granted: boolean, reason: string, days_added?: number }.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { granted: false, reason: "unauthenticated" },
      { status: 401 },
    );
  }

  const { data, error } = await supabase.rpc("request_pause_extension", {
    p_user_id: user.id,
  });
  if (error) {
    return NextResponse.json(
      { granted: false, reason: "rpc_error", error: error.message },
      { status: 500 },
    );
  }

  // La RPC ya devuelve { granted, reason, days_added? } como jsonb
  return NextResponse.json(data ?? { granted: false, reason: "unknown" });
}
