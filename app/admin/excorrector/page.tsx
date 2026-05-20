import { Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { EXCORRECTOR_VOICE_MANUAL } from "@/lib/excorrector/voice-manual";
import { VoiceManualForm } from "./voice-manual-form";

export const metadata = { title: "Excorrector — Admin DAP" };

type Setting = { value: string; updated_at: string };

export default async function AdminExcorrectorPage() {
  const supabase = await createClient();

  const { data: setting } = await supabase
    .from("admin_settings")
    .select("value, updated_at")
    .eq("key", "excorrector_voice_manual")
    .maybeSingle<Setting>();

  // Si no hay row, usar el hardcoded como punto de partida (no rompe)
  const initial = setting?.value ?? EXCORRECTOR_VOICE_MANUAL;
  const lastEditedAt = setting?.updated_at ?? null;

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-coral/15 text-brand-coral">
            <Sparkles className="size-5" />
          </div>
          <div>
            <p className="font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              Excorrector IA · Voice manual
            </p>
            <h1 className="mt-1 font-grotesk text-3xl font-bold tracking-tight">
              Voz del Dr. Max
            </h1>
            <p className="mt-2 font-inter text-sm text-text-secondary">
              Este texto es el system prompt que recibe Claude cada vez que
              corrige una tarea. Editalo para refinar el tono, agregar
              ejemplos de cómo respondés, o ajustar la rúbrica de score.
            </p>
          </div>
        </header>

        <VoiceManualForm initial={initial} lastEditedAt={lastEditedAt} />

        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-text-tertiary">
          <p className="font-medium text-text-secondary">Notas</p>
          <ul className="mt-2 space-y-1">
            <li>· Los cambios afectan inmediatamente la próxima corrección que dispare el cron.</li>
            <li>· Si dejás el campo vacío, vuelve al voice manual hardcoded del repo.</li>
            <li>· El texto se manda como system prompt a Claude — incluí ejemplos, reglas duras, y la rúbrica de score.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
