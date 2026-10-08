"use client";

import { CoinsIcon, PercentIcon, ReceiptXIcon, TagIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/empty-state";
import { Panel } from "@/components/panel";
import { Delta } from "@/components/stats/delta";
import { KpiCard } from "@/components/stats/kpi-card";
import { ShareBar } from "@/components/stats/share-bar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { expenseReportQuery, salesReportQuery } from "@/lib/api/queries";
import { change } from "@/lib/reports";
import { useFormat } from "@/lib/use-format";
import { ReportCsv } from "./report-csv";
import type { ReportUrl } from "./use-report-url";

/** Where the money went out, by category, against the same stretch before. */
export function ExpensesTab({ url }: { url: ReportUrl }) {
  const t = useTranslations("reports.expenses");
  const tCategory = useTranslations("expenseCategories");
  const format = useFormat();
  const { range, compare, groupBy } = url;
  const report = useQuery(expenseReportQuery(range)).data;
  const before = useQuery(expenseReportQuery(compare)).data;
  // Shared with the sales tab's cache, so switching tabs costs nothing.
  const sales = useQuery(salesReportQuery({ ...range, groupBy })).data?.totals.sales;

  const empty = report?.categories.length === 0;
  const biggest = report?.categories[0];
  const perHundred = report && sales ? (report.total / sales) * 100 : null;
  const previous = new Map(before?.categories.map((share) => [share.category, share.amount]));
  const compareLabel = format.dayRange(compare.from, compare.to);
  const entries = report?.categories.reduce((sum, share) => sum + share.count, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
        <KpiCard
          id={`reports.spent.${range.from}.${range.to}`}
          label={t("kpis.total")}
          icon={CoinsIcon}
          value={report?.total}
          format={format.moneyWhole}
          badge={
            report &&
            before &&
            !empty && <Delta value={change(report.total, before.total)} goodWhen="down" />
          }
          note={
            empty
              ? t("nothing")
              : before &&
                t("kpis.totalNote", {
                  amount: format.moneyWhole(before.total),
                  range: compareLabel,
                })
          }
        />
        <KpiCard
          id={`reports.biggest.${range.from}.${range.to}`}
          label={t("kpis.biggest")}
          icon={TagIcon}
          value={report ? (biggest?.amount ?? 0) : undefined}
          format={format.moneyWhole}
          text={biggest ? tCategory(biggest.category) : "—"}
          note={
            biggest
              ? t("kpis.biggestNote", {
                  amount: format.moneyWhole(biggest.amount),
                  share: format.percent(biggest.share),
                })
              : report && t("nothing")
          }
        />
        <KpiCard
          id={`reports.ratio.${range.from}.${range.to}`}
          label={t("kpis.ratio")}
          icon={PercentIcon}
          value={report && sales !== undefined ? (perHundred ?? 0) : undefined}
          format={format.money}
          text={perHundred === null ? "—" : undefined}
          note={perHundred === null ? t("kpis.noSales") : t("kpis.ratioNote")}
          className="col-span-2 xl:col-span-1"
        />
      </div>

      <Panel
        flush
        title={t("table.title")}
        subtitle={entries === undefined ? " " : t("table.sub", { n: entries })}
        action={<ReportCsv file="expenses" range={range} variant="outline" size="sm" />}
      >
        {!report ? (
          <div className="grid gap-2 px-5 sm:px-6">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-11 rounded-md" />
            ))}
          </div>
        ) : empty ? (
          <EmptyState icon={ReceiptXIcon} tone="slate" title={t("emptyTitle")} className="py-12">
            {t("empty")}
          </EmptyState>
        ) : (
          <Table className="tabular-nums">
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.category")}</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  {t("table.entries")}
                </TableHead>
                <TableHead className="text-right">{t("table.amount")}</TableHead>
                <TableHead className="hidden w-56 md:table-cell">{t("table.share")}</TableHead>
                <TableHead className="text-right">{t("table.change")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.categories.map((share) => {
                const earlier = previous.get(share.category);
                return (
                  <TableRow key={share.category}>
                    <TableCell className="font-bold">{tCategory(share.category)}</TableCell>
                    <TableCell className="hidden text-right sm:table-cell">
                      {format.number(share.count)}
                    </TableCell>
                    <TableCell className="text-right font-bold whitespace-nowrap">
                      {format.money(share.amount)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-3">
                        <ShareBar value={share.share} muted className="flex-1" />
                        <span className="w-12 text-right text-xs font-bold">
                          {format.percent(share.share)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {earlier ? (
                        <Delta value={change(share.amount, earlier)} goodWhen="down" />
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("table.new")}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
