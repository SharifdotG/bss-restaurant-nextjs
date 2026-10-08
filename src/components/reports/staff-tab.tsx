"use client";

import { HandCoinsIcon, ProhibitIcon, TrophyIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/empty-state";
import { Panel } from "@/components/panel";
import { Delta } from "@/components/stats/delta";
import { KpiCard } from "@/components/stats/kpi-card";
import { ShareBar } from "@/components/stats/share-bar";
import { Avatar, AvatarFallback, initials } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { staffReportQuery } from "@/lib/api/queries";
import { toPaisa, toTaka } from "@/lib/money";
import { change } from "@/lib/reports";
import { useFormat } from "@/lib/use-format";
import { ReportCsv } from "./report-csv";
import type { ReportUrl } from "./use-report-url";

/** How each waiter did: what they sold, how big their tables' bills were, what got cancelled. */
export function StaffTab({ url }: { url: ReportUrl }) {
  const t = useTranslations("reports.staff");
  const format = useFormat();
  const { range, compare } = url;
  const report = useQuery(staffReportQuery(range)).data;
  const before = useQuery(staffReportQuery(compare)).data;

  // The API lists every employee; only people who actually waited tables belong here.
  const rows = report?.rows.filter((row) => row.orders > 0 || row.cancelled > 0);
  const empty = rows?.length === 0;
  const top = rows?.[0];
  const orders = rows?.reduce((sum, row) => sum + row.orders, 0) ?? 0;
  const cancelled = rows?.reduce((sum, row) => sum + row.cancelled, 0);
  const average = report && orders ? toTaka(Math.round(toPaisa(report.totalSales) / orders)) : 0;
  const previous = new Map(before?.rows.map((row) => [row.employee.id, row.sales]));
  const compareLabel = format.dayRange(compare.from, compare.to);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
        <KpiCard
          id={`reports.staffSales.${range.from}.${range.to}`}
          label={t("kpis.sales")}
          icon={UsersThreeIcon}
          value={report?.totalSales}
          format={format.moneyWhole}
          badge={
            report &&
            before &&
            !empty && <Delta value={change(report.totalSales, before.totalSales)} />
          }
          note={empty ? t("nothing") : rows && t("kpis.salesNote", { n: rows.length })}
        />
        <KpiCard
          id={`reports.top.${range.from}.${range.to}`}
          label={t("kpis.top")}
          icon={TrophyIcon}
          value={report ? (top?.sales ?? 0) : undefined}
          format={format.moneyWhole}
          text={top?.employee.fullName ?? "—"}
          note={
            top
              ? t("kpis.topNote", {
                  amount: format.moneyWhole(top.sales),
                  share: format.percent(top.share),
                })
              : report && t("nothing")
          }
        />
        <KpiCard
          id={`reports.staffAverage.${range.from}.${range.to}`}
          label={t("kpis.average")}
          icon={HandCoinsIcon}
          value={report ? average : undefined}
          format={format.money}
          note={t("kpis.averageNote", { n: orders })}
        />
        <KpiCard
          id={`reports.cancelled.${range.from}.${range.to}`}
          label={t("kpis.cancelled")}
          icon={ProhibitIcon}
          value={cancelled}
          format={(n) => format.number(Math.round(n))}
          note={t("kpis.cancelledNote")}
        />
      </div>

      <Panel
        flush
        title={t("table.title")}
        subtitle={t("table.sub")}
        action={<ReportCsv file="staff" range={range} variant="outline" size="sm" />}
      >
        {!rows ? (
          <div className="grid gap-2 px-5 sm:px-6">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-12 rounded-md" />
            ))}
          </div>
        ) : empty ? (
          <EmptyState icon={UsersThreeIcon} tone="slate" title={t("emptyTitle")} className="py-12">
            {t("empty")}
          </EmptyState>
        ) : (
          <Table className="tabular-nums">
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.waiter")}</TableHead>
                <TableHead className="text-right">{t("table.orders")}</TableHead>
                <TableHead className="hidden text-right lg:table-cell">
                  {t("table.items")}
                </TableHead>
                <TableHead className="text-right">{t("table.sales")}</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  {t("table.average")}
                </TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  {t("table.cancelled")}
                </TableHead>
                <TableHead className="hidden w-48 md:table-cell">{t("table.share")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const earlier = previous.get(row.employee.id);
                return (
                  <TableRow key={row.employee.id}>
                    <TableCell>
                      <div className="flex min-w-40 items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="text-xs">
                            {initials(row.employee.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-bold">
                            {row.employee.fullName}
                            {!row.employee.isActive && (
                              <span className="font-normal text-muted-foreground">
                                {" "}
                                · {t("table.left")}
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.employee.designation}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{format.number(row.orders)}</TableCell>
                    <TableCell className="hidden text-right lg:table-cell">
                      {format.number(row.itemsSold)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <span className="font-bold">{format.moneyWhole(row.sales)}</span>
                      {earlier !== undefined && (
                        <Delta value={change(row.sales, earlier)} className="ml-2 text-xs" />
                      )}
                    </TableCell>
                    <TableCell className="hidden text-right whitespace-nowrap sm:table-cell">
                      {format.money(row.averageOrder)}
                    </TableCell>
                    <TableCell className="hidden text-right sm:table-cell">
                      {row.cancelled ? format.number(row.cancelled) : "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-3">
                        <ShareBar value={row.share} className="flex-1" />
                        <span className="w-12 text-right text-xs font-bold">
                          {format.percent(row.share)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>
      <p className="text-xs text-muted-foreground">{t("compareNote", { range: compareLabel })}</p>
    </div>
  );
}
