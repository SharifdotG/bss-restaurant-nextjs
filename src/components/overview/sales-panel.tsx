"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { Panel } from "@/components/panel";
import { Segmented } from "@/components/ui/segmented";
import { salesReportQuery } from "@/lib/api/queries";
import { OVERVIEW_SPANS, salesPoints, spanRange } from "@/lib/reports";
import { useFormat } from "@/lib/use-format";

// Recharts is the heaviest thing on the page; it loads after the numbers do.
const SalesBars = dynamic(() => import("@/components/charts/sales-bars").then((m) => m.SalesBars), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

/** Managers only: paid sales by day for two weeks or the month, by month for the year. */
export function SalesPanel({ today, className }: { today: string; className?: string }) {
  const t = useTranslations("overview.sales");
  const format = useFormat();
  const [span, setSpan] = useQueryState(
    "span",
    parseAsStringLiteral(OVERVIEW_SPANS).withDefault("days14"),
  );
  const range = spanRange(span, today);
  const report = useQuery(salesReportQuery(range));
  const data = report.data;

  return (
    <Panel
      className={className}
      title={t("title")}
      subtitle={
        data
          ? t(`sub.${span}`, { amount: format.moneyWhole(data.totals.sales) })
          : t(`span.${span}`)
      }
      action={
        <Segmented
          aria-label={t("spanLabel")}
          value={span}
          onValueChange={(next) => void setSpan(next === "days14" ? null : next)}
          options={OVERVIEW_SPANS.map((value) => ({ value, label: t(`span.${value}`) }))}
        />
      }
    >
      {report.isError ? (
        <p className="grid h-56 place-items-center text-sm text-muted-foreground">{t("failed")}</p>
      ) : data ? (
        <SalesBars points={salesPoints(data.rows, today)} groupBy={range.groupBy} />
      ) : (
        <ChartSkeleton />
      )}
    </Panel>
  );
}
