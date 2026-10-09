import { useSyncExternalStore } from "react";
import { EMPTY_DRAFT, type Draft } from "./pos";

// A half-built order survives a refresh or a trip to another page. It lives in this browser
// only, under the signed-in person's id, and goes on sign-out.

const PREFIX = "bss-pos-draft:";
const listeners = new Set<() => void>();
const cache = new Map<string, Draft>();

const keyFor = (userId: number) => `${PREFIX}${userId}`;

function read(key: string): Draft {
  const cached = cache.get(key);
  if (cached) return cached;
  let draft = EMPTY_DRAFT;
  try {
    const stored = localStorage.getItem(key);
    if (stored) draft = { ...EMPTY_DRAFT, ...(JSON.parse(stored) as Partial<Draft>) };
  } catch {
    // Private mode or a broken value: start empty.
  }
  cache.set(key, draft);
  return draft;
}

export function saveDraft(userId: number, draft: Draft) {
  const key = keyFor(userId);
  cache.set(key, draft);
  try {
    if (draft.lines.length === 0 && draft.tableId === null && !draft.customerName) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(draft));
    }
  } catch {
    // Still works for this page; it just won't survive a reload.
  }
  listeners.forEach((listener) => listener());
}

/** Points the draft at a table, keeping anything already in the cart; "Start order" uses it. */
export const draftForTable = (userId: number, tableId: number) =>
  saveDraft(userId, { ...read(keyFor(userId)), orderType: "dine_in", tableId });

export const clearDraft = (userId: number) => saveDraft(userId, EMPTY_DRAFT);

/** Every saved draft on this device; called when someone signs out. */
export function forgetDrafts() {
  cache.clear();
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Nothing to forget.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changing the draft shows up here too.
  const onStorage = (event: StorageEvent) => {
    if (event.key?.startsWith(PREFIX)) {
      cache.delete(event.key);
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The person's draft and a setter that saves it. */
export function useDraft(userId: number) {
  const key = keyFor(userId);
  const draft = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => EMPTY_DRAFT,
  );
  const update = (change: Partial<Draft> | ((draft: Draft) => Partial<Draft>)) => {
    const current = read(key);
    const next = typeof change === "function" ? change(current) : change;
    saveDraft(userId, { ...current, ...next });
  };
  return [draft, update] as const;
}
