/**
 * Wrapper para llamar al servicio Polyglot AI desde DAP-Diplo.
 * Polyglot recibe VTT (transcripción ya hecha por Mux Smart Captions) y
 * devuelve traducciones en N idiomas.
 */

export type PolyglotTranslation = {
  target_language: string;
  vtt_url: string;
  srt_url: string;
  raw_text: string;
  model: string;
  cost_usd: number;
};

export function polyglotConfig() {
  const url = process.env.POLYGLOT_API_URL;
  const key = process.env.POLYGLOT_API_KEY;
  if (!url || !key) {
    throw new Error("Missing POLYGLOT_API_URL or POLYGLOT_API_KEY");
  }
  return { url, key };
}

/** Encola un job de traducción. Devuelve jobId; el resultado llega vía webhook. */
export async function enqueueTranslation(opts: {
  sourceCaptionsVtt: string;
  sourceLanguage: string;
  targetLanguages: string[];
  domainHint?: string;
  externalRef: string; // section.id
  webhookUrl: string;
}): Promise<{ jobId: string }> {
  const { url, key } = polyglotConfig();
  const res = await fetch(`${url}/api/process-video`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(opts),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Polyglot enqueue failed (${res.status}): ${err}`);
  }
  const data = (await res.json()) as { jobId: string };
  return { jobId: data.jobId };
}

/** Fetch full job details (used inside captions-ready webhook to get VTT URLs). */
export async function getJob(jobId: string): Promise<{
  job: { status: string; error_message: string | null };
  translations: PolyglotTranslation[];
}> {
  const { url, key } = polyglotConfig();
  const res = await fetch(`${url}/api/jobs/${jobId}`, {
    headers: { authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    throw new Error(`Polyglot getJob failed (${res.status})`);
  }
  return res.json();
}
