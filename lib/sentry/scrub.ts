import type { ErrorEvent } from "@sentry/nextjs";

/**
 * PII scrubbing antes de enviar a Sentry. DAP maneja datos sensibles de
 * pastores (email, full_name, dirección, datos de admisión). Filtramos
 * defensivamente para no exponerlos en el dashboard de Sentry.
 *
 * Estrategia:
 * 1. Borrar user.email/name/ip (Sentry los pone por default).
 * 2. Limpiar fields con keys sospechosas en request.data / extra.
 * 3. Nunca exponer auth tokens (lo cubre Sentry default pero refuerzo).
 *
 * Esto NO bloquea capturar el error — solo le quita lo identificable.
 * El bug se sigue agrupando por stack trace.
 */

const PII_KEYS = [
  "email",
  "full_name",
  "fullname",
  "fullName",
  "name",
  "phone",
  "address",
  "city",
  "country",
  "church_name",
  "consent_letter_url",
  "matricula",
  // Auth-related — Sentry default ya los filtra pero refuerzo
  "password",
  "token",
  "auth",
  "authorization",
  "cookie",
  "secret",
  "api_key",
  "service_role",
];

function isPiiKey(key: string): boolean {
  const lower = key.toLowerCase();
  return PII_KEYS.some((k) => lower.includes(k));
}

function scrubObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(scrubObject);

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (isPiiKey(k)) {
      out[k] = "[scrubbed]";
    } else {
      out[k] = scrubObject(v);
    }
  }
  return out;
}

export function dapBeforeSend(event: ErrorEvent): ErrorEvent | null {
  // 1. Usuario: dejamos solo el id (uuid), borramos email/ip/username.
  if (event.user) {
    event.user = { id: event.user.id };
  }

  // 2. Request data: scrub recursivo de body/headers/query.
  if (event.request) {
    if (event.request.data) {
      event.request.data = scrubObject(event.request.data) as
        | string
        | Record<string, unknown>;
    }
    if (event.request.headers) {
      event.request.headers = scrubObject(event.request.headers) as Record<
        string,
        string
      >;
    }
    if (event.request.query_string) {
      // Las URLs con query strings pueden contener emails (ej redirectTo).
      event.request.query_string =
        typeof event.request.query_string === "string"
          ? event.request.query_string.replace(
              /[\w.+-]+@[\w-]+\.[\w.-]+/g,
              "[email-scrubbed]",
            )
          : event.request.query_string;
    }
  }

  // 3. Extra context añadido manualmente (Sentry.setContext / setExtra).
  if (event.extra) {
    event.extra = scrubObject(event.extra) as Record<string, unknown>;
  }

  // 4. Breadcrumbs (clicks, fetches): scrub data field.
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((bc) => ({
      ...bc,
      data: bc.data
        ? (scrubObject(bc.data) as Record<string, unknown>)
        : bc.data,
    }));
  }

  return event;
}
