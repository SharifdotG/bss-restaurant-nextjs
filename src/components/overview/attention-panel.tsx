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
import { cn } from "@/lib/utils";

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
      plain
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
        <EmptyState
          icon={CoffeeIcon}
          tone="slate"
          title={t("emptyTitle")}
          className="rounded-xl bg-card py-8 shadow-md"
        >
          {t("empty")}
        </EmptyState>
      ) : (
        <ul className="grid animate-appear grid-cols-1 items-start gap-4 @[30rem]:grid-cols-2 @5xl:grid-cols-3">
          <AnimatePresence initial={false} mode="popLayout">
            {picks.map(({ order }, i) => (
              // Two fit most screens; the third only shows where there's room for it.
              <m.li key={order.id} {...listItem} className={cn(i === 2 && "hidden @5xl:block")}>
                <OrderCard order={order} now={now} status className="shadow-md" />
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Panel>
  );
}
