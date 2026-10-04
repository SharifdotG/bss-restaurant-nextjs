"use client";

import { useState } from "react";
import {
  ArrowRightIcon,
  CheckIcon,
  GlobeSimpleIcon,
  QrCodeIcon,
  TrayIcon,
} from "@phosphor-icons/react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useTranslations } from "next-intl";
import { CancelOrderDialog } from "@/components/orders/cancel-order-dialog";
import { useWaitText } from "@/components/orders/order-bits";
import { EmptyState } from "@/components/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import type { UserRole } from "@/lib/api/schema";
import type { LiveOrder } from "@/lib/live/types";
import { INCOMING_LATE_MINUTES } from "@/lib/notifications";
import { minutesSince } from "@/lib/orders";
import { closeOverlay, useOverlay } from "@/lib/overlays";
import { PAGE_PATHS } from "@/lib/permissions";
import { useSession } from "@/lib/session/client";
import { useFormat } from "@/lib/use-format";
import { useNow } from "@/lib/use-now";
import { useOrderStatus } from "@/lib/use-order-actions";
import { useShellLayout } from "@/lib/use-shell-layout";
import { useIncoming } from "./use-incoming";

/** Guest orders waiting for a yes: accept sends them to the kitchen, decline asks why. */
export function IncomingSheet() {
  const t = useTranslations("incoming");
  const { open, onOpenChange } = useOverlay("incoming");
  const session = useSession();
  const waiting = useIncoming();
  const phone = useShellLayout() === "phone";
  const now = useNow(30_000);
  if (session.status !== "authenticated") return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={phone ? "bottom" : "right"} className="w-[min(460px,100vw)]">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription className="text-pretty">{t("description")}</SheetDescription>
        </SheetHeader>
        <SheetBody className="px-4">
          {waiting.length === 0 ? (
            <EmptyState icon={TrayIcon} tone="slate" title={t("emptyTitle")}>
              {t("empty")}
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              <AnimatePresence initial={false} mode="popLayout">
                {waiting.map((order) => (
                  <m.li
                    key={order.id}
                    layout="position"
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ type: "spring", stiffness: 420, damping: 38 }}
                  >
                    <IncomingCard order={order} role={session.user.role} now={now} />
                  </m.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function IncomingCard({ order, role, now }: { order: LiveOrder; role: UserRole; now: number }) {
  const t = useTranslations("incoming");
  const tOrders = useTranslations("orders");
  const format = useFormat();
  const wait = useWaitText();
  const accept = useOrderStatus();
  const [declining, setDeclining] = useState(false);
  const minutes = minutesSince(order.createdAt, now);
  const online = order.source === "online";
  const SourceIcon = online ? GlobeSimpleIcon : QrCodeIcon;

  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <header className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground">
          <SourceIcon weight="duotone" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">
            {t("orderAt", {
              n: format.orderNo(order.orderNumber),
              where: order.table ? order.table.number : tOrders("takeaway"),
            })}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {[tOrders(`sources.${order.source}`), order.customerName].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Pill tone={minutes >= INCOMING_LATE_MINUTES ? "amber" : "slate"}>
          {t("waited", { time: wait(minutes) })}
        </Pill>
      </header>

      <ul className="mt-3 flex flex-col gap-1 border-t border-border pt-3">
        {order.items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-base">
            <span className="w-5 shrink-0 font-bold tabular-nums">
              {format.number(item.quantity)}
            </span>
            <span className="min-w-0">
              {item.foodName}
              {item.notes && (
                <span className="block text-sm text-tone-orange-text">{item.notes}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      {order.notes && (
        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-pretty">{order.notes}</p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{t("total")}</span>
        <span className="text-base font-bold tabular-nums">{format.money(order.total)}</span>
      </div>

      <footer className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={`${PAGE_PATHS.orders}/${order.id}`}
          onClick={closeOverlay}
          className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}
        >
          {t("open")}
          <ArrowRightIcon />
        </Link>
        <div className="flex-1" />
        <Button variant="outline" onClick={() => setDeclining(true)} disabled={accept.isPending}>
          {t("decline")}
        </Button>
        <Button
          onClick={() => accept.mutate({ order, status: "confirmed" })}
          disabled={accept.isPending}
        >
          <CheckIcon weight="bold" />
          {accept.isPending ? t("accepting") : t("accept")}
        </Button>
      </footer>

      <CancelOrderDialog
        order={order}
        decline
        role={role}
        open={declining}
        onOpenChange={setDeclining}
      />
    </article>
  );
}
