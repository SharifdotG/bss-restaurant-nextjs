"use client";

import { ArrowRightIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useOrderWhere } from "@/components/orders/order-bits";
import { OrderStatusPill } from "@/components/orders/order-status";
import { Panel } from "@/components/panel";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import type { OrderOut } from "@/lib/api/schema";
import { toPaisa, toTaka } from "@/lib/money";
import { PIPELINE, pipeline } from "@/lib/overview";
import { PAGE_PATHS } from "@/lib/permissions";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

/** Where every open order is right now, with the order numbers in each step. */
export function OpenOrdersPanel({
  orders,
  className,
}: {
  orders: OrderOut[] | undefined;
  className?: string;
}) {
  const t = useTranslations("overview.open");
  const format = useFormat();
  const where = useOrderWhere();
  const lanes = orders && pipeline(orders);
  const onTables = orders && toTaka(orders.reduce((sum, order) => sum + toPaisa(order.total), 0));

  return (
    <Panel
      className={className}
      title={t("title")}
      subtitle={
        orders
          ? orders.length
            ? t("sub", { n: orders.length, amount: format.money(onTables ?? 0) })
            : t("none")
          : " "
      }
      action={
        <Link
          href={PAGE_PATHS.orders}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-mr-2")}
        >
          {t("all")}
          <ArrowRightIcon />
        </Link>
      }
    >
      <ul className="-my-1 grid grid-cols-1">
        {PIPELINE.map((status) => {
          const lane = lanes?.[status];
          return (
            <li
              key={status}
              className="flex items-center gap-3 border-b border-border py-2.5 last:border-0"
            >
              <OrderStatusPill status={status} className="w-28 justify-start" />
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground tabular-nums">
                {lane ? (
                  lane
                    .map((order) => `${format.orderNo(order.orderNumber)} · ${where(order).title}`)
                    .join(",  ") || "—"
                ) : (
                  <Skeleton className="h-4 w-24" />
                )}
              </span>
              <span
                className={cn(
                  "w-6 text-right text-md font-bold tabular-nums",
                  lane?.length === 0 && "text-muted-foreground",
                )}
              >
                {lane && format.number(lane.length)}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
