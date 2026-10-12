"use client";

import { MinusIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type QtyStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** At the minimum, minus becomes a bin so the line can go. */
  removable?: boolean;
  label: string;
  size?: "sm" | "md";
  className?: string;
};

/** − 2 + in a pill. Plus is the orange one: adding is what this control is for. */
function QtyStepper({
  value,
  onChange,
  min = 0,
  max = 100,
  removable = false,
  label,
  size = "md",
  className,
}: QtyStepperProps) {
  const t = useTranslations("common.qty");
  const format = useFormatter();
  const atMin = value <= Math.max(min, 1);
  const button = size === "sm" ? "size-7" : "size-9";
  const icon = size === "sm" ? "size-3.5" : "size-4";

  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex items-center gap-1 rounded-full bg-muted p-1", className)}
    >
      <button
        type="button"
        aria-label={atMin && removable ? t("remove") : t("less")}
        disabled={value <= min && !removable}
        onClick={() => onChange(atMin && removable ? 0 : Math.max(min, value - 1))}
        className={cn(
          "hit-target relative grid place-items-center rounded-full bg-card text-foreground shadow-sm transition-colors duration-(--duration-fast) outline-none hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-40",
          atMin && removable && "text-tone-red-text",
          button,
        )}
      >
        {atMin && removable ? (
          <TrashIcon className={icon} />
        ) : (
          <MinusIcon weight="bold" className={icon} />
        )}
      </button>
      <output
        aria-live="polite"
        className={cn(
          "min-w-7 text-center font-bold tabular-nums",
          size === "sm" ? "text-sm" : "text-base",
        )}
      >
        {format.number(value)}
      </output>
      <button
        type="button"
        aria-label={t("more")}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={cn(
          "hit-target relative grid place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors duration-(--duration-fast) outline-none hover:bg-primary-hover focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-40",
          button,
        )}
      >
        <PlusIcon weight="bold" className={icon} />
      </button>
    </div>
  );
}

export { QtyStepper };
