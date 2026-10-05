import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import type { UserRole } from "@/lib/api/schema";
import { goShortcuts } from "@/lib/navigation";
import { getOverlay, openOverlay } from "@/lib/overlays";
import { PAGE_PATHS } from "@/lib/permissions";
import { toggleSidebar } from "@/lib/use-shell-layout";

// "G" has to be followed by the page letter within this window.
const CHORD_MS = 1200;

export const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** ⌘K, ⌘B, "?" and the G-then-letter page jumps, for the whole signed-in app. */
export function useShortcuts(role: UserRole | null) {
  const router = useRouter();

  useEffect(() => {
    if (!role) return;
    const keys = new Map(goShortcuts(role).map(([page, key]) => [key, PAGE_PATHS[page]]));
    let chordAt = 0;

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return;
      const key = event.key.toLowerCase();

      if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) {
        if (key === "k") {
          event.preventDefault();
          openOverlay(getOverlay() === "command" ? null : "command");
        } else if (key === "b" && getOverlay() === null) {
          event.preventDefault();
          toggleSidebar();
        }
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target) || getOverlay() !== null) return;

      if (event.key === "?") {
        openOverlay("shortcuts");
      } else if (key === "g") {
        chordAt = Date.now();
      } else if (chordAt && Date.now() - chordAt < CHORD_MS && keys.has(key)) {
        chordAt = 0;
        router.push(keys.get(key)!);
      } else {
        chordAt = 0;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [role, router]);
}
