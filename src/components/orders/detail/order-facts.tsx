"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tablesQuery, waitersQuery } from "@/lib/api/queries";
import type { OrderDetailOut } from "@/lib/api/schema";
import { useFormat } from "@/lib/use-format";
import { useUpdateOrder } from "@/lib/use-order-actions";

type OrderFactsProps = { order: OrderDetailOut; canReassign: boolean };

/** Where, how and who, then the money so far. Managers can hand the table to someone else. */
export function OrderFacts({ order, canReassign }: OrderFactsProps) {
  const t = useTranslations("orders");
  const format = useFormat();
  const { data: tables } = useQuery(tablesQuery);
  const table = tables?.find((candidate) => candidate.id === order.table?.id);

  const rows: [string, React.ReactNode][] = [];
  if (order.table) {
    rows.push([
      t("columns.table"),
      [order.table.number, table?.location, table && t("detail.seats", { n: table.seats })]
        .filter(Boolean)
        .join(" · "),
    ]);
  }
  rows.push([t("detail.type"), t(`types.${order.orderType}`)]);
  rows.push([t("filters.source"), t(`sources.${order.source}`)]);
  rows.push([
    t("columns.waiter"),
    canReassign ? <WaiterPicker order={order} /> : (order.waiter?.fullName ?? "–"),
  ]);
  if (order.customerName) rows.push([t("detail.customer"), order.customerName]);
  if (order.customerPhone) {
    rows.push([
      t("detail.phone"),
      <a key="phone" href={`tel:${order.customerPhone}`} className="hover:underline">
        {order.customerPhone}
      </a>,
    ]);
  }
  if (order.notes) rows.push([t("detail.notes"), order.notes]);
  rows.push([t("detail.paidSoFar"), format.money(order.amountPaid)]);

  return (
    <section className="rounded-xl bg-card p-5 shadow-md sm:p-6">
      <h2 className="text-lg font-bold">{t("detail.details")}</h2>
      <dl className="mt-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex min-h-9 items-center justify-between gap-4 py-1">
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 text-right font-medium text-pretty">{value}</dd>
          </div>
        ))}
        <div className="mt-1 flex items-center justify-between gap-4 border-t border-border pt-3">
          <dt className="font-bold">{t("detail.balanceDue")}</dt>
          <dd className="text-md font-bold tabular-nums">{format.money(order.balanceDue)}</dd>
        </div>
      </dl>
    </section>
  );
}

function WaiterPicker({ order }: { order: OrderDetailOut }) {
  const t = useTranslations("orders");
  const { data: waiters = [] } = useQuery(waitersQuery);
  const update = useUpdateOrder();
  const options = waiters.map((waiter) => ({ value: waiter.id, label: waiter.fullName }));
  // Someone no longer on the waiter list still shows by name.
  const current = order.waiter;
  if (current && !options.some((option) => option.value === current.id)) {
    options.unshift({ value: current.id, label: current.fullName });
  }

  return (
    <Select
      value={order.waiter?.id ?? null}
      onValueChange={(waiterId) => waiterId && update.mutate({ order, changes: { waiterId } })}
      items={options}
      disabled={update.isPending}
    >
      <SelectTrigger
        className="-mr-1 h-9 border-transparent bg-transparent shadow-none"
        aria-label={t("detail.changeWaiter")}
      >
        <SelectValue placeholder={t("detail.noWaiter")} />
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
