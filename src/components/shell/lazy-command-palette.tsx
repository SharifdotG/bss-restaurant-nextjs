"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useOverlay } from "@/lib/overlays";

const load = () => import("./command-palette").then((module) => module.CommandPalette);
const CommandPalette = dynamic(load, { ssr: false });

/**
 * The ⌘K palette and its search library stay out of the first load. They're fetched once
 * the page is idle, and the palette mounts the first time someone opens it.
 */
export function LazyCommandPalette() {
  const { open } = useOverlay("command");
  const [wanted, setWanted] = useState(false);
  if (open && !wanted) setWanted(true);

  useEffect(() => {
    if (!("requestIdleCallback" in window)) return;
    const id = requestIdleCallback(() => void load());
    return () => cancelIdleCallback(id);
  }, []);

  return wanted ? <CommandPalette /> : null;
}
