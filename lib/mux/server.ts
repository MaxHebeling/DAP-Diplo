import Mux from "@mux/mux-node";

let _client: Mux | null = null;

export function muxClient(): Mux {
  if (_client) return _client;
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!tokenId || !tokenSecret) {
    throw new Error("MUX_TOKEN_ID y MUX_TOKEN_SECRET son requeridos.");
  }
  // jwtSigningKey + jwtPrivateKey son opcionales — sólo necesarios para
  // signed playback policy. Aceptamos los nombres del dashboard de Mux
  // (MUX_SIGNING_KEY_ID / MUX_SIGNING_PRIVATE_KEY) como aliases de los
  // defaults del SDK (MUX_SIGNING_KEY / MUX_PRIVATE_KEY).
  const jwtSigningKey =
    process.env.MUX_SIGNING_KEY ?? process.env.MUX_SIGNING_KEY_ID;
  const jwtPrivateKey =
    process.env.MUX_PRIVATE_KEY ?? process.env.MUX_SIGNING_PRIVATE_KEY;
  _client = new Mux({
    tokenId,
    tokenSecret,
    jwtSigningKey,
    jwtPrivateKey,
  });
  return _client;
}

export function muxWebhookSecret(): string {
  const s = process.env.MUX_WEBHOOK_SECRET;
  if (!s) throw new Error("MUX_WEBHOOK_SECRET es requerido.");
  return s;
}
