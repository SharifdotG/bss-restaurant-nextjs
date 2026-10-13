"use client";

import type { Icon } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CountUp } from "./count-up";

type KpiCardProps = {
  /** Keeps the count-up to once per visit for this figure. */
  id: string;
  label: string;
  icon: Icon;
  /** Undefined while loading. */
  value: number | undefined;
  format: (value: number) => string;
  /** A word instead of a figure, e.g. the best seller's name; shown as is. */
  text?: string;
  /** Sits next to the value, usually a Delta. */
  badge?: React.ReactNode;
  note?: React.ReactNode;
  className?: string;
};

/** One headline figure: label, the number, and a line of context under it. */
export function KpiCard({
  id,
  label,
  icon: Icon,
  value,
  format,
  text,
  badge,
  note,
  className,
}: KpiCardProps) {
  // Phones: the tile sits beside the label and the figure gets the card's full width.
  // Wider: the tile stands to the right of all three lines.
  const body = "col-span-2 sm:col-span-1";
  return (
    <article
      className={cn(
        "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] content-start gap-x-3 gap-y-1.5 rounded-xl bg-card p-4 shadow-md sm:gap-x-4 sm:p-5",
        className,
      )}
    >
      <h2 className="self-center truncate text-sm font-medium text-muted-foreground sm:self-start">
        {label}
      </h2>
      <span className="col-start-2 row-start-1 grid size-9 place-items-center rounded-md bg-primary text-primary-foreground sm:row-span-3 sm:size-12 sm:rounded-lg">
        <Icon weight="duotone" className="size-5 sm:size-6" />
      </span>
      {value === undefined ? (
        <>
          <Skeleton className={cn("h-8 w-28", body)} />
          <Skeleton className={cn("h-3.5 w-36", body)} />
        </>
      ) : (
        <>
          <p className={cn("flex animate-appear flex-wrap items-baseline gap-x-2 gap-y-0.5", body)}>
            {text !== undefined ? (
              <span className="line-clamp-2 min-w-0 text-xl leading-7 font-bold tracking-tight break-words">
                {text}
              </span>
            ) : (
              <CountUp
                id={id}
                value={value}
                format={format}
                // A loss keeps its minus sign on the same line as the figure.
                className="text-2xl font-bold tracking-tight whitespace-nowrap tabular-nums"
              />
            )}
            {badge}
          </p>
          {note && (
            <p className={cn("text-xs text-pretty text-muted-foreground sm:line-clamp-2", body)}>
              {note}
            </p>
          )}
        </>
      )}
    </article>
  );
}
