"use client";

import { MinusIcon, TrendDownIcon, TrendUpIcon } from "@phosphor-icons/react";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

type DeltaProps = {
  /** Percent change; null when there was nothing to compare with. */
  value: number | null;
  /** For costs a rise is bad news. */
  goodWhen?: "up" | "down";
  className?: string;
};

const ICONS = { up: TrendUpIcon, down: TrendDownIcon, flat: MinusIcon };

/** "+12%" in green when things went the right way, red when they didn't. */
export function Delta({ value, goodWhen = "up", className }: DeltaProps) {
  const format = useFormat();
  if (value === null || !Number.isFinite(value)) return null;

  const rounded = Math.round(value * 10) / 10;
  const direction = rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
  const Icon = ICONS[direction];
  const good = direction === goodWhen;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-sm font-bold tabular-nums",
        direction === "flat"
          ? "text-muted-foreground"
          : good
            ? "text-tone-green-text"
            : "text-tone-red-text",
        className,
      )}
    >
      <Icon weight="bold" className="size-3.5" aria-hidden />
      {format.number(rounded / 100, {
        style: "percent",
        maximumFractionDigits: 1,
        signDisplay: "exceptZero",
      })}
    </span>
  );
}
