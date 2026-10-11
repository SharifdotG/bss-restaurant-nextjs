"use client";

import { useEffect, useState } from "react";
import { ChefHatIcon, InfoIcon } from "@phosphor-icons/react";
import { AnimatePresence, LayoutGroup } from "motion/react";
import * as m from "motion/react-m";
import { useFormatter, useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import type { UserRole } from "@/lib/api/schema";
import {
  KITCHEN_COLUMNS,
  ticketClock,
  type HeldMoves,
  type KitchenColumn,
  type KitchenColumnKey,
} from "@/lib/kitchen";
import type { LiveOrder } from "@/lib/live/types";
import { DURATION, EASE, LIST_SPRING } from "@/lib/motion";
import { STATUS_LOOK } from "@/lib/orders";
import { orderMoves } from "@/lib/permissions";
import { TONES } from "@/lib/tones";
import { cn } from "@/lib/utils";
import { KitchenTicket } from "./kitchen-ticket";

type Board = Record<KitchenColumnKey, LiveOrder[]>;

type KitchenBoardProps = {
  board: Board;
  loading: boolean;
  role: UserRole;
  held: HeldMoves;
  prep: ReadonlyMap<string, number | null>;
  now: number;
  phone: boolean;
  onBump: (order: LiveOrder, column: KitchenColumn) => void;
};

// Softer than the list spring, so a new ticket lands with a small settle the eye catches.
const ARRIVAL = { type: "spring", stiffness: 300, damping: 22 } as const;

// Tickets this screen has already shown; anything else is a fresh one from the floor.
const seenTickets = new Set<number>();

const ICON_TONE: Record<KitchenColumn["tone"], string> = {
  amber: "text-tone-amber",
  orange: "text-tone-orange",
  green: "text-tone-green",
};

/** Three columns on a tablet or wall screen; one at a time behind tabs on a phone. */
export function KitchenBoard(props: KitchenBoardProps) {
  const t = useTranslations("kitchen");
  const [tab, setTab] = useState<KitchenColumnKey>("toCook");

  if (props.phone) {
    const column = KITCHEN_COLUMNS.find((c) => c.key === tab) ?? KITCHEN_COLUMNS[0];
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Tabs value={tab} onValueChange={(next) => setTab(next as KitchenColumnKey)}>
          <TabsList className="px-4">
            {KITCHEN_COLUMNS.map(({ key }) => (
              <TabsTab
                key={key}
                value={key}
                count={props.loading ? undefined : props.board[key].length}
              >
                {t(`columns.${key}`)}
              </TabsTab>
            ))}
          </TabsList>
        </Tabs>
        <LayoutGroup>
          <Column {...props} column={column} hideHeader />
        </LayoutGroup>
      </div>
    );
  }

  return (
    <LayoutGroup>
      <div className="grid min-h-0 flex-1 grid-cols-3 gap-4 px-4 pt-4 md:gap-5 md:px-6">
        {KITCHEN_COLUMNS.map((column) => (
          <Column key={column.key} {...props} column={column} />
        ))}
      </div>
    </LayoutGroup>
  );
}

function Column({
  column,
  board,
  loading,
  role,
  held,
  prep,
  now,
  phone,
  onBump,
  hideHeader = false,
}: KitchenBoardProps & { column: KitchenColumn; hideHeader?: boolean }) {
  const t = useTranslations("kitchen");
  const format = useFormatter();
  const tickets = board[column.key];
  const Icon = STATUS_LOOK[column.status].icon;
  const nextLook = STATUS_LOOK[column.next];
  // Chefs plate the food; front of house carries it out.
  const servedByOthers = column.key === "ready" && role === "chef";

  return (
    <section
      aria-labelledby={hideHeader ? undefined : `kitchen-${column.key}`}
      aria-label={hideHeader ? t(`columns.${column.key}`) : undefined}
      className="flex min-h-0 flex-col"
    >
      {!hideHeader && (
        <header className="flex items-center gap-2.5 pb-3">
          <Icon weight="duotone" className={cn("size-5", ICON_TONE[column.tone])} />
          <h2 id={`kitchen-${column.key}`} className="text-lg font-bold">
            {t(`columns.${column.key}`)}
          </h2>
          <span
            className={cn(
              "ml-auto inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold tabular-nums",
              TONES[column.tone],
            )}
          >
            {loading ? "–" : format.number(tickets.length)}
          </span>
        </header>
      )}

      <m.div
        layoutScroll
        className={cn(
          "flex min-h-0 flex-1 [scrollbar-width:thin] flex-col gap-4 overflow-y-auto pb-6",
          phone && "px-4 pt-4",
        )}
      >
        {loading ? (
          <>
            <Skeleton className="h-56 shrink-0 rounded-2xl bg-card" />
            <Skeleton className="h-44 shrink-0 rounded-2xl bg-card" />
          </>
        ) : (
          <AnimatePresence initial={false} mode="popLayout">
            {tickets.map((order) => {
              const moves = orderMoves(role, order);
              return (
                <TicketSlot key={order.id} id={order.id}>
                  <KitchenTicket
                    order={order}
                    column={column}
                    clock={ticketClock(order, prep, now)}
                    action={
                      moves.includes(column.next)
                        ? {
                            label: t(`actions.${column.next}`),
                            icon: nextLook.icon,
                            busy: held.has(order.id),
                            onClick: () => onBump(order, column),
                          }
                        : undefined
                    }
                  />
                </TicketSlot>
              );
            })}
          </AnimatePresence>
        )}

        {!loading && tickets.length === 0 && <EmptyColumn column={column} />}
        {!loading && tickets.length > 0 && servedByOthers && (
          <p className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
            <InfoIcon weight="duotone" className="size-4 shrink-0" />
            {t("servedHint")}
          </p>
        )}
      </m.div>
    </section>
  );
}

function EmptyColumn({ column }: { column: KitchenColumn }) {
  const t = useTranslations("kitchen.empty");
  if (column.key !== "toCook") {
    return (
      <p className="grid min-h-28 shrink-0 place-items-center rounded-2xl border border-border px-4 text-center text-sm text-muted-foreground">
        {t(column.key)}
      </p>
    );
  }
  return (
    <div className="flex shrink-0 flex-col items-center gap-3 rounded-2xl border border-border px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-xl bg-primary-soft text-primary-soft-foreground">
        <ChefHatIcon weight="duotone" className="size-7" />
      </span>
      <p className="text-xl font-bold">{t("toCookTitle")}</p>
      <p className="max-w-64 text-base text-pretty text-muted-foreground">{t("toCook")}</p>
    </div>
  );
}

/** A ticket new to the screen drops in and settles; one changing column just glides across. */
function TicketSlot({
  id,
  ref,
  children,
}: {
  id: number;
  ref?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}) {
  const [fresh] = useState(() => !seenTickets.has(id));
  useEffect(() => {
    seenTickets.add(id);
  }, [id]);

  return (
    <m.div
      ref={ref}
      layoutId={`ticket-${id}`}
      layout="position"
      initial={fresh ? { opacity: 0, y: -24, scale: 0.97 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: DURATION.fast, ease: EASE.exit } }}
      transition={fresh ? ARRIVAL : LIST_SPRING}
      className="shrink-0"
    >
      {children}
    </m.div>
  );
}
