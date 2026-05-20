/* DAP service worker — minimal, sin Workbox.
 *
 * Estrategias:
 *  - Network-first para HTML (siempre data fresca; fallback al cache si offline)
 *  - Cache-first para assets estáticos versionados (/_next/static/*, fonts, imágenes)
 *  - Stale-while-revalidate para iconos y manifest
 *  - Sin caching de POST/PUT/DELETE ni /api/*
 *  - Sin caching de respuestas con set-cookie (Supabase auth)
 *
 * Push:
 *  - Recibe push events y muestra notificación
 *  - Click en notificación → abre/foco la URL especificada
 *
 * Update flow:
 *  - install: pre-cache de assets críticos
 *  - activate: borra caches viejos
 *  - skipWaiting + clients.claim → SW nuevo toma control inmediato
 */

const VERSION = "dap-v1";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const PRECACHE_URLS = [
  "/",
  "/dap-logo-white.png",
  "/dap-logo.png",
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // No cachear API, webhooks, supabase auth, ni rutas dinámicas con cookies.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.includes("/admin/") ||
    url.hostname.endsWith(".supabase.co")
  ) {
    return; // dejar pasar al network sin tocar
  }

  // Assets estáticos del build (immutables, hash en filename) → cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/blocks/") ||
    url.pathname.startsWith("/admission-assets/")
  ) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // HTML y todo lo demás → network-first con fallback a cache
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Resto (manifest, imágenes simples) → stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req));
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(req, res.clone()).catch(() => undefined);
    }
    return res;
  } catch {
    return new Response("offline", { status: 503 });
  }
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res.ok && !res.headers.get("set-cookie")) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(req, res.clone()).catch(() => undefined);
    }
    return res;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    // Fallback final: si pidió HTML y nada en cache, una página simple
    if (req.mode === "navigate") {
      return new Response(
        `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>DAP — Sin conexión</title><style>body{margin:0;font-family:system-ui;background:#07142B;color:#F8FAFC;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:2rem}.card{max-width:32rem}h1{margin:0 0 .5rem;font-size:1.5rem}p{color:#94A3B8;line-height:1.6;margin:.5rem 0}</style></head><body><div class="card"><h1>Sin conexión</h1><p>No tenemos red ahora. Tu progreso queda guardado localmente.</p><p>Probá recargar cuando vuelva la señal.</p></div></body></html>`,
        { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
      );
    }
    return new Response("offline", { status: 503 });
  }
}

async function staleWhileRevalidate(req) {
  const cached = await caches.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res.ok) {
        const cache = caches.open(RUNTIME_CACHE);
        cache.then((c) => c.put(req, res.clone()).catch(() => undefined));
      }
      return res;
    })
    .catch(() => cached || new Response("offline", { status: 503 }));
  return cached || fetchPromise;
}

// === Push notifications ===
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "DAP", body: event.data.text() };
  }

  const title = payload.title || "DAP";
  const options = {
    body: payload.body || "Tenés algo nuevo en el DAP.",
    icon: payload.icon || "/web-app-manifest-192x192.png",
    badge: "/web-app-manifest-192x192.png",
    tag: payload.tag || "dap-default",
    data: { url: payload.url || "/dashboard" },
    vibrate: [60, 30, 60],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Si hay una ventana ya abierta del DAP, foco + navega
      for (const client of clientsList) {
        if (client.url.startsWith(self.location.origin)) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(targetUrl);
            } catch {
              // ignored
            }
          }
          return;
        }
      }
      // Si no hay ventana abierta, abrir una nueva
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
