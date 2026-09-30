"use client";

import {
  ArmchairIcon,
  CalendarCheckIcon,
  CheckCircleIcon,
  HandCoinsIcon,
  TimerIcon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useWaitText } from "@/components/orders/order-bits";
import { OrderStatusPill } from "@/components/orders/order-status";
import { Pill } from "@/components/ui/pill";
import { Link } from "@/i18n/navigation";
import type { FloorTable } from "@/lib/floor";
import { shortOrderNumber } from "@/lib/format";
import { ageTone, minutesSince } from "@/lib/orders";
import { PAGE_PATHS } from "@/lib/permissions";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

type TableTileProps = { entry: FloorTable; now: number; canStart: boolean };

/** One table at a glance. Busy tables open their order; free ones start a new order there. */
export function TableTile({ entry, now, canStart }: TableTileProps) {
  const t = useTranslations("floor");
  const format = useFormat();
  const wait = useWaitText();
  const { table, state } = entry;

  let pill: React.ReactNode;
  let line: React.ReactNode;
  let note: React.ReactNode;
  let chip: React.ReactNode = null;
  let href: string | null = null;

  if (state.kind === "order") {
    const { order } = state;
    const minutes = minutesSince(order.createdAt, now);
    const owing = order.amountPaid > 0 && order.balanceDue > 0;
    pill =
      order.status === "served" ? (
        <Pill tone="green" icon={HandCoinsIcon}>
          {t("billDue")}
        </Pill>
      ) : (
        <OrderStatusPill status={order.status} />
      );
    line = (
      <>
        <span>{t("order", { n: shortOrderNumber(order.orderNumber) })}</span>
        <span className="tabular-nums">
          {owing ? t("due", { amount: format.money(order.balanceDue) }) : format.money(order.total)}
        </span>
      </>
    );
    note =
      order.waiter?.fullName.split(" ")[0] ??
      (order.source === "qr" ? t("qrGuest") : t("noWaiter"));
    chip = (
      <Pill tone={ageTone(minutes)} icon={TimerIcon}>
        {wait(minutes)}
      </Pill>
    );
    href = `${PAGE_PATHS.orders}/${order.id}`;
  } else if (state.kind === "booked") {
    const { booking } = state;
    const minutes = Math.round((Date.parse(booking.startsAt) - now) / 60_000);
    pill = (
      <Pill tone="green" icon={CalendarCheckIcon}>
        {t("bookedAt", { time: format.time(booking.startsAt) })}
      </Pill>
    );
    line = (
      <span className="truncate">
        {t("party", { name: booking.customerName, n: booking.partySize })}
      </span>
    );
    note = booking.status === "seated" ? t("seated") : t("arriving");
    if (booking.status !== "seated") {
      chip = (
        <Pill tone={minutes < 0 ? "amber" : "slate"} icon={TimerIcon}>
          {minutes < 0 ? t("late", { time: wait(-minutes) }) : t("inTime", { time: wait(minutes) })}
        </Pill>
      );
    }
    if (canStart) href = `${PAGE_PATHS.newOrder}?table=${table.id}`;
  } else {
    pill = (
      <Pill tone="slate" icon={CheckCircleIcon}>
        {t("free")}
      </Pill>
    );
    line = <span className="text-muted-foreground">{t("noOrder")}</span>;
    note = state.laterBooking
      ? t("bookedFrom", { time: format.time(state.laterBooking.startsAt) })
      : canStart
        ? t("tapToStart")
        : null;
    if (canStart) href = `${PAGE_PATHS.newOrder}?table=${table.id}`;
  }

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-2xl leading-none font-bold tracking-tight">{table.number}</p>
        <span className="flex items-center gap-1 text-sm font-bold text-muted-foreground tabular-nums">
          <ArmchairIcon weight="duotone" className="size-4" aria-hidden />
          <span className="sr-only">{t("seats")}</span>
          {format.number(table.seats)}
        </span>
      </div>
      <div className="mt-3">{pill}</div>
      <p className="mt-2.5 flex justify-between gap-2 text-sm font-bold">{line}</p>
      <div className="mt-2 flex min-h-6 flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="min-w-0 truncate text-xs text-muted-foreground">{note}</span>
        {chip}
      </div>
    </>
  );

  const className = cn(
    "block rounded-xl bg-card p-4 shadow-sm transition-[box-shadow,transform] duration-(--duration-fast) outline-none",
    href && "hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/40 active:scale-[0.99]",
  );

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
