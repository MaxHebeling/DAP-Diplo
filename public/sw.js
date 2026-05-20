/* DAP service worker — minimal, SOLO push notifications.
 *
 * NO intercepta fetch (no cache de HTML, no offline). Eso evita:
 *  - Servir HTML stale con contexto auth equivocado al volver de background
 *  - "This page couldn't load" en Safari iOS
 *  - Conflictos entre SW viejos y nuevos cacheando endpoints distintos
 *
 * Si más adelante queremos offline-first, retomamos con next-pwa o
 * Workbox que tienen los edge cases resueltos.
 */

const VERSION = "dap-push-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Limpiar TODO cache previo de versiones que sí cacheaban
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

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
      await self.clients.openWindow(targetUrl);
    })(),
  );
});

// Marker variable para diagnosticar versión desde DevTools
self.DAP_SW_VERSION = VERSION;
