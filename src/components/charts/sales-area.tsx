"use client";

import { useId } from "react";
import { useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, Line, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartTooltipCard } from "@/components/ui/chart";
import type { GroupBy } from "@/lib/api/schema";
import { niceScale, scaleTicks, type SalesPoint } from "@/lib/reports";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";
import { PointsTable } from "./sales-bars";

const config = {
  sales: { label: "", color: "var(--chart-1)" },
  previous: { label: "", color: "var(--chart-2)" },
};

type SalesAreaProps = {
  points: SalesPoint[];
  groupBy: GroupBy;
  /** Legend names for the two lines, e.g. "1–11 Oct" and "1–11 Sep". */
  current: string;
  previous?: string;
  className?: string;
};

/** This period as an orange area, the one it's compared with as a grey dashed line. */
export function SalesArea({ points, groupBy, current, previous, className }: SalesAreaProps) {
  const t = useTranslations("charts");
  const format = useFormat();
  const reduced = useReducedMotion();
  const gradient = `fill-${useId().replace(/:/g, "")}`;
  const compared = previous !== undefined && points.some((point) => point.previous !== undefined);
  const scale = niceScale(
    Math.max(...points.flatMap((point) => [point.sales, point.previous ?? 0]), 0),
  );

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <ChartContainer config={config} className="h-64">
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-area-top)" />
              <stop offset="100%" stopColor="var(--chart-area-bottom)" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="start"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={16}
            tickFormatter={(start: string) =>
              format.period(start, start, groupBy, groupBy === "day" ? "full" : "tick")
            }
          />
          <YAxis
            width={40}
            tickLine={false}
            axisLine={false}
            domain={[0, scale.top]}
            ticks={scaleTicks(scale)}
            tickFormatter={(value: number) => format.moneyCompact(value)}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as SalesPoint | undefined;
              if (!active || !point) return null;
              return (
                <ChartTooltipCard
                  title={format.period(point.start, point.end, groupBy)}
                  rows={[
                    {
                      key: "sales",
                      label: point.open ? t("soFar") : current,
                      value: format.money(point.sales),
                      color: "var(--chart-1)",
                    },
                    ...(compared && point.previousStart && point.previous !== undefined
                      ? [
                          {
                            key: "previous",
                            label: format.period(point.previousStart, point.previousStart, groupBy),
                            value: format.money(point.previous),
                            color: "var(--chart-2)",
                          },
                        ]
                      : []),
                  ]}
                />
              );
            }}
          />
          {compared && (
            <Line
              dataKey="previous"
              type="monotone"
              stroke="var(--color-previous)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              isAnimationActive={!reduced}
              animationDuration={700}
            />
          )}
          <Area
            dataKey="sales"
            type="monotone"
            stroke="var(--color-sales)"
            strokeWidth={2.5}
            fill={`url(#${gradient})`}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
            isAnimationActive={!reduced}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ChartContainer>
      <ChartLegend
        items={[
          { key: "sales", label: current, color: "var(--chart-1)" },
          ...(compared
            ? [{ key: "previous", label: previous, color: "var(--chart-2)", dashed: true }]
            : []),
        ]}
      />
      <PointsTable points={points} groupBy={groupBy} />
    </div>
  );
}
