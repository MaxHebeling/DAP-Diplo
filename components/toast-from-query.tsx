"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

const MESSAGES: Record<
  string,
  { key: string; type?: "success" | "info" | "warning" }
> = {
  "already-subscribed": { key: "alreadySubscribed", type: "info" },
  "subscription-canceled": { key: "subscriptionCanceled", type: "info" },
  "phase-locked": {
    key: "phaseLocked",
    type: "warning",
  },
  "module-completed": {
    key: "moduleCompleted",
    type: "success",
  },
  "phase-completed": {
    key: "phaseCompleted",
    type: "success",
  },
  "phase-saved": {
    key: "phaseSaved",
    type: "success",
  },
  "module-saved": {
    key: "moduleSaved",
    type: "success",
  },
  "section-saved": {
    key: "sectionSaved",
    type: "success",
  },
  "thread-saved": {
    key: "threadSaved",
    type: "success",
  },
  "thread-closed": {
    key: "threadClosed",
    type: "info",
  },
  "post-created": {
    key: "postCreated",
    type: "success",
  },
  "community-needs-sub": {
    key: "communityNeedsSub",
    type: "warning",
  },
  "live-created": {
    key: "liveCreated",
    type: "success",
  },
  "live-saved": {
    key: "liveSaved",
    type: "success",
  },
};

/**
 * Lee `?toast=<key>` y dispara el mensaje correspondiente vía sonner.
 * Limpia el query param después para que no se re-dispare en refresh.
 */
export function ToastFromQuery() {
  const t = useTranslations("Toast");
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const firedRef = useRef<string | null>(null);

  useEffect(() => {
    const key = params.get("toast");
    if (!key) return;
    if (firedRef.current === key) return;
    firedRef.current = key;

    const entry = MESSAGES[key];
    if (entry) {
      const msg = t(entry.key);
      if (entry.type === "success") toast.success(msg);
      else if (entry.type === "warning") toast.warning(msg);
      else if (entry.type === "info") toast.info(msg);
      else toast(msg);
    }

    const next = new URLSearchParams(params.toString());
    next.delete("toast");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, router, pathname, t]);

  return null;
}
