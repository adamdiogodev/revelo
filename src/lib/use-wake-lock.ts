"use client";

import { useEffect } from "react";

type WakeLockSentinel = { release: () => Promise<void> };
type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
};

/** Keeps the screen awake during the slideshow (best-effort; ignored if unsupported). */
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
        // unsupported or permission denied — carry on without a wake lock
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
