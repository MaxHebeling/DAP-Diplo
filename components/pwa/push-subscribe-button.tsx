"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  subscribePushAction,
  unsubscribePushAction,
} from "@/lib/push/actions";

/**
 * Pide permiso al usuario para Web Push + suscribe al endpoint del browser.
 * El SEND server-side requiere `web-push` lib + VAPID_PUBLIC_KEY /
 * VAPID_PRIVATE_KEY en env. Si la public key falta, el botón muestra
 * "Notificaciones no configuradas" y no permite suscribirse.
 */
export function PushSubscribeButton() {
  const t = useTranslations("Pwa");
  // Feature detection y permission son síncronos desde el browser; los
  // resolvemos con useState lazy init (corre 1 vez en mount client-only).
  // `null` durante SSR/primer paint; cambia al primer render del cliente.
  const [supported] = useState<boolean | null>(() => {
    if (typeof window === "undefined") return null;
    return (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  });
  const [, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "default";
    }
    return Notification.permission;
  });
  const [subscribed, setSubscribed] = useState(false);
  const [pending, startTransition] = useTransition();

  // La suscripción del SW es async — sin alternativa al effect.
  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (!cancelled) setSubscribed(!!sub);
    });
    return () => {
      cancelled = true;
    };
  }, [supported]);

  if (supported === null) return null;
  if (supported === false) {
    return (
      <p className="font-inter text-xs text-text-tertiary">
        {t("push.notSupported")}
      </p>
    );
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    return (
      <p className="font-inter text-xs text-text-tertiary">
        {t("push.notConfigured")}
      </p>
    );
  }

  function handleSubscribe() {
    startTransition(async () => {
      try {
        if (Notification.permission === "denied") {
          toast.error(t("push.permissionBlocked"));
          return;
        }
        const perm =
          Notification.permission === "granted"
            ? "granted"
            : await Notification.requestPermission();
        setPermission(perm);
        if (perm !== "granted") {
          toast.warning(t("push.permissionNeeded"));
          return;
        }

        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey!) as BufferSource,
        });

        const json = sub.toJSON() as {
          endpoint?: string;
          keys?: { p256dh?: string; auth?: string };
        };
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
          throw new Error("Subscription incompleta del browser");
        }

        const res = await subscribePushAction({
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          userAgent: navigator.userAgent,
        });
        if (!res.ok) throw new Error(res.error);

        setSubscribed(true);
        toast.success(t("push.subscribeSuccess"));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(t("push.subscribeError", { message: msg }));
      }
    });
  }

  function handleUnsubscribe() {
    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await unsubscribePushAction(sub.endpoint);
        }
        setSubscribed(false);
        toast.success(t("push.unsubscribeSuccess"));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(t("push.unsubscribeError", { message: msg }));
      }
    });
  }

  if (subscribed) {
    return (
      <Button
        variant="outline"
        onClick={handleUnsubscribe}
        disabled={pending}
        size="sm"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <BellOff className="size-4" />
        )}
        {t("push.deactivateButton")}
      </Button>
    );
  }

  return (
    <Button onClick={handleSubscribe} disabled={pending} size="sm">
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Bell className="size-4" />
      )}
      {t("push.activateButton")}
    </Button>
  );
}

// Web Push API necesita la key como Uint8Array. Tomamos el base64url
// de la env var y convertimos.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = typeof window !== "undefined" ? window.atob(base64) : "";
  const buffer = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    buffer[i] = raw.charCodeAt(i);
  }
  return buffer;
}
