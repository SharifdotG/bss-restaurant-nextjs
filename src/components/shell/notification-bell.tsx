"use client";

import { useState, useSyncExternalStore } from "react";
import {
  BellRingingIcon,
  BellSimpleIcon,
  CalendarDotsIcon,
  ChefHatIcon,
  QrCodeIcon,
  type Icon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link } from "@/i18n/navigation";
import { shortOrderNumber } from "@/lib/format";
import { useLiveOrders, useLiveReservations } from "@/lib/live/store";
import type { LiveOrder } from "@/lib/live/types";
import { notices, type Notice } from "@/lib/notifications";
import { PAGE_PATHS } from "@/lib/permissions";
import { useSession } from "@/lib/session/client";
import { useFormat } from "@/lib/use-format";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

// Seen notices are remembered for the tab, so a reload doesn't light the dot up again.
const SEEN_KEY = "bss-seen-notices";
let seen: Set<string> | null = null;
const seenListeners = new Set<() => void>();

function seenSet() {
  if (seen) return seen;
  try {
    seen = new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]"));
  } catch {
    seen = new Set();
  }
  return seen;
}

function markSeen(keys: string[]) {
  const next = new Set(keys);
  seen = next;
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...next]));
  } catch {
    // Not remembered, still cleared for now.
  }
  seenListeners.forEach((listener) => listener());
}

const useSeen = () =>
  useSyncExternalStore(
    (listener) => {
      seenListeners.add(listener);
      return () => {
        seenListeners.delete(listener);
      };
    },
    seenSet,
    () => null,
  );

const ICONS: Record<Notice["kind"], Icon> = {
  incoming: QrCodeIcon,
  toCook: ChefHatIcon,
  ready: BellRingingIcon,
  request: CalendarDotsIcon,
};

// Guest orders and food to serve open the order itself; the chef works from the board.
const href = (notice: Notice) => {
  switch (notice.kind) {
    case "incoming":
    case "ready":
      return `${PAGE_PATHS.orders}/${notice.order.id}`;
    case "toCook":
      return PAGE_PATHS.kitchen;
    case "request":
      return PAGE_PATHS.reservations;
  }
};

/** Live items waiting on this person: guest orders, booking requests, food to serve. */
export function NotificationBell({ className }: { className?: string }) {
  const t = useTranslations("shell.bell");
  const session = useSession();
  const orders = useLiveOrders();
  const reservations = useLiveReservations();
  const seenKeys = useSeen();
  const [open, setOpen] = useState(false);
  if (session.status !== "authenticated") return null;

  const list = notices(session.user.role, orders, reservations);
  const unread = seenKeys !== null && list.some((notice) => !seenKeys.has(notice.key));

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Everything on screen counts as seen; anything new after this lights the dot again.
        if (next) markSeen(list.map((notice) => notice.key));
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn("relative shrink-0", className)}
            aria-label={unread ? t("labelUnread") : t("label")}
          />
        }
      >
        <BellSimpleIcon weight="duotone" />
        {unread && (
          <span
            aria-hidden
            className="absolute top-2 right-2 size-2 rounded-full bg-primary ring-2 ring-background"
          />
        )}
      </PopoverTrigger>
      <PopoverContent>
        <div className="border-b border-border px-5 pt-4 pb-3">
          <PopoverTitle>{t("title")}</PopoverTitle>
          <PopoverDescription>
            {list.length ? t("count", { n: list.length }) : t("empty")}
          </PopoverDescription>
        </div>
        {list.length > 0 && (
          <ul className="max-h-[360px] overflow-y-auto p-1.5">
            {list.map((notice) => (
              <li key={notice.key}>
                <NoticeRow notice={notice} onOpen={() => setOpen(false)} />
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

function NoticeRow({ notice, onOpen }: { notice: Notice; onOpen: () => void }) {
  const t = useTranslations("shell.bell");
  const format = useFormat();
  const now = useNow(30_000);
  const Icon = ICONS[notice.kind];

  const where = (order: LiveOrder) => (order.table ? order.table.number : t("takeaway"));
  const title =
    notice.kind === "request"
      ? t("request", {
          name: notice.reservation.customerName,
          guests: notice.reservation.partySize,
          time: format.time(notice.reservation.startsAt),
        })
      : t(notice.kind, {
          number: format.number(Number(shortOrderNumber(notice.order.orderNumber))),
          where: where(notice.order),
        });

  return (
    <Link
      href={href(notice)}
      onClick={onOpen}
      className="flex items-start gap-3 rounded-md px-3 py-2.5 outline-none hover:bg-foreground/6 focus-visible:bg-foreground/6"
    >
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-primary-soft text-primary-soft-foreground">
        <Icon weight="duotone" className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">
          {notice.kind === "ready" && !notice.order.table
            ? t("readyTakeawayHint")
            : t(`${notice.kind}Hint`)}
          {" · "}
          {format.relative(notice.at, now)}
        </span>
      </span>
    </Link>
  );
}
