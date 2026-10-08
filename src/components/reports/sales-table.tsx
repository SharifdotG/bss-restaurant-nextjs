"use client";

import { useTranslations } from "next-intl";
import { Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GroupBy, SalesReport, SalesSummary } from "@/lib/api/schema";
import type { DayRange } from "@/lib/reports";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";
import { ReportCsv } from "./report-csv";

const COLUMNS = ["orders", "sales", "discounts", "vat", "refunds", "expenses", "profit"] as const;
// Money that leaves the till reads as a minus, the way an accountant would write it.
const DEDUCTED = new Set(["vat", "refunds", "expenses"]);

type SalesTableProps = {
  report: SalesReport | undefined;
  groupBy: GroupBy;
  range: DayRange;
  today: string;
  className?: string;
};

/** Every period on one line, the totals underneath, and the same thing as a CSV. */
export function SalesTable({ report, groupBy, range, today, className }: SalesTableProps) {
  const t = useTranslations("reports.table");
  const format = useFormat();

  const cell = (row: SalesSummary, column: (typeof COLUMNS)[number]) => {
    const value = row[column];
    if (column === "orders") return format.number(value);
    if (!value) return "—";
    return DEDUCTED.has(column) ? `−${format.money(value)}` : format.money(value);
  };

  return (
    <Panel
      flush
      className={className}
      title={t(`title.${groupBy}`)}
      subtitle={t("sub")}
      action={
        <ReportCsv file="sales" range={range} query={{ groupBy }} variant="outline" size="sm" />
      }
    >
      {!report ? (
        <div className="grid gap-2 px-5 sm:px-6">
          {[0, 1, 2, 3, 4].map((row) => (
            <Skeleton key={row} className="h-10 rounded-md" />
          ))}
        </div>
      ) : (
        <Table className="tabular-nums">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-muted">{t("period")}</TableHead>
              {COLUMNS.map((column) => (
                <TableHead key={column} className="text-right">
                  {t(column)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((row) => (
              <TableRow key={row.periodStart} className="group/row">
                <TableCell className="sticky left-0 z-10 bg-card font-medium whitespace-nowrap group-hover/row:bg-muted">
                  {format.period(row.periodStart, row.periodEnd, groupBy)}
                  {row.periodEnd >= today && (
                    <span className="text-muted-foreground"> · {t("soFar")}</span>
                  )}
                </TableCell>
                {COLUMNS.map((column) => (
                  <TableCell
                    key={column}
                    className={cn(
                      "text-right whitespace-nowrap",
                      DEDUCTED.has(column) && "text-muted-foreground",
                      column === "profit" && "font-bold",
                      column === "profit" && row.profit < 0 && "text-tone-red-text",
                    )}
                  >
                    {cell(row, column)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            <TableRow className="border-t-2 bg-muted font-bold [tbody_&]:hover:bg-muted">
              <TableCell className="sticky left-0 z-10 bg-muted">{t("total")}</TableCell>
              {COLUMNS.map((column) => (
                <TableCell
                  key={column}
                  className={cn(
                    "text-right whitespace-nowrap",
                    column === "profit" && report.totals.profit < 0 && "text-tone-red-text",
                  )}
                >
                  {cell(report.totals, column)}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
