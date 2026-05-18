import Mux from "@mux/mux-node";

let _client: Mux | null = null;

export function muxClient(): Mux {
  if (_client) return _client;
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!tokenId || !tokenSecret) {
    throw new Error("MUX_TOKEN_ID y MUX_TOKEN_SECRET son requeridos.");
  }
  _client = new Mux({ tokenId, tokenSecret });
  return _client;
}

export function muxWebhookSecret(): string {
  const s = process.env.MUX_WEBHOOK_SECRET;
  if (!s) throw new Error("MUX_WEBHOOK_SECRET es requerido.");
  return s;
}
