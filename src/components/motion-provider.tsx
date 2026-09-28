"use client";

import { LazyMotion, MotionConfig } from "motion/react";

// The full feature set (layout animations included) loads after the first paint.
const loadFeatures = () => import("@/lib/motion-features").then((module) => module.default);

/** Motion for the whole app: `m.*` components only, and reduced motion is respected. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
