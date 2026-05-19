
import { Brain, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TutorSidebar } from "@/components/tutor/tutor-sidebar";
import { createClient } from "@/lib/supabase/server";
import { requireActiveSubscription } from "@/lib/subscription/gate";
import { newConversationRedirectAction } from "@/lib/tutor/conversation-actions";

export const metadata = { title: "Tutor IA — DAP" };

export default async function TutorIndexPage() {
  await requireActiveSubscription("/tutor");
  const supabase = await createClient();
  const { data: conversations } = await supabase
    .from("ai_conversations")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);

  // Estado del rate limit hoy
  const { data: rateRow } = await supabase
    .from("ai_rate_limit")
    .select("message_count")
    .eq("day", new Date().toISOString().slice(0, 10))
    .maybeSingle();
  const messagesToday = rateRow?.message_count ?? 0;

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_1fr]">
      <TutorSidebar
        conversations={
          (conversations ?? []) as {
            id: string;
            title: string | null;
            updated_at: string;
          }[]
        }
        activeId={null}
        messagesToday={messagesToday}
      />

      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
        <div className="max-w-xl text-center space-y-6">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-coral/15">
            <Brain
              className="size-7 text-brand-coral"
              strokeWidth={1.7}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
              Tutor del DAP
            </p>
            <h1 className="font-serif text-3xl font-semibold">
              Pregunta lo que necesites
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Respondo solo con base en los materiales apostólicos del DAP.
              Si la respuesta no está en los documentos, te lo diré.
            </p>
          </div>
          <form action={newConversationRedirectAction}>
            <Button type="submit" size="default">
              <Sparkles className="size-4" />
              Nueva conversación
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            O selecciona una conversación previa de la barra lateral.
          </p>
        </div>
      </main>
    </div>
  );
}
