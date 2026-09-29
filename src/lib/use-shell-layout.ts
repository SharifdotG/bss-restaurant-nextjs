import { useSyncExternalStore } from "react";

// Matches the S5 breakpoints: full sidebar from 1280, a rail from 1024, a drawer from 768,
// bottom tabs below that.
export type ShellLayout = "phone" | "drawer" | "rail" | "full";

const QUERIES = {
  full: "(min-width: 1280px)",
  rail: "(min-width: 1024px)",
  drawer: "(min-width: 768px)",
} as const;

const STORAGE_KEY = "bss-sidebar";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  // Another tab toggled it: follow that tab.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    chosen = null;
    listener();
  };
  // Resize rather than media-query events: it also fires under devtools' device emulation.
  window.addEventListener("resize", listener);
  window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    window.removeEventListener("resize", listener);
    window.removeEventListener("storage", onStorage);
    listeners.delete(listener);
  };
}

// Set once someone toggles in this tab, so the toggle works even when storage is blocked.
let chosen: boolean | null = null;

function readCollapsed() {
  if (chosen !== null) return chosen;
  try {
    return localStorage.getItem(STORAGE_KEY) === "rail";
  } catch {
    return false;
  }
}

function snapshot(): ShellLayout {
  const matches = (query: string) => window.matchMedia(query).matches;
  if (matches(QUERIES.full)) return readCollapsed() ? "rail" : "full";
  if (matches(QUERIES.rail)) return "rail";
  return matches(QUERIES.drawer) ? "drawer" : "phone";
}

/** Which navigation the shell shows. Only used after the session check, so never on the server. */
export function useShellLayout() {
  return useSyncExternalStore(subscribe, snapshot, () => "full" as const);
}

/** True while a wide screen shows the rail because someone collapsed the sidebar. */
export const useCollapsedByChoice = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERIES.full).matches && readCollapsed(),
    () => false,
  );

export function setSidebarCollapsed(collapsed: boolean) {
  chosen = collapsed;
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? "rail" : "full");
  } catch {
    // Private mode: it still toggles, it just isn't remembered.
  }
  listeners.forEach((listener) => listener());
}

/** ⌘B: only wide screens have a sidebar to collapse. */
export function toggleSidebar() {
  if (!window.matchMedia(QUERIES.full).matches) return;
  setSidebarCollapsed(!readCollapsed());
}
