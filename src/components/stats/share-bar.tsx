"use client";

import * as m from "motion/react-m";
import { cn } from "@/lib/utils";

type ShareBarProps = {
  /** 0–100 of the track. */
  value: number;
  /** Muted for the comparison or the "everything else" rows. */
  muted?: boolean;
  className?: string;
};

/** A rounded fill on a track, for rankings and shares. Grows in from the left. */
export function ShareBar({ value, muted, className }: ShareBarProps) {
  const width = `${Math.min(100, Math.max(0, value))}%`;
  return (
    <span
      aria-hidden
      className={cn("block h-2 overflow-hidden rounded-full bg-chart-track", className)}
    >
      <m.span
        initial={{ width: 0 }}
        animate={{ width }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={cn("block h-full rounded-full", muted ? "bg-chart-2" : "bg-chart-1")}
      />
    </span>
  );
}
