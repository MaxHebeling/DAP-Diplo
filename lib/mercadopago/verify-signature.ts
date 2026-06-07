import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Verifica el header `x-signature` de Mercado Pago para webhooks IPN.
 *
 * MP firma cada notification con HMAC-SHA256 sobre un manifest:
 *   "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 *
 * El header viene como `ts=<unix_ms>,v1=<hex_sha256>`.
 * El secret es el "Secret de notificación" del panel MP > Webhooks.
 *
 * Doc: https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks
 *
 * Política de bypass: si `MERCADOPAGO_WEBHOOK_SECRET` no está configurada,
 * devolvemos `ok: true` con `bypassed: true` y un warn en logs. Esto evita
 * romper deploys donde todavía no se configuró el secret (anti-spoof por
 * re-GET ya existe). Una vez configurado, bypass deja de aplicar.
 */
export type SignatureResult =
  | { ok: true; verified: true }
  | { ok: true; verified: false; bypassed: true; reason: string }
  | { ok: false; reason: string };

export function verifyMercadoPagoSignature(
  request: NextRequest,
  dataId: string | null,
): SignatureResult {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    console.warn(
      "[mp.webhook] MERCADOPAGO_WEBHOOK_SECRET no configurado — bypass de HMAC. " +
        "Configurá la env var con el secret del panel MP > Webhooks para activar.",
    );
    return { ok: true, verified: false, bypassed: true, reason: "no-secret" };
  }

  const sigHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!sigHeader || !requestId) {
    return {
      ok: false,
      reason: `missing headers (x-signature=${!!sigHeader}, x-request-id=${!!requestId})`,
    };
  }
  if (!dataId) {
    return { ok: false, reason: "missing data.id para reconstruir el manifest" };
  }

  // Parse "ts=...,v1=..."
  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    }),
  ) as { ts?: string; v1?: string };

  if (!parts.ts || !parts.v1) {
    return { ok: false, reason: `formato x-signature inválido: ${sigHeader}` };
  }

  // Manifest exacto. El orden (id, request-id, ts) y los separadores ";"
  // los define MP — cambiar nada acá rompe la verificación.
  const manifest = `id:${dataId};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  // timingSafeEqual requiere longitudes iguales; si difieren, ya es mismatch.
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(parts.v1, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "HMAC mismatch" };
  }

  return { ok: true, verified: true };
}
