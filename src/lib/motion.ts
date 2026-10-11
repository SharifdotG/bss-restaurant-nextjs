import { useEffect, useState } from "react";
import type { Transition } from "motion/react";

type Bezier = [number, number, number, number];

/** The CSS easing tokens, for Motion components. */
export const EASE = {
  standard: [0.2, 0, 0, 1] as Bezier,
  exit: [0.4, 0, 1, 1] as Bezier,
  arrive: [0.16, 1, 0.3, 1] as Bezier,
  pop: [0.34, 1.56, 0.64, 1] as Bezier,
};

/** The CSS duration tokens in seconds. */
export const DURATION = { fast: 0.12, base: 0.18, slow: 0.26 };

/** Cards and rows gliding to a new place when the list around them changes. */
export const LIST_SPRING: Transition = { type: "spring", stiffness: 420, damping: 38 };

/** The chip under a segmented control or tab, quick and without a wobble. */
export const INDICATOR_SPRING: Transition = { type: "spring", stiffness: 520, damping: 42 };

/**
 * One entrance and exit for every live list: a row drops in from just above, a finished
 * one shrinks away quickly, and the rest glide into place.
 */
export const listItem = {
  layout: "position",
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, transition: { duration: DURATION.fast, ease: EASE.exit } },
  transition: LIST_SPRING,
} as const;

const seen = new Set<string>();

function hasSeen(key: string) {
  if (seen.has(key)) return true;
  try {
    return sessionStorage.getItem(`bss-seen:${key}`) === "1";
  } catch {
    return false;
  }
}

function markSeen(key: string) {
  seen.add(key);
  try {
    sessionStorage.setItem(`bss-seen:${key}`, "1");
  } catch {
    // Private windows can refuse storage; the in-memory set keeps it to once per load.
  }
}

/** True on the first visit to `key` in this browser session; later visits get false. */
export function useFirstVisit(key: string) {
  const [first] = useState(() => !hasSeen(key));
  useEffect(() => markSeen(key), [key]);
  return first;
}

/** After signing out, the next person gets the first-visit moments again. */
export function forgetVisits() {
  seen.clear();
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith("bss-seen:")) sessionStorage.removeItem(key);
    }
  } catch {
    // Nothing stored, nothing to forget.
  }
}

/**
 * A key for a live list that changes only once a new filter or page has its data, so
 * switching views fades the list in once instead of animating every row in and out.
 */
export function useViewKey(view: string, settled: boolean) {
  const [key, setKey] = useState(view);
  if (settled && key !== view) setKey(view);
  return key;
}
