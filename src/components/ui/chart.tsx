"use client";

import * as React from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

/** Series name to its label and colour. Colours are token references, so themes just work. */
export type ChartConfig = Record<string, { label: string; color: string }>;

type ChartContainerProps = Omit<React.ComponentProps<"div">, "children"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof ResponsiveContainer>["children"];
};

/** Sizes the chart to its box and hands each series its colour as `--color-<key>`. */
function ChartContainer({ config, className, style, children, ...props }: ChartContainerProps) {
  const colors = Object.fromEntries(
    Object.entries(config).map(([key, series]) => [`--color-${key}`, series.color]),
  );

  return (
    <div
      data-slot="chart"
      style={{ ...colors, ...style }}
      className={cn(
        "w-full text-xs tabular-nums",
        "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-surface]:outline-hidden",
        className,
      )}
      {...props}
    >
      <ResponsiveContainer initialDimension={{ width: 320, height: 200 }}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

type TooltipRow = { key: string; label: string; value: string; color?: string };

type ChartTooltipCardProps = {
  title: string;
  rows: TooltipRow[];
  /** A line under the numbers, e.g. "+33% on last Fri". */
  note?: React.ReactNode;
  className?: string;
};

/** The floating card charts show on hover; numbers arrive already formatted. */
function ChartTooltipCard({ title, rows, note, className }: ChartTooltipCardProps) {
  return (
    <div
      className={cn(
        "grid min-w-40 gap-1.5 rounded-lg border border-border bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-lg",
        className,
      )}
    >
      <p className="font-bold">{title}</p>
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-2">
          {row.color && (
            <span className="size-2 shrink-0 rounded-full" style={{ background: row.color }} />
          )}
          <span className="text-muted-foreground">{row.label}</span>
          <span className="ml-auto pl-3 font-bold tabular-nums">{row.value}</span>
        </div>
      ))}
      {note && <p className="text-muted-foreground">{note}</p>}
    </div>
  );
}

type LegendItem = { key: string; label: string; color: string; dashed?: boolean };

/** Legends are plain HTML under the plot, so they wrap and read like the rest of the page. */
function ChartLegend({ items, className }: { items: LegendItem[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs", className)}>
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-1.5 text-muted-foreground">
          <span
            className={cn("h-2 w-3 shrink-0 rounded-full", item.dashed && "h-0.5 rounded-none")}
            style={{ background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export { ChartContainer, ChartLegend, ChartTooltipCard };
