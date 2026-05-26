import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Devuelve la conversación más reciente del alumno + sus mensajes para
 * el chat flotante de Esdras. Si el alumno no tiene ninguna conv, crea
 * una nueva vacía. El cliente nunca tiene que pensar en "crear o
 * continuar" — siempre recibe un session ID válido y sus mensajes.
 *
 * Cuando el alumno quiere arrancar una NUEVA conv desde el bubble, el
 * cliente puede pedir POST a este endpoint para forzar creación.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: recent } = await supabase
    .from("ai_conversations")
    .select("id, title")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let conversationId: string | null = recent?.id ?? null;
  let title: string | null = recent?.title ?? null;

  if (!conversationId) {
    const { data: created, error: createErr } = await supabase
      .from("ai_conversations")
      .insert({ user_id: user.id, title: null })
      .select("id, title")
      .single();
    if (createErr || !created) {
      return NextResponse.json(
        { error: createErr?.message ?? "no se pudo crear conversación" },
        { status: 500 },
      );
    }
    conversationId = created.id;
    title = created.title;
  }

  const { data: messages } = await supabase
    .from("ai_messages")
    .select("id, role, content, citations, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(40); // últimos N mensajes — el chat completo está en /tutor/[id]

  return NextResponse.json({
    conversationId,
    title,
    messages: messages ?? [],
  });
}

/**
 * Fuerza creación de una conversación nueva. Útil para el botón
 * "Nueva conversación" del bubble cuando el alumno quiere empezar
 * desde cero sin perder la historia previa.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ user_id: user.id, title: null })
    .select("id, title")
    .single();
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "no se pudo crear conversación" },
      { status: 500 },
    );
  }
  return NextResponse.json({
    conversationId: data.id,
    title: data.title,
    messages: [],
  });
}
