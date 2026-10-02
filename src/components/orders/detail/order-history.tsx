"use client";

import { useTranslations } from "next-intl";
import type { OrderDetailOut } from "@/lib/api/schema";
import { STATUS_LOOK } from "@/lib/orders";
import { TONES } from "@/lib/tones";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

/** Who moved the order on and when, newest first. */
export function OrderHistory({ order }: { order: OrderDetailOut }) {
  const t = useTranslations("orders.detail");
  const format = useFormat();
  const events = order.history.toSorted(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );

  return (
    <section className="rounded-xl bg-card p-5 shadow-md sm:p-6">
      <h2 className="text-lg font-bold">{t("history")}</h2>
      <ol className="mt-4">
        {events.map((event, i) => {
          const { tone, icon: Icon } = STATUS_LOOK[event.toStatus];
          const who =
            event.changedBy?.fullName ??
            (event.toStatus === "pending" && order.source !== "staff"
              ? t(`guestVia.${order.source}`)
              : null);
          return (
            <li
              key={`${event.toStatus}-${event.createdAt}`}
              className="relative flex gap-3.5 pb-5 last:pb-0"
            >
              {i < events.length - 1 && (
                <span aria-hidden className="absolute top-10 bottom-1 left-[17px] w-px bg-border" />
              )}
              <span
                className={cn("grid size-9 shrink-0 place-items-center rounded-lg", TONES[tone])}
              >
                <Icon weight="duotone" className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-bold">
                    {event.toStatus === "pending"
                      ? t("event.placed")
                      : t(`event.${event.toStatus}`)}
                  </p>
                  <time className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {format.time(event.createdAt)}
                  </time>
                </div>
                {who && <p className="text-sm text-muted-foreground">{who}</p>}
                {event.note && (
                  <p className="mt-1 rounded-md bg-muted px-2.5 py-1.5 text-sm text-pretty">
                    {event.note}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
