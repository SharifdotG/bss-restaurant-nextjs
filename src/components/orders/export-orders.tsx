"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, unwrap } from "@/lib/api/client";
import { useErrorText } from "@/lib/api/use-error-text";
import { rangeDates, type DateRange } from "@/lib/orders";

/** The CSV needs the bearer token, so it's fetched here and saved from a blob URL. */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Managers only: the paid and cancelled orders in the chosen dates, one row each. */
export function ExportOrders({ range }: { range: DateRange }) {
  const t = useTranslations("orders.export");
  const errorText = useErrorText();

  const download = useMutation({
    mutationFn: async () => {
      // Without dates the API exports this month, so "any date" is named for what it gets.
      const dates = rangeDates(range === "any" ? "month" : range) as {
        dateFrom: string;
        dateTo: string;
      };
      const blob = await unwrap(
        api.GET("/api/v1/reports/orders.csv", { params: { query: dates }, parseAs: "blob" }),
      );
      const span =
        dates.dateFrom === dates.dateTo ? dates.dateFrom : `${dates.dateFrom}-to-${dates.dateTo}`;
      saveBlob(blob as Blob, `orders-${span}.csv`);
    },
    onError: (error) => toast.error(t("failed"), { description: errorText.message(error) }),
  });

  return (
    <Button variant="outline" disabled={download.isPending} onClick={() => download.mutate()}>
      <DownloadSimpleIcon />
      {download.isPending ? t("working") : t("button")}
    </Button>
  );
}
