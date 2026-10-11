"use client";

import {
  ArrowsClockwiseIcon,
  BellRingingIcon,
  CalendarDotsIcon,
  CaretRightIcon,
  CloudSlashIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { EmptyState } from "@/components/empty-state";
import { useOrderWhere } from "@/components/orders/order-bits";
import { PageFrame } from "@/components/shell/page-frame";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { activeOrdersQuery, dayBookingsQuery, tablesQuery } from "@/lib/api/queries";
import type { OrderOut } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";
import {
  arrivals,
  byArea,
  FLOOR_VIEWS,
  floorTables,
  HOLD_MINUTES,
  matchesView,
  type FloorView,
} from "@/lib/floor";
import { businessDate } from "@/lib/format";
import { useFirstVisit } from "@/lib/motion";
import { can, canOpen, PAGE_PATHS } from "@/lib/permissions";
import { useDraft } from "@/lib/pos-draft";
import { useSession } from "@/lib/session/client";
import { useFormat } from "@/lib/use-format";
import { useMyWaiterId } from "@/lib/use-my-waiter";
import { useNow } from "@/lib/use-now";
import { useShellLayout } from "@/lib/use-shell-layout";
import { cn } from "@/lib/utils";
import { TableTile } from "./table-tile";
import { UpNext } from "./up-next";

const viewParser = parseAsStringLiteral(FLOOR_VIEWS).withDefault("all");

export function FloorPage() {
  const t = useTranslations("floor");
  const errorText = useErrorText();
  const session = useSession();
  const phone = useShellLayout() === "phone";
  const now = useNow(30_000);
  const myId = useMyWaiterId();
  // A waiter's first look after signing in: the tables rise into place, once per session.
  const intro = useFirstVisit("intro:floor");
  const [view, setView] = useQueryState("show", viewParser);

  const tables = useQuery(tablesQuery);
  const orders = useQuery(activeOrdersQuery);
  const bookings = useQuery(dayBookingsQuery(businessDate(now)));
  // Tapping a free table opens the POS with that table already picked.
  const [, updateDraft] = useDraft(session.status === "authenticated" ? session.user.id : 0);
  if (session.status !== "authenticated") return null;
  const { role } = session.user;

  const loaded = tables.data && orders.data;
  const failed = !loaded && (tables.isError || orders.isError);
  const active = orders.data?.items ?? [];
  const entries = loaded ? floorTables(tables.data, active, bookings.data ?? [], now) : [];
  const counts = Object.fromEntries(
    FLOOR_VIEWS.map((key) => [
      key,
      entries.filter((entry) => matchesView(entry, key, myId)).length,
    ]),
  ) as Record<FloorView, number>;
  // "My tables" only means something to someone with tables assigned.
  const views = FLOOR_VIEWS.filter((key) => key !== "mine" || counts.mine > 0);
  const shown = views.includes(view) ? view : "all";

  const ready = active.filter((order) => order.status === "ready");
  const toPay = active.filter((order) => order.status === "served");
  const coming = arrivals(bookings.data ?? [], now);
  const soon = coming.filter(
    (booking) => Date.parse(booking.startsAt) - now <= HOLD_MINUTES * 60_000,
  );
  const canStart = can(role, "order.create");

  return (
    <PageFrame
      page="floor"
      meta={
        loaded
          ? t("meta", { busy: counts.inUse, total: entries.length, soon: soon.length })
          : undefined
      }
      actions={
        !phone && (
          <>
            {canOpen(role, "reservations") && (
              <Link
                href={PAGE_PATHS.reservations}
                className={buttonVariants({ variant: "outline" })}
              >
                <CalendarDotsIcon />
                {t("reservations")}
              </Link>
            )}
            {canStart && (
              <Link href={PAGE_PATHS.newOrder} className={buttonVariants()}>
                <PlusIcon weight="bold" />
                {t("newOrder")}
              </Link>
            )}
          </>
        )
      }
    >
      {phone && ready.length > 0 && <ReadyBanner orders={ready} />}

      <Tabs value={shown} onValueChange={(next) => void setView(next)}>
        <div className="mb-5 flex items-end gap-4">
          <TabsList className="-mx-4 min-w-0 flex-1 px-4 md:mx-0 md:px-0">
            {views.map((key) => (
              <TabsTab key={key} value={key} count={loaded ? counts[key] : undefined}>
                {t(`views.${key}`)}
              </TabsTab>
            ))}
          </TabsList>
          {!phone && (
            <p className="mb-3 hidden text-sm text-muted-foreground xl:block">{t("hint")}</p>
          )}
        </div>

        <TabsPanel value={shown}>
          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="grid grid-cols-1 gap-6">
              {failed ? (
                <section className="rounded-xl bg-card shadow-md">
                  <EmptyState
                    icon={CloudSlashIcon}
                    tone="slate"
                    title={t("failed")}
                    action={
                      <Button
                        variant="outline"
                        onClick={() => {
                          void tables.refetch();
                          void orders.refetch();
                        }}
                      >
                        <ArrowsClockwiseIcon />
                        {t("retry")}
                      </Button>
                    }
                  >
                    {errorText.message(tables.error ?? orders.error)}
                  </EmptyState>
                </section>
              ) : !loaded ? (
                <FloorSkeleton />
              ) : (
                byArea(entries.filter((entry) => matchesView(entry, shown, myId))).map(
                  ({ area, tables: group }) => (
                    <section key={area} aria-label={area || t("noArea")}>
                      <h2 className="mb-3 flex items-baseline gap-2 text-md font-bold">
                        {area || t("noArea")}
                        <span className="text-sm font-normal text-muted-foreground">
                          {t("tableCount", { n: group.length })}
                        </span>
                      </h2>
                      <ul
                        className={cn(
                          "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:gap-4",
                          intro ? "rise-children" : "animate-appear",
                        )}
                      >
                        {group.map((entry) => (
                          <li key={entry.table.id}>
                            <TableTile
                              entry={entry}
                              now={now}
                              onStart={
                                canStart
                                  ? () =>
                                      updateDraft({ orderType: "dine_in", tableId: entry.table.id })
                                  : undefined
                              }
                            />
                          </li>
                        ))}
                      </ul>
                    </section>
                  ),
                )
              )}
              {loaded && counts[shown] === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {t(`emptyView.${shown}`)}
                </p>
              )}
            </div>

            {!phone && (
              <UpNext
                ready={ready}
                arriving={coming}
                toPay={toPay}
                canBill={canOpen(role, "billing")}
              />
            )}
          </div>
        </TabsPanel>
      </Tabs>
    </PageFrame>
  );
}

