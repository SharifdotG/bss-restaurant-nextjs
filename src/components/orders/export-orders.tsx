"use client";

import { useTranslations } from "next-intl";
import { csvName, DownloadButton } from "@/components/download-button";
import { api, unwrap } from "@/lib/api/client";
import { rangeDates, type DateRange } from "@/lib/orders";

/** Managers only: the paid and cancelled orders in the chosen dates, one row each. */
export function ExportOrders({ range }: { range: DateRange }) {
  const t = useTranslations("orders.export");

  return (
    <DownloadButton
      label={t("button")}
      fetchFile={async () => {
        // Without dates the API exports this month, so "any date" is named for what it gets.
        const dates = rangeDates(range === "any" ? "month" : range) as {
          dateFrom: string;
          dateTo: string;
        };
        const blob = await unwrap(
          api.GET("/api/v1/reports/orders.csv", { params: { query: dates }, parseAs: "blob" }),
        );
        return { blob: blob as Blob, filename: csvName("orders", dates.dateFrom, dates.dateTo) };
      }}
    />
  );
}
