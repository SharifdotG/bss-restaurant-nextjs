"use client";

import { useId } from "react";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import * as m from "motion/react-m";
import { INDICATOR_SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

type SegmentedProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  options: { value: T; label: React.ReactNode; ariaLabel?: string }[];
  /** Stretch to the parent's width, segments sharing it evenly. */
  fill?: boolean;
  className?: string;
  "aria-label": string;
};

/** Single-choice switch: one segment is always on, and the white chip slides to it. */
function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  fill,
  className,
  ...props
}: SegmentedProps<T>) {
  const chip = useId();

  return (
    <ToggleGroup
      value={[value]}
      // Pressing the active segment would clear the group; keep the current pick instead.
      onValueChange={(next) => next[0] && onValueChange(next[0] as T)}
      className={cn(
        "items-center gap-1 rounded-md bg-muted p-1",
        fill ? "flex w-full" : "inline-flex",
        className,
      )}
      {...props}
    >
      {options.map((option) => (
        <Toggle
          key={option.value}
          value={option.value}
          aria-label={option.ariaLabel}
          className={cn(
            "hit-target relative inline-flex h-[30px] items-center justify-center rounded-sm px-3 text-sm text-muted-foreground transition-colors duration-(--duration-fast) ease-standard outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 data-pressed:text-foreground [&_svg]:size-4",
            fill && "flex-1",
          )}
        >
          {option.value === value && (
            <m.span
              layoutId={chip}
              aria-hidden
              className="absolute inset-0 rounded-sm bg-card shadow-sm"
              transition={INDICATOR_SPRING}
            />
          )}
          <span className="relative inline-flex items-center gap-1.5 whitespace-nowrap">
            {option.label}
          </span>
        </Toggle>
      ))}
    </ToggleGroup>
  );
}

export { Segmented };
