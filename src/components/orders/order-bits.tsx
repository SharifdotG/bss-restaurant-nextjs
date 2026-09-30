"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { tablesQuery } from "@/lib/api/queries";
import type { OrderOut } from "@/lib/api/schema";
import { businessDate } from "@/lib/format";
import { isClosed } from "@/lib/permissions";
import { summarizeItems } from "@/lib/orders";
import { useFormat } from "@/lib/use-format";

type OrderLike = Pick<
  OrderOut,
  "orderType" | "source" | "table" | "customerName" | "items" | "itemCount"
>;

/** "T2" over "Ground floor · QR", or "Takeaway" over "Online · Tanvir". */
export function useOrderWhere() {
  const t = useTranslations("orders");
  const { data: tables } = useQuery(tablesQuery);
  const locations = new Map(tables?.map((table) => [table.id, table.location]));

  return (order: Pick<OrderOut, "orderType" | "source" | "table" | "customerName">) => {
    if (order.orderType === "takeaway" || !order.table) {
      const how = order.source === "staff" ? t("counter") : t(`sources.${order.source}`);
      return {
        title: t("takeaway"),
        detail: [how, order.customerName].filter(Boolean).join(" · "),
      };
    }
    const location = locations.get(order.table.id);
    const qr = order.source === "qr" ? t("sources.qr") : null;
    return { title: order.table.number, detail: [location, qr].filter(Boolean).join(" · ") };
  };
}

/** "Fuchka, Borhani ×2, +2 more" */
export function ItemsLine({ order, limit = 2 }: { order: OrderLike; limit?: number }) {
  const t = useTranslations("orders");
  const format = useFormat();
  const { shown, more } = summarizeItems(order.items, limit);
  const parts = shown.map((item) =>
    item.quantity > 1 ? `${item.foodName} ×${format.number(item.quantity)}` : item.foodName,
  );
  if (more) parts.push(t("more", { n: more }));
  return <>{parts.join(", ")}</>;
}

/** "Just now", "19 min", "1 h 14 min": how long something has waited. */
export function useWaitText() {
  const t = useTranslations("orders.wait");
  return (minutes: number) => {
    if (minutes < 1) return t("now");
    if (minutes < 60) return t("minutes", { m: minutes });
    return t("hours", { h: Math.floor(minutes / 60), m: minutes % 60 });
  };
}

/** The clock time it was placed, with the day in front when it wasn't today. */
export function PlacedAt({ value }: { value: string }) {
  const format = useFormat();
  const today = businessDate() === businessDate(value);
  return <>{today ? format.time(value) : `${format.shortDate(value)}, ${format.time(value)}`}</>;
}

/** Under the time: how long ago while it's open, when it was settled once it's closed. */
export function PlacedNote({
  order,
  now,
}: {
  order: Pick<OrderOut, "status" | "createdAt" | "closedAt">;
  now: number;
}) {
  const t = useTranslations("orders");
  const format = useFormat();
  if (isClosed(order) && order.closedAt) {
    return (
      <>
        {t(order.status === "paid" ? "paidAt" : "cancelledAt", {
          time: format.time(order.closedAt),
        })}
      </>
    );
  }
  return <>{format.relative(order.createdAt, now)}</>;
}
