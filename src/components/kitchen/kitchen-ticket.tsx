"use client";

import { CheckIcon, TimerIcon, type Icon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { useWaitText } from "@/components/orders/order-bits";
import { useTicket, toggleLine } from "@/lib/kitchen-tickets";
import { ticketLines, type KitchenColumn, type TicketClock } from "@/lib/kitchen";
import type { LiveOrder } from "@/lib/live/types";
import { STATUS_LOOK } from "@/lib/orders";
import { TONES } from "@/lib/tones";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

type KitchenTicketProps = {
  order: LiveOrder;
  column: KitchenColumn;
  clock: TicketClock;
  /** The next step, when this person may take it. */
  action?: { label: string; icon: Icon; onClick: () => void; busy: boolean };
};

/** One order as the kitchen reads it: big number, where it goes, what to cook, how long it's been. */
export function KitchenTicket({ order, column, clock, action }: KitchenTicketProps) {
  const t = useTranslations("kitchen");
  const orders = useTranslations("orders");
  const format = useFormat();
  const wait = useWaitText();
  const ticket = useTicket(order.id);
  const look = STATUS_LOOK[column.status];
  const StateIcon = look.icon;
  const cooking = column.key === "cooking";
  const lines = ticketLines(order.items, cooking ? ticket?.started : undefined);
  const canTick = column.key !== "ready";

  const takeaway = order.orderType === "takeaway" || !order.table;
  const who =
    order.source === "staff"
      ? order.waiter?.fullName.split(" ")[0]
      : (order.customerName ?? orders("guest"));
  // The title already says takeaway; the line under it says where it came from.
  const how =
    order.source !== "staff"
      ? orders(`sources.${order.source}`)
      : takeaway
        ? orders("counter")
        : orders("types.dine_in");

  return (
    <article
      aria-label={t("ticketLabel", { n: format.orderNo(order.orderNumber) })}
      // A fresh addition makes the ticket glow once; the key restarts it for the next one.
      key={ticket?.addedAt}
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        cooking && ticket?.addedAt && "animate-ticket-flash motion-reduce:animate-none",
      )}
    >
      <header className={cn("flex items-center gap-3 px-4 py-3", TONES[column.tone])}>
        <span className="text-4xl leading-none font-bold tabular-nums">
          {format.orderNo(order.orderNumber)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-bold">
            {takeaway ? orders("takeaway") : order.table?.number}
          </p>
          <p className="truncate text-2xs font-bold tracking-wide uppercase opacity-85">
            {[how, who].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold">
          <StateIcon weight="duotone" className="size-4" />
          {t(`state.${column.key}`)}
        </span>
      </header>

      <ul className="flex flex-col gap-0.5 p-2">
        {lines.map((line) => {
          const ticked = canTick && ticket?.ticked.includes(line.key);
          return (
            <li key={line.key}>
              <button
                type="button"
                disabled={!canTick}
                aria-pressed={canTick ? !!ticked : undefined}
                onClick={() => toggleLine(order.id, line.key)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg px-2 py-1.5 text-left transition-colors duration-(--duration-fast) outline-none focus-visible:ring-3 focus-visible:ring-ring/40 enabled:hover:bg-muted",
                  ticked && "text-muted-foreground",
                )}
              >
                <span className="w-7 shrink-0 text-xl font-bold tabular-nums">
                  {format.number(line.quantity)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span
                      className={cn(
                        "text-xl font-medium decoration-2 transition-[text-decoration-color]",
                        ticked && "line-through",
                      )}
                    >
                      {line.foodName}
                    </span>
                    {line.added > 0 && <Pill tone="orange">{t("added", { n: line.added })}</Pill>}
                  </span>
                  {line.notes && (
                    <span className="mt-0.5 block text-base font-medium text-tone-orange-text">
                      {line.notes}
                    </span>
                  )}
                </span>
                {ticked && <CheckIcon weight="bold" className="mt-1.5 size-4 shrink-0" />}
              </button>
            </li>
          );
        })}
      </ul>

      {order.notes && (
        <p className="mx-4 mb-3 rounded-lg bg-muted px-3 py-2 text-base text-pretty">
          {order.notes}
        </p>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 px-4 pb-4">
        <Pill tone={clock.tone} icon={TimerIcon} className="h-8 px-3 text-sm">
          {column.key !== "ready"
            ? wait(clock.minutes)
            : clock.minutes < 1
              ? t("readyNow")
              : t("readyFor", { time: wait(clock.minutes) })}
        </Pill>
        {action && (
          <Button
            onClick={action.onClick}
            disabled={action.busy}
            className="ml-auto h-14 min-w-32 gap-2.5 rounded-lg px-6 text-lg font-bold [&_svg:not([class*='size-'])]:size-6"
          >
            <action.icon weight="duotone" />
            {action.label}
          </Button>
        )}
      </footer>
    </article>
  );
}
