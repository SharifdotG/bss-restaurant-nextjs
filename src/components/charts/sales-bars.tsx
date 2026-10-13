"use client";

import { useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  Cell,
  Text,
  Tooltip,
  XAxis,
  YAxis,
  type XAxisTickContentProps,
} from "recharts";
import { ChartContainer, ChartLegend, ChartTooltipCard } from "@/components/ui/chart";
import type { GroupBy } from "@/lib/api/schema";
import { change, niceScale, scaleTicks, type SalesPoint } from "@/lib/reports";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

const config = {
  sales: { label: "", color: "var(--chart-1)" },
  open: { label: "", color: "var(--chart-3)" },
};

type SalesBarsProps = {
  points: SalesPoint[];
  groupBy: GroupBy;
  className?: string;
};

/**
 * Paid sales per period as rounded bars on tracks. A period that runs into today is light
 * orange: it's still filling up. Hovering compares a day with the same weekday a week back.
 */
export function SalesBars({ points, groupBy, className }: SalesBarsProps) {
  const t = useTranslations("charts");
  const format = useFormat();
  const reduced = useReducedMotion();
  const scale = niceScale(Math.max(...points.map((point) => point.sales), 0));
  // A day is best read against the same weekday; months and years against the one before.
  const back = groupBy === "day" ? 7 : 1;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <ChartContainer config={config} className="h-56">
        <BarChart
          data={points}
          margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
          barCategoryGap="24%"
        >
          <XAxis
            dataKey="start"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={4}
            // Still used to measure labels, so Recharts doesn't thin them out.
            tickFormatter={(start: string) => format.period(start, start, groupBy, "tick")}
            // The period still filling up gets a bold label, like the light bar above it.
            tick={({ x, y, payload }: XAxisTickContentProps) => {
              const open = points.some((point) => point.open && point.start === payload.value);
              return (
                <Text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  verticalAnchor="start"
                  className={cn(open && "font-bold")}
                  style={open ? { fill: "var(--foreground)" } : undefined}
                >
                  {format.period(payload.value, payload.value, groupBy, "tick")}
                </Text>
              );
            }}
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
            cursor={false}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as SalesPoint | undefined;
              if (!active || !point) return null;
              const before = points[points.indexOf(point) - back];
              const delta = before ? change(point.sales, before.sales) : null;
              return (
                <ChartTooltipCard
                  title={format.period(point.start, point.end, groupBy)}
                  rows={[
                    {
                      key: "sales",
                      label: point.open ? t("soFar") : t("paidSales"),
                      value: format.money(point.sales),
                      color: point.open ? "var(--chart-3)" : "var(--chart-1)",
                    },
                    { key: "orders", label: t("orders"), value: format.number(point.orders) },
                  ]}
                  note={
                    before &&
                    delta !== null &&
                    t("against", {
                      change: format.number(delta / 100, {
                        style: "percent",
                        maximumFractionDigits: 0,
                        signDisplay: "exceptZero",
                      }),
                      when: format.period(before.start, before.end, groupBy),
                    })
                  }
                />
              );
            }}
          />
          <Bar
            dataKey="sales"
            radius={6}
            background={{ fill: "var(--chart-track)", radius: 6 }}
            isAnimationActive={!reduced}
            animationDuration={700}
            animationEasing="ease-out"
          >
            {points.map((point) => (
              <Cell
                key={point.start}
                fill={point.open ? "var(--color-open)" : "var(--color-sales)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      <ChartLegend
        items={[
          { key: "sales", label: t("paidSales"), color: "var(--chart-1)" },
          ...(points.some((point) => point.open)
            ? [{ key: "open", label: t("stillOpen"), color: "var(--chart-3)" }]
            : []),
          // The pale tracks are the top of the scale, so they get a name too.
          {
            key: "track",
            label: t("scaleTo", { amount: format.moneyCompact(scale.top) }),
            color: "var(--chart-track)",
          },
        ]}
      />
      <PointsTable points={points} groupBy={groupBy} />
    </div>
  );
}

/** The same numbers for screen readers. */
export function PointsTable({ points, groupBy }: { points: SalesPoint[]; groupBy: GroupBy }) {
  const t = useTranslations("charts");
  const format = useFormat();
  return (
    <table className="sr-only">
      <caption>{t("tableCaption")}</caption>
      <thead>
        <tr>
          <th scope="col">{t("period")}</th>
          <th scope="col">{t("paidSales")}</th>
          <th scope="col">{t("orders")}</th>
        </tr>
      </thead>
      <tbody>
        {points.map((point) => (
          <tr key={point.start}>
            <th scope="row">{format.period(point.start, point.end, groupBy)}</th>
            <td>{format.money(point.sales)}</td>
            <td>{format.number(point.orders)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
