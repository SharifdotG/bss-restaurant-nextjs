"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardQuery } from "@/lib/api/queries";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

/** Today's sales at a glance. The live feed keeps the dashboard query fresh. */
export function TakingsStrip({ className }: { className?: string }) {
  const t = useTranslations("billing.takings");
  const format = useFormat();
  const { data, isPending, isError } = useQuery(dashboardQuery);
  if (isError) return null;
  const today = data?.today;

  return (
    <section
      aria-label={t("label")}
      className={cn("rounded-xl bg-card px-4 py-3.5 shadow-sm", className)}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold text-muted-foreground">{t("label")}</h2>
        {today ? (
          <p className="text-xs text-muted-foreground">{t("orders", { n: today.orders })}</p>
        ) : (
          isPending && <Skeleton className="h-3.5 w-20" />
        )}
      </div>
      <dl className="mt-1.5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <dt className="sr-only">{t("sales")}</dt>
          <dd className="text-2xl leading-tight font-bold tracking-tight tabular-nums">
            {today ? format.money(today.sales) : <Skeleton className="h-7 w-32" />}
          </dd>
        </div>
        <div className="text-right">
          <dt className="text-xs text-muted-foreground">{t("refunds")}</dt>
          <dd
            className={cn(
              "text-sm font-bold tabular-nums",
              today && today.refunds > 0 && "text-tone-red-text",
            )}
          >
            {today ? format.money(today.refunds) : <Skeleton className="ml-auto h-4 w-14" />}
          </dd>
        </div>
      </dl>
    </section>
  );
}
