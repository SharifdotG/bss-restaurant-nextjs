"use client";

import { useEffect, useRef, useState } from "react";
import { ReceiptIcon, ShoppingBagIcon } from "@phosphor-icons/react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/empty-state";
import { useWaitText } from "@/components/orders/order-bits";
import { Pill } from "@/components/ui/pill";
import type { OrderOut } from "@/lib/api/schema";
import type { BillQueue } from "@/lib/billing";
import { useLiveSynced } from "@/lib/live/store";
import type { LiveOrder } from "@/lib/live/types";
import { listItem } from "@/lib/motion";
import { minutesSince } from "@/lib/orders";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

type BillQueueProps = {
  queue: BillQueue;
  paid: OrderOut[] | undefined;
  selected: number | null;
  onSelect: (id: number) => void;
  now: number;
};

/** Bills down the left of the desk: waiting first, then cooking, then what's settled today. */
export function BillQueueList({ queue, paid, selected, onSelect, now }: BillQueueProps) {
  const t = useTranslations("billing");
  const fresh = useFreshBills(queue.waiting);
  const row = (order: LiveOrder | OrderOut, extra?: Partial<BillRowProps>) => (
    <BillRow
      key={order.id}
      order={order}
      now={now}
      active={order.id === selected}
      onSelect={onSelect}
      fresh={fresh.has(order.id)}
      {...extra}
    />
  );
  // A prepaid takeaway shows once, at the top of "Paid today", until the API closes it.
  const settled = [
    ...queue.prepaid.map((order) => row(order, { prepaid: true })),
    ...(paid ?? []).map((order) => row(order)),
  ];

  return (
    <div className="flex flex-col gap-6">
      <Group title={t("groups.waiting")} count={queue.waiting.length}>
        {queue.waiting.length === 0 ? (
          <EmptyState icon={ReceiptIcon} tone="slate" title={t("emptyTitle")} className="py-8">
            {t("empty")}
          </EmptyState>
        ) : (
          queue.waiting.map((order) => row(order))
        )}
      </Group>

      {queue.kitchen.length > 0 && (
        <Group title={t("groups.kitchen")} count={queue.kitchen.length} hint={t("kitchenHint")}>
          {queue.kitchen.map((order) => row(order))}
        </Group>
      )}

      <Group title={t("groups.paid")} count={settled.length}>
        {settled.length === 0 ? (
          <li className="px-1 py-2 text-sm text-muted-foreground">{t("nonePaid")}</li>
        ) : (
          settled
        )}
      </Group>
    </div>
  );
}

function Group({
  title,
  count,
  hint,
  children,
}: {
  title: string;
  count: number;
  hint?: string;
  children: React.ReactNode;
}) {
  const format = useFormat();
  return (
    <section>
      <h2 className="flex items-baseline gap-2 px-1 text-sm font-bold">
        {title}
        <span className="font-medium text-muted-foreground tabular-nums">
          {format.number(count)}
        </span>
      </h2>
      {hint && <p className="px-1 text-xs text-muted-foreground">{hint}</p>}
      <ul className="mt-2.5 flex flex-col gap-2">
        <AnimatePresence initial={false} mode="popLayout">
          {children}
        </AnimatePresence>
      </ul>
    </section>
  );
}

type BillRowProps = {
  order: LiveOrder | OrderOut;
  now: number;
  active: boolean;
  fresh: boolean;
  prepaid?: boolean;
  onSelect: (id: number) => void;
};

function BillRow({ order, now, active, fresh, prepaid, onSelect }: BillRowProps) {
  const t = useTranslations("billing");
  const tOrders = useTranslations("orders");
  const format = useFormat();
  const wait = useWaitText();
  const closed = order.status === "paid";
  const settled = closed || prepaid;
  const partPaid = !settled && order.balanceDue < order.total;
  const who = order.waiter?.fullName.split(" ")[0] ?? order.customerName;

  return (
    <m.li {...listItem}>
      <button
        type="button"
        onClick={() => onSelect(order.id)}
        aria-current={active || undefined}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg bg-card p-3 text-left shadow-sm ring-primary transition-[box-shadow,background-color] duration-(--duration-fast) ease-standard outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/40 aria-current:ring-2",
          fresh && "animate-ticket-flash motion-reduce:animate-none",
        )}
      >
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-md text-sm font-bold",
            settled
              ? "bg-tone-slate-subtle text-tone-slate-text"
              : "bg-primary-soft text-primary-soft-foreground",
          )}
        >
          {order.table ? (
            order.table.number
          ) : (
            <ShoppingBagIcon weight="duotone" className="size-5" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">
            {tOrders("orderN", { n: format.orderNo(order.orderNumber) })}
          </span>
          <span className="block truncate text-sm text-muted-foreground">
            {prepaid
              ? t("notServed")
              : [
                  who,
                  closed ? format.time(closedAt(order)) : wait(minutesSince(order.createdAt, now)),
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-bold tabular-nums">
            {format.money(settled ? order.total : order.balanceDue)}
          </span>
          {settled ? (
            <Pill tone={prepaid ? "green" : "slate"}>{t("bill.settled")}</Pill>
          ) : (
            partPaid && (
              <span className="text-xs font-bold text-tone-green-text tabular-nums">
                {t("paidPart", { amount: format.money(order.total - order.balanceDue) })}
              </span>
            )
          )}
        </span>
      </button>
    </m.li>
  );
}

// Live orders are never closed, so only list rows carry closedAt.
const closedAt = (order: LiveOrder | OrderOut) =>
  ("closedAt" in order && order.closedAt) || order.updatedAt;

/**
 * Bills that just became due, so their rows can flash once. What's waiting when the page
 * opens isn't news.
 */
function useFreshBills(waiting: LiveOrder[]) {
  const synced = useLiveSynced();
  const known = useRef<Set<number> | null>(null);
  const [fresh, setFresh] = useState<ReadonlySet<number>>(new Set());
  const ids = waiting.map((order) => order.id).join();

  useEffect(() => {
    if (!synced) return;
    const current = new Set(ids ? ids.split(",").map(Number) : []);
    const seen = known.current;
    known.current = current;
    if (!seen) return;
    const added = [...current].filter((id) => !seen.has(id));
    if (added.length === 0) return;
    setFresh(new Set(added));
    const timer = setTimeout(() => setFresh(new Set()), 3000);
    return () => clearTimeout(timer);
  }, [ids, synced]);

  return fresh;
}
