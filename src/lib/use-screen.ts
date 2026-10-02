import { useEffect, useSyncExternalStore } from "react";

// Kitchen screens sit on a wall all service: keep them awake and let them fill the screen.

/** Holds a screen wake lock while `active`. Browsers drop it when the tab hides, so it's retaken. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let stopped = false;

    const take = async () => {
      if (document.visibilityState !== "visible" || sentinel) return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (stopped) return void lock.release();
        sentinel = lock;
        lock.addEventListener("release", () => {
          if (sentinel === lock) sentinel = null;
        });
      } catch {
        // Low battery or not allowed; the screen may dim, nothing else breaks.
      }
    };

    void take();
    document.addEventListener("visibilitychange", take);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", take);
      void sentinel?.release();
    };
  }, [active]);
}

function subscribeFullscreen(listener: () => void) {
  document.addEventListener("fullscreenchange", listener);
  return () => document.removeEventListener("fullscreenchange", listener);
}

/** Fullscreen state and a toggle; `supported` is false on iPhones and in some embeds. */
export function useFullscreen() {
  const active = useSyncExternalStore(
    subscribeFullscreen,
    () => document.fullscreenElement !== null,
    () => false,
  );
  const supported = useSyncExternalStore(
    () => () => {},
    () => document.fullscreenEnabled,
    () => false,
  );

  const enter = () => {
    if (!document.fullscreenElement)
      void document.documentElement.requestFullscreen?.().catch(() => {});
  };
  const exit = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  };

  return { active, supported, enter, exit, toggle: active ? exit : enter };
}
