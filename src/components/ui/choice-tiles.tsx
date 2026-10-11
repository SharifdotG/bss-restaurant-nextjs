"use client";

import type { Icon } from "@phosphor-icons/react";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { cn } from "@/lib/utils";

type ChoiceTilesProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  options: { value: T; label: React.ReactNode; icon: Icon; hint?: React.ReactNode }[];
  className?: string;
  "aria-label": string;
};

/** Big single-choice tiles with an icon, for picks made by touch (how a bill is paid). */
function ChoiceTiles<T extends string>({
  value,
  onValueChange,
  options,
  className,
  ...props
}: ChoiceTilesProps<T>) {
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(next) => next[0] && onValueChange(next[0] as T)}
      className={cn("grid auto-cols-fr grid-flow-col gap-2", className)}
      {...props}
    >
      {options.map(({ value: option, label, icon: Icon, hint }) => (
        <Toggle
          key={option}
          value={option}
          className="group/tile flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-card px-2 py-2.5 text-sm font-bold text-muted-foreground transition-[background-color,border-color,color,box-shadow,scale] duration-(--duration-fast) ease-standard outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 active:scale-[0.98] data-pressed:border-primary/40 data-pressed:bg-primary-soft data-pressed:text-primary-soft-foreground"
        >
          <Icon weight="duotone" className="size-6" />
          {label}
          {hint && <span className="text-2xs font-medium opacity-80">{hint}</span>}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}

export { ChoiceTiles };
