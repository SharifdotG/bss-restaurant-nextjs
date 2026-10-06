"use client";

import dynamic from "next/dynamic";
import { useQueries } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { sourceCountQuery } from "@/lib/api/queries";
import { ORDER_SOURCES } from "@/lib/orders";
import { useFormat } from "@/lib/use-format";

const Donut = dynamic(() => import("@/components/charts/donut").then((m) => m.Donut), {
  ssr: false,
  loading: () => <DonutSkeleton />,
});

const COLORS = { staff: "var(--chart-1)", qr: "var(--chart-3)", online: "var(--chart-2)" };

/** Today's orders by how they came in: taken by staff, scanned at the table, or online. */
export function SourcesPanel({ today, className }: { today: string; className?: string }) {
  const t = useTranslations("overview.sources");
  const format = useFormat();
  const counts = useQueries({
    queries: ORDER_SOURCES.map((source) => sourceCountQuery(today, source)),
  }).map((query) => query.data);
  const ready = counts.every((count) => count !== undefined);
  const total = counts.reduce<number>((sum, count) => sum + (count ?? 0), 0);

  return (
    <Panel className={className} title={t("title")} subtitle={t("sub")}>
      {ready ? (
        <Donut
          total={format.number(total)}
          caption={t("caption", { n: total })}
          slices={ORDER_SOURCES.map((source, i) => ({
            key: source,
            label: t(source),
            value: counts[i] ?? 0,
            color: COLORS[source],
          }))}
        />
      ) : (
        <DonutSkeleton />
      )}
    </Panel>
  );
}

function DonutSkeleton() {
  return (
    <div className="grid gap-5">
      <Skeleton className="mx-auto size-44 rounded-full" />
      <Skeleton className="h-16 rounded-lg" />
    </div>
  );
}
