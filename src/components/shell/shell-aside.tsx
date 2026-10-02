"use client";

import { createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";

// A page can put a full-height panel at the right edge of the shell, beside the top bar
// rather than under it. The POS cart is the one that does.

const AsideContext = createContext<HTMLElement | null>(null);

export function useAsideSlot() {
  const [node, setNode] = useState<HTMLElement | null>(null);
  return { node, slot: <div ref={setNode} className="contents" /> };
}

export const AsideProvider = AsideContext.Provider;

/** Renders its children in the shell's right-hand slot. */
export function ShellAside({ children }: { children: React.ReactNode }) {
  const node = useContext(AsideContext);
  return node ? createPortal(children, node) : null;
}
