"use client";

import { useTranslations } from "next-intl";
import { csvName, DownloadButton } from "@/components/download-button";
import { api, unwrap } from "@/lib/api/client";
import type { DayRange } from "@/lib/reports";

export type ReportFile = "sales" | "top-foods" | "expenses" | "staff" | "orders";

type ReportCsvProps = {
  file: ReportFile;
  range: DayRange;
  /** Extra filters the report takes, e.g. groupBy for sales. */
  query?: Record<string, string | number>;
  label?: string;
  variant?: "outline" | "ghost";
  size?: "default" | "sm";
};

/** One report as a spreadsheet, for the same dates as the screen. */
export function ReportCsv({ file, range, query, label, variant, size }: ReportCsvProps) {
  const t = useTranslations("reports");

  return (
    <DownloadButton
      label={label ?? t("csv")}
      variant={variant}
      size={size}
      fetchFile={async () => {
        // All five CSV routes take the same dates; the cast keeps one call for them.
        const blob = await unwrap(
          api.GET(`/api/v1/reports/${file}.csv` as "/api/v1/reports/sales.csv", {
            params: { query: { dateFrom: range.from, dateTo: range.to, ...query } },
            parseAs: "blob",
          }),
        );
        return { blob: blob as Blob, filename: csvName(file, range.from, range.to) };
      }}
    />
  );
}