/** Phones have no side panel, so food waiting at the pass gets a banner instead. */
function ReadyBanner({ orders }: { orders: OrderOut[] }) {
  const t = useTranslations("floor");
  const format = useFormat();
  const where = useOrderWhere();
  const first = orders[0];
  const place = where(first);

  return (
    <Link
      href={`${PAGE_PATHS.orders}/${first.id}`}
      className="mb-4 flex items-center gap-3 rounded-xl bg-tone-green-subtle px-4 py-3 text-tone-green-text outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      <BellRingingIcon weight="duotone" className="size-6 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">
          {orders.length > 1
            ? t("readyMany", { n: format.orderNo(first.orderNumber), more: orders.length - 1 })
            : t("readyOne", { n: format.orderNo(first.orderNumber) })}
        </span>
        <span className="block truncate text-xs">
          {[place.title, place.detail].filter(Boolean).join(" · ")}
        </span>
      </span>
      <CaretRightIcon weight="bold" className="size-4 shrink-0" />
    </Link>
  );
}

function FloorSkeleton() {
  return (
    <div aria-busy className="grid grid-cols-1 gap-6">
      {[4, 3].map((n, group) => (
        <div key={group}>
          <Skeleton className="mb-3 h-5 w-40" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:gap-4">
            {Array.from({ length: n }, (_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl bg-card" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
