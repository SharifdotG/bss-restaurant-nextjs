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
  return (
    <article
      className={cn(
        "flex min-w-0 items-start gap-4 rounded-xl bg-card p-4 shadow-md sm:p-5",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="truncate text-sm font-medium text-muted-foreground">{label}</h3>
        {value === undefined ? (
          <>
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3.5 w-36" />
          </>
        ) : (
          <>
            <p className="flex animate-appear flex-wrap items-baseline gap-x-2 gap-y-0.5">
              {text !== undefined ? (
                <span className="line-clamp-2 min-w-0 text-xl leading-7 font-bold tracking-tight break-words">
                  {text}
                </span>
              ) : (
                <CountUp
                  id={id}
                  value={value}
                  format={format}
                  className="text-2xl font-bold tracking-tight tabular-nums"
                />
              )}
              {badge}
            </p>
            {note && <p className="line-clamp-2 text-xs text-muted-foreground">{note}</p>}
          </>
        )}
      </div>
      <span className="hidden size-12 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground sm:grid">
        <Icon weight="duotone" className="size-6" />
      </span>
    </article>
  );
}
