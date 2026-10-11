"use client";

import { ArrowsClockwiseIcon, CloudSlashIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, LayoutGroup } from "motion/react";
import * as m from "motion/react-m";
import { useFormatter, useTranslations } from "next-intl";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { activeOrdersQuery } from "@/lib/api/queries";
import { useErrorText } from "@/lib/api/use-error-text";
import { LIST_SPRING } from "@/lib/motion";
import { BOARD_COLUMNS, boardColumn, STATUS_LOOK, type BoardColumn } from "@/lib/orders";
import { useNow } from "@/lib/use-now";
import { OrderCard } from "./order-card";

const COLUMN_LOOK: Record<BoardColumn, (typeof STATUS_LOOK)[keyof typeof STATUS_LOOK]> = {
  waiting: STATUS_LOOK.pending,
  preparing: STATUS_LOOK.preparing,
  ready: STATUS_LOOK.ready,
  served: STATUS_LOOK.served,
};

/** Open orders in four columns. A card keeps its identity as it moves, so the eye can follow it. */
export function OrdersBoard() {
  const t = useTranslations("orders.board");
  const format = useFormatter();
  const errorText = useErrorText();
  const now = useNow(30_000);
  const query = useQuery(activeOrdersQuery);

  if (!query.data && query.isError) {
    return (
      <section className="rounded-xl bg-card shadow-md">
        <EmptyState
          icon={CloudSlashIcon}
          tone="slate"
          title={t("failed")}
          action={
            <Button variant="outline" onClick={() => void query.refetch()}>
              <ArrowsClockwiseIcon />
              {t("retry")}
            </Button>
          }
        >
          {errorText.message(query.error)}
        </EmptyState>
      </section>
    );
  }

  const orders = query.data?.items ?? [];

  return (
    // Columns scroll sideways below 1280; each keeps a readable width.
    <div className="-mx-4 [scrollbar-width:thin] overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
      <LayoutGroup>
        <div className="grid min-w-[1000px] grid-cols-4 gap-4 xl:min-w-0">
          {BOARD_COLUMNS.map(({ key }) => {
            const cards = orders.filter((order) => boardColumn(order.status) === key);
            const look = COLUMN_LOOK[key];
            return (
              <section
                key={key}
                aria-labelledby={`column-${key}`}
                className="flex min-h-[420px] flex-col gap-3 rounded-2xl bg-muted/70 p-3"
              >
                <header className="flex items-center justify-between px-1 pt-1">
                  <Pill tone={look.tone} icon={look.icon}>
                    <span id={`column-${key}`}>{t(`columns.${key}`)}</span>
                  </Pill>
                  <span className="text-sm font-bold text-muted-foreground tabular-nums">
                    {query.data ? format.number(cards.length) : null}
                  </span>
                </header>

                {!query.data ? (
                  <Skeleton className="h-44 rounded-xl bg-card" />
                ) : (
                  <AnimatePresence initial={false} mode="popLayout">
                    {cards.map((order) => (
                      <m.div
                        key={order.id}
                        layoutId={`order-${order.id}`}
                        layout="position"
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={LIST_SPRING}
                      >
                        <OrderCard order={order} now={now} />
                      </m.div>
                    ))}
                  </AnimatePresence>
                )}

                {query.data && cards.length === 0 && (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                    {t(`empty.${key}`)}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </LayoutGroup>
    </div>
  );
}
