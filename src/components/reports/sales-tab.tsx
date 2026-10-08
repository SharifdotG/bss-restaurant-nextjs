"use client";

import dynamic from "next/dynamic";
import {
  ChartLineUpIcon,
  ReceiptIcon,
  TrendUpIcon,
  WalletIcon,
  CoinsIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Panel } from "@/components/panel";
import { Delta } from "@/components/stats/delta";
import { KpiCard } from "@/components/stats/kpi-card";
import { salesReportQuery } from "@/lib/api/queries";
import { change, salesPoints } from "@/lib/reports";
import { useFormat } from "@/lib/use-format";
import { MoneySplit } from "./money-split";
import { SalesTable } from "./sales-table";
import type { ReportUrl } from "./use-report-url";

const SalesArea = dynamic(() => import("@/components/charts/sales-area").then((m) => m.SalesArea), {
  ssr: false,
  loading: () => <ChartSkeleton className="h-64" />,
});

/** Money in against money out for the range, next to the same stretch before it. */
export function SalesTab({ url, today }: { url: ReportUrl; today: string }) {
  const t = useTranslations("reports.sales");
  const format = useFormat();
  const { range, compare, groupBy } = url;
  const report = useQuery(salesReportQuery({ ...range, groupBy })).data;
  const before = useQuery(salesReportQuery({ ...compare, groupBy })).data;

  const now = report?.totals;
  const then = before?.totals;
  const empty = now && now.orders === 0 && now.expenses === 0 && now.refunds === 0;
  // A delta only means something once both sides have loaded and there is something to show.
  const delta = (pick: (totals: NonNullable<typeof now>) => number) =>
    now && then && !empty ? change(pick(now), pick(then)) : null;
  const rangeLabel = format.dayRange(range.from, range.to);
  const compareLabel = format.dayRange(compare.from, compare.to);
  const nothing = t("nothing");

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
        <KpiCard
          id={`reports.sales.${range.from}.${range.to}`}
          label={t("kpis.sales")}
          icon={WalletIcon}
          value={now?.sales}
          format={format.moneyWhole}
          badge={<Delta value={delta((x) => x.sales)} />}
          note={
            empty
              ? nothing
              : then &&
                t("kpis.salesNote", { amount: format.moneyWhole(then.sales), range: compareLabel })
          }
        />
        <KpiCard
          id={`reports.orders.${range.from}.${range.to}`}
          label={t("kpis.orders")}
          icon={ReceiptIcon}
          value={now?.orders}
          format={(n) => format.number(Math.round(n))}
          badge={<Delta value={delta((x) => x.orders)} />}
          note={
            empty
              ? nothing
              : now && t("kpis.ordersNote", { amount: format.money(now.averageOrder) })
          }
        />
        <KpiCard
          id={`reports.expenses.${range.from}.${range.to}`}
          label={t("kpis.expenses")}
          icon={CoinsIcon}
          value={now?.expenses}
          format={format.moneyWhole}
          badge={<Delta value={delta((x) => x.expenses)} goodWhen="down" />}
          note={empty ? nothing : t("kpis.expensesNote")}
        />
        <KpiCard
          id={`reports.profit.${range.from}.${range.to}`}
          label={t("kpis.profit")}
          icon={TrendUpIcon}
          value={now?.profit}
          format={format.moneyWhole}
          badge={<Delta value={delta((x) => x.profit)} />}
          note={empty ? nothing : t("kpis.profitNote")}
        />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <Panel
          title={t(`chart.${groupBy}`)}
          subtitle={
            empty ? (
              t("chart.sub")
            ) : (
              <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
                <Delta value={delta((x) => x.sales)} />
                {t("chart.against", { range: compareLabel })}
              </span>
            )
          }
        >
          {!report ? (
            <ChartSkeleton className="h-64" />
          ) : empty ? (
            <EmptyState
              icon={ChartLineUpIcon}
              tone="slate"
              title={t("emptyTitle", { range: rangeLabel })}
              className="py-14"
            >
              {t("empty")}
            </EmptyState>
          ) : (
            <SalesArea
              points={salesPoints(report.rows, today, before?.rows)}
              groupBy={groupBy}
              current={rangeLabel}
              previous={before ? compareLabel : undefined}
            />
          )}
        </Panel>
        {!empty && <MoneySplit totals={now} rangeLabel={rangeLabel} />}
      </div>

      {!empty && <SalesTable report={report} groupBy={groupBy} range={range} today={today} />}
    </div>
  );
}
