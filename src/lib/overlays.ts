import { useSyncExternalStore } from "react";

// The shell's overlays (search, shortcuts, the sign-out-everywhere check, incoming orders) can be
// opened from the top bar, menus or the keyboard, so which one is open lives outside React.
// One at a time.

export type Overlay = "command" | "shortcuts" | "signOutAll" | "incoming";

let current: Overlay | null = null;
const listeners = new Set<() => void>();

export function openOverlay(next: Overlay | null) {
  if (current === next) return;
  current = next;
  listeners.forEach((listener) => listener());
}

export const closeOverlay = () => openOverlay(null);

export const getOverlay = () => current;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Open state for one overlay, shaped for a Dialog's open/onOpenChange. */
export function useOverlay(name: Overlay) {
  const open = useSyncExternalStore(
    subscribe,
    () => current === name,
    () => false,
  );
  const onOpenChange = (next: boolean) => {
    if (next) openOverlay(name);
    else if (current === name) closeOverlay();
  };
  return { open, onOpenChange };
}

/** "⌘" on Apple keyboards, "Ctrl" everywhere else. */
export const useModKey = () =>
  useSyncExternalStore(
    () => () => {},
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"),
    () => "⌘",
  );

/** ⌘K on a Mac, Ctrl K elsewhere. */
export const withMod = (mod: string, key: string) => (mod === "⌘" ? `⌘${key}` : `${mod} ${key}`);
