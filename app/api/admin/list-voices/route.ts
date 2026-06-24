import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "missing_api_key" }, { status: 500 });

  const r = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": apiKey },
  });
  if (!r.ok) {
    console.error(`[list-voices] elevenlabs ${r.status}:`, (await r.text()).slice(0, 500));
    return NextResponse.json({ error: `elevenlabs_${r.status}` }, { status: 502 });
  }
  const data = (await r.json()) as { voices?: Array<{ voice_id: string; name: string; category?: string; labels?: Record<string, string> }> };
  const voices = (data.voices ?? []).map((v) => ({
    id: v.voice_id,
    name: v.name,
    category: v.category,
    labels: v.labels,
  }));
  return NextResponse.json({ count: voices.length, voices });
}
