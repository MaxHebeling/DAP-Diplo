import { notFound } from "next/navigation";
import { TutorSidebar } from "@/components/tutor/tutor-sidebar";
import { ChatWindow } from "@/components/tutor/chat-window";
import { createClient } from "@/lib/supabase/server";
import { requireActiveSubscription } from "@/lib/subscription/gate";

type PageProps = { params: Promise<{ id: string }> };

export const metadata = { title: "Tutor IA — DAP" };

type DbMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: unknown;
  created_at: string;
};

export default async function TutorConversationPage({ params }: PageProps) {
  const { id } = await params;
  await requireActiveSubscription(`/tutor/${id}`);

  const supabase = await createClient();
  const { data: conv } = await supabase
    .from("ai_conversations")
    .select("id, title, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!conv) notFound();

  const [{ data: conversations }, { data: dbMessages }, { data: rateRow }] =
    await Promise.all([
      supabase
        .from("ai_conversations")
        .select("id, title, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50),
      supabase
        .from("ai_messages")
        .select("id, role, content, citations, created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true })
        .returns<DbMessage[]>(),
      supabase
        .from("ai_rate_limit")
        .select("message_count")
        .eq("day", new Date().toISOString().slice(0, 10))
        .maybeSingle(),
    ]);

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
        activeId={id}
        messagesToday={messagesToday}
      />

      <ChatWindow
        conversationId={id}
        conversationTitle={conv.title}
        initialMessages={(dbMessages ?? []) as DbMessage[]}
      />
    </div>
  );
}
