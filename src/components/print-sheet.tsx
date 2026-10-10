"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const noop = () => () => {};

/**
 * Something only the printer sees. It's portalled to the end of <body>, the print styles hide
 * everything else, and dark mode steps aside while printing so paper gets the light tokens.
 */
export function PrintSheet({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

  useEffect(() => {
    const root = document.documentElement;
    let wasDark = false;
    const before = () => {
      wasDark = root.classList.contains("dark");
      root.classList.remove("dark");
    };
    const after = () => {
      if (wasDark) root.classList.add("dark");
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  if (!mounted) return null;
  return createPortal(<div data-print-sheet>{children}</div>, document.body);
}
