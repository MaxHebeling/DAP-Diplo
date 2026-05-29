import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  LiveSessionForm,
  type LiveSessionFormSession,
} from "@/components/admin/live-session-form";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { LiveKind } from "@/lib/live-sessions/schemas";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata() {
  const t = await getTranslations("Admin");
  return { title: t("liveEdit.metaTitle") };
}

export default async function EditarSesionPage({ params }: PageProps) {
  const { id } = await params;
  const t = await getTranslations("Admin");
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("live_sessions")
    .select(
      "id, kind, title, description, scheduled_at, duration_minutes, meeting_url, host_name, phase_id, recording_url, recording_mux_playback_id",
    )
    .eq("id", id)
    .maybeSingle();
  if (!session) notFound();

  const { data: phases } = await supabase
    .from("phases")
    .select("id, order_index, title")
    .order("order_index", { ascending: true });

  const formSession: LiveSessionFormSession = {
    id: session.id,
    kind: session.kind as LiveKind,
    title: session.title,
    description: session.description,
    scheduled_at: session.scheduled_at,
    duration_minutes: session.duration_minutes,
    meeting_url: session.meeting_url,
    host_name: session.host_name,
    phase_id: session.phase_id,
    recording_url: session.recording_url,
    recording_mux_playback_id: session.recording_mux_playback_id,
  };

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin/en-vivo"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-coral"
        >
          <ArrowLeft className="size-4" />
          {t("liveEdit.backToSessions")}
        </Link>

        <header className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
            {t("liveEdit.eyebrow")}
          </p>
          <h1 className="font-grotesk text-3xl font-semibold">{t("liveEdit.title")}</h1>
        </header>

        <LiveSessionForm
          phases={
            (phases ?? []) as {
              id: string;
              order_index: number;
              title: string;
            }[]
          }
          session={formSession}
        />
      </div>
    </main>
  );
}
