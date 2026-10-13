"use client";

import { ArmchairIcon, HandCoinsIcon, ReceiptIcon, WalletIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { KpiCard } from "@/components/stats/kpi-card";
import type { Dashboard } from "@/lib/api/schema";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

type OverviewKpisProps = {
  dashboard: Dashboard | undefined;
  /** Managers only: the same weekday last week, the whole day. */
  lastWeek?: { sales: number; day: number };
  /** Confirmed bookings starting within the hour. */
  bookingsSoon: number | undefined;
  className?: string;
};

/** Today in four numbers. No percentages: the API only knows whole days, not "this hour". */
export function OverviewKpis({ dashboard, lastWeek, bookingsSoon, className }: OverviewKpisProps) {
  const t = useTranslations("overview.kpis");
  const format = useFormat();
  const today = dashboard?.today;
  const tables = dashboard?.tables;

  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4", className)}>
      <KpiCard
        id="overview.sales"
        label={t("sales")}
        icon={WalletIcon}
        value={today?.sales}
        format={format.moneyWhole}
        note={
          lastWeek
            ? t("lastWeek", {
                weekday: format.weekdayName(lastWeek.day),
                amount: format.moneyWhole(lastWeek.sales),
              })
            : today && today.refunds > 0
              ? t("refunds", { amount: format.money(today.refunds) })
              : t("salesNote")
        }
      />
      <KpiCard
        id="overview.orders"
        label={t("orders")}
        icon={ReceiptIcon}
        value={dashboard?.ordersToday}
        format={(n) => format.number(Math.round(n))}
        note={
          dashboard &&
          t("ordersNote", {
            open: dashboard.openOrders.total,
            cancelled: dashboard.cancelledToday,
          })
        }
      />
      <KpiCard
        id="overview.average"
        label={t("average")}
        icon={HandCoinsIcon}
        value={today?.averageOrder}
        format={format.moneyWhole}
        note={today && t("averageNote", { n: today.orders })}
      />
      <KpiCard
        id="overview.tables"
        label={t("tables")}
        icon={ArmchairIcon}
        value={tables?.occupied}
        format={(n) => t("tablesValue", { used: Math.round(n), total: tables?.total ?? 0 })}
        note={
          bookingsSoon === undefined
            ? undefined
            : bookingsSoon > 0
              ? t("bookingsSoon", { n: bookingsSoon })
              : t("tablesFree", { n: tables?.free ?? 0 })
        }
      />
    </div>
  );
}
