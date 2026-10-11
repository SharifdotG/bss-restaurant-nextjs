"use client";

import { useEffect, useState } from "react";
import { animate, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { EASE, useFirstVisit } from "@/lib/motion";
import { cn } from "@/lib/utils";

type CountUpProps = {
  /** Remembers that this figure has already counted up this session. */
  id: string;
  value: number;
  format: (value: number) => string;
  className?: string;
};

/**
 * A number that rolls up from zero the first time it's seen in a session. After that a
 * live change swaps the figure and tints it once, so the change gets noticed.
 */
export function CountUp({ id, value, format, className }: CountUpProps) {
  const reduced = useReducedMotion();
  const first = useFirstVisit(`count:${id}`);
  const shown = useMotionValue(first && !reduced ? 0 : value);
  const text = useTransform(shown, format);
  const [last, setLast] = useState(value);
  const [changes, setChanges] = useState(0);
  if (value !== last) {
    setLast(value);
    setChanges(changes + 1);
  }

  useEffect(() => {
    if (first && !reduced && changes === 0) {
      const controls = animate(shown, value, { duration: 0.8, ease: EASE.arrive });
      return () => controls.stop();
    }
    shown.set(value);
  }, [first, reduced, changes, shown, value]);

  return (
    <m.span
      // A new key restarts the tint each time the figure moves.
      key={changes}
      className={cn(changes > 0 && "-mx-1 animate-changed rounded-sm px-1", className)}
    >
      {text}
    </m.span>
  );
}
