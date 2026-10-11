"use client";

import { ArrowRightIcon, CoffeeIcon } from "@phosphor-icons/react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/empty-state";
import { OrderCard } from "@/components/orders/order-card";
import { Panel } from "@/components/panel";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import type { OrderOut } from "@/lib/api/schema";
import { listItem } from "@/lib/motion";
import { attentionPicks } from "@/lib/overview";
import { PAGE_PATHS } from "@/lib/permissions";
import { TONES } from "@/lib/tones";
import { cn } from "@/lib/utils";

const REASON_TONE = { guest: "amber", ready: "green", kitchen: "orange" } as const;

/** The orders someone should look at now, most urgent first, each with its next step. */
export function AttentionPanel({
  orders,
  now,
  className,
}: {
  orders: OrderOut[] | undefined;
  now: number;
  className?: string;
}) {
  const t = useTranslations("overview.attention");
  const picks = orders && attentionPicks(orders, 3);

  return (
    <Panel
      className={cn("@container", className)}
      title={t("title")}
      subtitle={t("sub")}
      action={
        <Link
          href={`${PAGE_PATHS.orders}?view=board`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-mr-2")}
        >
          {t("board")}
          <ArrowRightIcon />
        </Link>
      }
    >
      {!picks ? (
        <div className="grid grid-cols-1 gap-4 @[30rem]:grid-cols-2">
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="hidden h-52 rounded-xl @[30rem]:block" />
        </div>
      ) : picks.length === 0 ? (
        <EmptyState icon={CoffeeIcon} tone="slate" title={t("emptyTitle")} className="py-8">
          {t("empty")}
        </EmptyState>
      ) : (
        <ul className="grid animate-appear grid-cols-1 items-start gap-4 @[30rem]:grid-cols-2 @5xl:grid-cols-3">
          <AnimatePresence initial={false} mode="popLayout">
            {picks.map(({ order, reason }, i) => (
              // Two fit most screens; the third only shows where there's room for it.
              <m.li
                key={order.id}
                {...listItem}
                className={cn("grid gap-2", i === 2 && "hidden @5xl:grid")}
              >
                <span
                  className={cn(
                    "w-fit rounded-full px-2.5 py-0.5 text-xs font-bold",
                    TONES[REASON_TONE[reason]],
                  )}
                >
                  {t(`reasons.${reason}`)}
                </span>
                <OrderCard
                  order={order}
                  now={now}
                  className="shadow-none ring-1 ring-border hover:shadow-sm"
                />
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Panel>
  );
}
