import { useSyncExternalStore } from "react";

// Anything can open the palette (the top bar's search pill, the More sheet, ⌘K), so its open
// state lives outside React.

let open = false;
const listeners = new Set<() => void>();

export function setCommandOpen(next: boolean) {
  if (open === next) return;
  open = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const useCommandOpen = () =>
  useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  );

/** "⌘K" on Apple keyboards, "Ctrl K" everywhere else. */
export const useModKey = () =>
  useSyncExternalStore(
    () => () => {},
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl "),
    () => "⌘",
  );
