"use client";

import { useReducedMotion } from "motion/react";
import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

export type DonutSlice = { key: string; label: string; value: number; color: string };

type DonutProps = {
  slices: DonutSlice[];
  /** The big number in the middle and the line under it. */
  total: string;
  caption: string;
  /** Formats a slice's value for the legend. */
  formatValue?: (value: number) => string;
  className?: string;
};

/** A ring with the total in the middle and a legend of value and share underneath. */
export function Donut({ slices, total, caption, formatValue, className }: DonutProps) {
  const format = useFormat();
  const reduced = useReducedMotion();
  const sum = slices.reduce((all, slice) => all + slice.value, 0);
  const shown = slices.filter((slice) => slice.value > 0);
  const config = Object.fromEntries(slices.map((slice) => [slice.key, slice]));

  return (
    // Ring over legend in a narrow card, side by side when there's room.
    <div className={cn("@container", className)}>
      <div className="flex flex-col gap-5 @md:flex-row @md:items-center @md:gap-8">
        <div className="relative mx-auto size-44 shrink-0 @md:mx-0">
          <ChartContainer config={config} className="size-full">
            <PieChart>
              <Pie
                data={shown.length ? shown : [{ key: "none", label: "", value: 1, color: "" }]}
                dataKey="value"
                nameKey="label"
                innerRadius="72%"
                outerRadius="100%"
                paddingAngle={shown.length > 1 ? 2 : 0}
                cornerRadius={4}
                stroke="none"
                startAngle={90}
                endAngle={-270}
                isAnimationActive={!reduced}
                animationDuration={700}
              >
                {(shown.length ? shown : [null]).map((slice) => (
                  <Cell
                    key={slice?.key ?? "none"}
                    fill={slice ? `var(--color-${slice.key})` : "var(--chart-track)"}
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
            <p className="text-2xl leading-tight font-bold tabular-nums">{total}</p>
            <p className="text-xs text-muted-foreground">{caption}</p>
          </div>
        </div>
        <ul className="grid flex-1 gap-2.5 @md:max-w-sm">
          {slices.map((slice) => (
            <li key={slice.key} className="flex items-center gap-2.5 text-sm">
              <span
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ background: slice.color }}
              />
              <span className="min-w-0 flex-1 truncate">{slice.label}</span>
              <span className="font-bold tabular-nums">
                {formatValue ? formatValue(slice.value) : format.number(slice.value)}
              </span>
              <span className="w-14 text-right text-muted-foreground tabular-nums">
                {format.percent(sum ? (slice.value / sum) * 100 : 0)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
