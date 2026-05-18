import type { LiveKind } from "@/lib/live-sessions/schemas";

export type StudentSession = {
  id: string;
  kind: LiveKind;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string;
  host_name: string | null;
  recording_url: string | null;
  recording_mux_playback_id: string | null;
  phase: { order_index: number; title: string } | null;
};
