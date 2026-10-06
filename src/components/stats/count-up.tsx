"use client";

import { useEffect, useState } from "react";
import { animate, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import * as m from "motion/react-m";

// Figures count up the first time they're seen in a visit; after that they just show.
const counted = new Set<string>();

type CountUpProps = {
  /** Remembers that this figure has already counted up once. */
  id: string;
  value: number;
  format: (value: number) => string;
  className?: string;
};

/** A number that rolls up from zero once per visit, then follows live changes quietly. */
export function CountUp({ id, value, format, className }: CountUpProps) {
  const reduced = useReducedMotion();
  const [first] = useState(() => !counted.has(id));
  const shown = useMotionValue(first && !reduced ? 0 : value);
  const text = useTransform(shown, format);

  useEffect(() => {
    if (first && !reduced && !counted.has(id)) {
      counted.add(id);
      const controls = animate(shown, value, { duration: 0.8, ease: [0.16, 1, 0.3, 1] });
      return () => controls.stop();
    }
    shown.set(value);
  }, [first, id, reduced, shown, value]);

  return <m.span className={className}>{text}</m.span>;
}
