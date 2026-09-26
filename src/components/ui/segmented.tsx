"use client";

import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { cn } from "@/lib/utils";

type SegmentedProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  options: { value: T; label: React.ReactNode; ariaLabel?: string }[];
  className?: string;
  "aria-label": string;
};

/** Single-choice switch: one segment is always on. */
function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  className,
  ...props
}: SegmentedProps<T>) {
  return (
    <ToggleGroup
      value={[value]}
      // Pressing the active segment would clear the group; keep the current pick instead.
      onValueChange={(next) => next[0] && onValueChange(next[0] as T)}
      className={cn("inline-flex items-center gap-1 rounded-md bg-muted p-1", className)}
      {...props}
    >
      {options.map((option) => (
        <Toggle
          key={option.value}
          value={option.value}
          aria-label={option.ariaLabel}
          className="inline-flex h-[30px] items-center gap-1.5 rounded-sm px-3 text-sm text-muted-foreground transition-[background-color,color,box-shadow] duration-(--duration-fast) ease-standard outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-sm [&_svg]:size-4"
        >
          {option.label}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}

export { Segmented };
