"use client";

import { useEffect } from "react";

type WakeLockSentinel = { release: () => Promise<void> };
type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
};

/** Mantém a tela acesa durante o slideshow (best-effort; ignora se o navegador não suportar). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const nav = navigator as NavigatorWithWakeLock;

    async function requestLock() {
      try {
        if (nav.wakeLock) {
          const s = await nav.wakeLock.request("screen");
          if (!cancelled) sentinel = s;
          else s.release().catch(() => {});
        }
      } catch {
        // sem suporte ou permissão negada — segue sem wake lock
      }
    }

    requestLock();

    function handleVisibility() {
      if (document.visibilityState === "visible" && !sentinel) {
        requestLock();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
}
