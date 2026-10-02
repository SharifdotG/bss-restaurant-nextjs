"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { OrderOut } from "@/lib/api/schema";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";
import { ItemsLine, PlacedAt, useOrderWhere } from "./order-bits";
import { OrderStatusPill } from "./order-status";

/** Phones list orders as cards: the number and status first, the money last. */
export function OrderListCard({ order }: { order: OrderOut }) {
  const t = useTranslations("orders");
  const format = useFormat();
  const place = useOrderWhere()(order);

  return (
    <Link
      href={`/orders/${order.id}`}
      className="block rounded-xl bg-card p-4 shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40 active:bg-foreground/[0.03]"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate">
          <span className="text-lg font-bold tabular-nums">
            {format.orderNo(order.orderNumber)}
          </span>
          <span className="ml-2 text-sm text-muted-foreground">
            {[place.title, place.detail].filter(Boolean).join(" · ")}
          </span>
        </p>
        <OrderStatusPill status={order.status} />
      </div>
      <p className="mt-1 truncate text-sm">
        {t("itemCount", { n: order.itemCount })} · <ItemsLine order={order} />
      </p>
      <div className="mt-1.5 flex items-end justify-between gap-3">
        <p className="truncate text-sm text-muted-foreground">
          <PlacedAt value={order.createdAt} /> · {order.waiter?.fullName ?? t("guest")}
        </p>
        <p
          className={cn(
            "text-md font-bold tabular-nums",
            order.status === "cancelled" && "text-muted-foreground line-through",
          )}
        >
          {format.money(order.total)}
        </p>
      </div>
    </Link>
  );
}
