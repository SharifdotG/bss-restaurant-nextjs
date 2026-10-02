"use client";

import {
  ForkKnifeIcon,
  PencilSimpleIcon,
  QrCodeIcon,
  ShoppingBagIcon,
  TimerIcon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, initials } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Link } from "@/i18n/navigation";
import type { OrderOut } from "@/lib/api/schema";
import { ageTone, forwardMove, minutesSince, STATUS_LOOK } from "@/lib/orders";
import { orderMoves } from "@/lib/permissions";
import { useSession } from "@/lib/session/client";
import { useFormat } from "@/lib/use-format";
import { useOrderStatus } from "@/lib/use-order-actions";
import { useOrderWhere, useWaitText } from "./order-bits";

const SHOWN_LINES = 3;

/** A board card: what's on the order, who has it, how long it's waited, and the next step. */
export function OrderCard({ order, now }: { order: OrderOut; now: number }) {
  const t = useTranslations("orders");
  const format = useFormat();
  const where = useOrderWhere()(order);
  const wait = useWaitText();
  const session = useSession();
  const move = useOrderStatus();

  const role = session.status === "authenticated" ? session.user.role : null;
  const next = role ? forwardMove(orderMoves(role, order)) : null;
  const n = format.orderNo(order.orderNumber);
  const lines = order.items.slice(0, SHOWN_LINES);
  const rest = order.items.slice(SHOWN_LINES);
  const restTotal = rest.reduce((sum, item) => sum + item.lineTotal, 0);
  const restCount = rest.reduce((sum, item) => sum + item.quantity, 0);

  // Waiting and cooking count from when it was placed; ready and served from the last change.
  const since =
    order.status === "ready" || order.status === "served" ? order.updatedAt : order.createdAt;
  const minutes = minutesSince(since, now);
  const PlaceIcon =
    order.orderType === "takeaway"
      ? ShoppingBagIcon
      : order.source === "qr"
        ? QrCodeIcon
        : ForkKnifeIcon;
  const NextIcon = next ? STATUS_LOOK[next].icon : null;

  return (
    <article className="relative rounded-xl bg-card p-4 shadow-sm transition-shadow duration-(--duration-fast) hover:shadow-md">
      <Link
        href={`/orders/${order.id}`}
        className="block text-md font-bold outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/40"
      >
        {t("orderN", { n })}
      </Link>
      <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
        <PlaceIcon weight="duotone" className="size-3.5 shrink-0" />
        <span className="truncate">{[where.title, where.detail].filter(Boolean).join(" · ")}</span>
      </p>

      <ul className="mt-3 grid gap-1.5 text-sm">
        {lines.map((item) => (
          <li key={item.id}>
            <div className="flex gap-2">
              <span className="w-6 shrink-0 text-muted-foreground tabular-nums">
                {format.number(item.quantity)}×
              </span>
              <span className="min-w-0 flex-1 truncate">{item.foodName}</span>
              <span className="text-muted-foreground tabular-nums">
                {format.money(item.lineTotal)}
              </span>
            </div>
            {item.notes && (
              <p className="ml-8 flex items-center gap-1 text-xs font-medium text-tone-orange-text">
                <PencilSimpleIcon weight="duotone" className="size-3 shrink-0" />
                <span className="truncate">{item.notes}</span>
              </p>
            )}
          </li>
        ))}
        {rest.length > 0 && (
          <li className="flex gap-2 text-muted-foreground">
            <span className="w-6 shrink-0 tabular-nums">+{format.number(restCount)}</span>
            <span className="flex-1">{t("moreItems")}</span>
            <span className="tabular-nums">{format.money(restTotal)}</span>
          </li>
        )}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Avatar className="size-7">
          <AvatarFallback className="text-2xs">
            {order.waiter ? initials(order.waiter.fullName) : t(`sourceBadge.${order.source}`)}
          </AvatarFallback>
        </Avatar>
        <Pill tone={ageTone(minutes)} icon={TimerIcon} className="font-semibold">
          {order.status === "ready" ? t("readyFor", { time: wait(minutes) }) : wait(minutes)}
        </Pill>
        <span className="ml-auto text-md font-bold tabular-nums">{format.money(order.total)}</span>
      </div>

      {next && NextIcon && (
        <Button
          variant="soft"
          size="sm"
          className="relative z-10 mt-3 w-full"
          disabled={move.isPending}
          onClick={() => move.mutate({ order, status: next })}
          aria-label={t("moveOrder", { move: t(`moves.${next}`), n })}
        >
          <NextIcon weight="duotone" />
          {t(`moves.${next}`)}
        </Button>
      )}
    </article>
  );
}
