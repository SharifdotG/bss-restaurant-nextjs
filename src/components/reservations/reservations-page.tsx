"use client";

import { useState } from "react";
import {
  ArrowsClockwiseIcon,
  CalendarDotsIcon,
  CloudSlashIcon,
  CursorClickIcon,
  PlusIcon,
  PrinterIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/empty-state";
import { PageFrame } from "@/components/shell/page-frame";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  activeOrdersQuery,
  dayReservationsQuery,
  paidTodayQuery,
  restaurantQuery,
  tablesQuery,
  upcomingReservationsQuery,
} from "@/lib/api/queries";
import type { ReservationOut, ReservationStatus } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";
import { businessDate, dayToDate } from "@/lib/format";
import { can } from "@/lib/permissions";
import {
  BOOKING_LOOK,
  dayWindow,
  gridAreas,
  ON_GRID,
  paidButSeated,
  requestRange,
  waitingList,
} from "@/lib/reservations";
import { areaNames } from "@/lib/tables";
import { useSession } from "@/lib/session/client";
import { useFormat } from "@/lib/use-format";
import { useNow } from "@/lib/use-now";
import { useDebounced } from "@/lib/use-debounced";
import { useShellLayout, useWideScreen } from "@/lib/use-shell-layout";
import { BookingAgenda } from "./booking-agenda";
import { BookingDecisionDialog, type Decision } from "./booking-decision-dialog";
import { BookingDetails } from "./booking-details";
import { BookingGrid } from "./booking-grid";
import { BookingSearch } from "./booking-search";
import { BookingSheet, type SheetStart } from "./booking-sheet";
import { DaySheet } from "./day-sheet";
import { DeskToolbar, SearchBox } from "./desk-toolbar";
import { useDeskUrl, type Show } from "./use-desk-url";
import { WaitingPanel } from "./waiting-panel";

const SHOW_STATUSES: Record<Show, readonly ReservationStatus[]> = {
  all: ON_GRID,
  coming: ["requested", "confirmed"],
  seated: ["seated"],
  finished: ["completed", "no_show"],
};

const LEGEND = ["completed", "seated", "confirmed", "requested", "no_show"] as const;

/** The front desk: every table across the day, requests waiting for a yes, one booking in focus. */
export function ReservationsPage() {
  const t = useTranslations("reservations");
  const status = useTranslations("status.reservation");
  const format = useFormat();
  const errorText = useErrorText();
  const session = useSession();
  const wide = useWideScreen();
  const phone = useShellLayout() === "phone";
  const now = useNow(30_000);
  const today = businessDate(now);
  const url = useDeskUrl(today);
  const search = useDebounced(url.searching ? url.search.trim() : "", 300);
  const [sheet, setSheet] = useState<SheetStart | null>(null);
  const [deciding, setDeciding] = useState<{ booking: ReservationOut; decision: Decision } | null>(
    null,
  );

  const restaurant = useQuery(restaurantQuery).data;
  const tables = useQuery(tablesQuery);
  const day = useQuery(dayReservationsQuery(url.day));
  const requests = useQuery(upcomingReservationsQuery(requestRange(today), ["requested"])).data;
  // Only today's seated guests can have paid and gone.
  const open = useQuery({ ...activeOrdersQuery, enabled: url.isToday }).data?.items;
  const paid = useQuery({ ...paidTodayQuery(today), enabled: url.isToday }).data?.items;
  if (session.status !== "authenticated") return null;
  const { role } = session.user;
  const canManage = can(role, "reservation.manage");

  const bookings = day.data ?? [];
  const onGrid = bookings.filter((booking) => ON_GRID.includes(booking.status));
  const shown = onGrid.filter((booking) => SHOW_STATUSES[url.show].includes(booking.status));
  const grid = gridAreas(tables.data ?? [], shown);
  const areas = url.area ? grid.areas.filter((entry) => entry.area === url.area) : grid.areas;
  const span = restaurant
    ? dayWindow(url.day, restaurant.opensAt, restaurant.closesAt, onGrid)
    : null;
  const waiting = waitingList(requests ?? [], now);
  const loaded = span && tables.data && day.data;
  const failed = !loaded && (tables.isError || day.isError);

  const selected = bookings.find((booking) => booking.id === url.booking) ?? null;
  const selectedTable = tables.data?.find((table) => table.id === selected?.table?.id);
  const openBooking = (booking: ReservationOut) =>
    url.open(booking.id === url.booking ? null : booking.id, businessDate(booking.startsAt));

  const details = selected && (
    <BookingDetails
      booking={selected}
      table={selectedTable}
      role={role}
      today={today}
      now={now}
      paid={paidButSeated(selected, open ?? [], paid ?? [])}
      onClose={() => url.open(null)}
      onDecide={(decision) => setDeciding({ booking: selected, decision })}
      onEdit={() => setSheet({ booking: selected })}
    />
  );

  const waitingPanel = (
    <WaitingPanel
      requests={waiting}
      today={today}
      canManage={canManage}
      onOpen={openBooking}
      onDecline={(booking) => setDeciding({ booking, decision: "declined" })}
    />
  );

  const guests = onGrid
    .filter((booking) => booking.status !== "no_show")
    .reduce((sum, booking) => sum + booking.partySize, 0);
  const dayName = url.isToday ? t("today") : format.weekdayName(dayToDate(url.day));

  return (
    <PageFrame
      page="reservations"
      meta={
        day.data &&
        [
          format.weekday(dayToDate(url.day)),
          onGrid.length ? t("meta.day", { n: onGrid.length, guests }) : t("meta.none"),
          waiting.length > 0 && t("meta.waiting", { n: waiting.length }),
        ]
          .filter(Boolean)
          .join(" · ")
      }
      actions={
        <>
          {!phone && (
            <Button variant="outline" onClick={() => window.print()} disabled={!day.data}>
              <PrinterIcon />
              {t("printList")}
            </Button>
          )}
          {canManage && (
            <Button onClick={() => setSheet({})}>
              <PlusIcon weight="bold" />
              {phone ? t("newShort") : t("newBooking")}
            </Button>
          )}
        </>
      }
    >
      {!phone && (
        <DeskToolbar url={url} today={today} areas={tables.data ? areaNames(tables.data) : []} />
      )}

      {phone ? (
        <div className="grid gap-5">
          <SearchBox url={url} />
          {url.searching ? (
            <section className="overflow-hidden rounded-xl bg-card shadow-md">
              <BookingSearch search={search} today={today} now={now} onOpen={openBooking} />
            </section>
          ) : (
            <>
              {waiting.length > 0 && waitingPanel}
              <BookingAgenda
                day={url.day}
                today={today}
                now={now}
                bookings={bookings}
                selected={url.booking}
                onDay={url.setDay}
                onOpen={openBooking}
              />
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="min-w-0 overflow-hidden rounded-xl bg-card shadow-md">
            {url.searching ? (
              <BookingSearch search={search} today={today} now={now} onOpen={openBooking} />
            ) : (
              <>
                <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4">
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-md font-bold">{dayName}</h2>
                    {restaurant && (
                      <p className="text-sm text-muted-foreground tabular-nums">
                        {t("grid.hours", {
                          from: format.clock(restaurant.opensAt),
                          to: format.clock(restaurant.closesAt),
                        })}
                      </p>
                    )}
                  </div>
                  <ul className="hidden flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground lg:flex">
                    {LEGEND.map((key) => {
                      const Icon = BOOKING_LOOK[key].icon;
                      return (
                        <li key={key} className="flex items-center gap-1.5">
                          <Icon weight="duotone" className="size-3.5" aria-hidden />
                          {status(key)}
                        </li>
                      );
                    })}
                  </ul>
                </header>
                <div className="relative border-t border-border">
                  {failed ? (
                    <EmptyState
                      icon={CloudSlashIcon}
                      tone="slate"
                      title={t("failed")}
                      action={
                        <Button
                          variant="outline"
                          onClick={() => {
                            void tables.refetch();
                            void day.refetch();
                          }}
                        >
                          <ArrowsClockwiseIcon />
                          {t("retry")}
                        </Button>
                      }
                    >
                      {errorText.message(tables.error ?? day.error)}
                    </EmptyState>
                  ) : !loaded ? (
                    <GridSkeleton />
                  ) : (
                    <>
                      <BookingGrid
                        span={span}
                        unassigned={url.area ? [] : grid.unassigned}
                        areas={areas}
                        selected={url.booking}
                        now={now}
                        onOpen={openBooking}
                        onBook={
                          canManage ? (table, at) => setSheet({ tableId: table.id, at }) : undefined
                        }
                      />
                      {onGrid.length === 0 && (
                        <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
                          <div className="pointer-events-auto w-full max-w-sm rounded-xl bg-card p-2 shadow-lg ring-1 ring-border">
                            <EmptyState
                              icon={CalendarDotsIcon}
                              tone="brand"
                              title={t("empty.title")}
                              className="py-8"
                              action={
                                canManage && (
                                  <Button onClick={() => setSheet({})}>
                                    <PlusIcon weight="bold" />
                                    {t("newBooking")}
                                  </Button>
                                )
                              }
                            >
                              {t("empty.body")}
                            </EmptyState>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </section>

          {/* Below 1280 the requests go above the grid and a booking opens in a sheet. */}
          <div className="-order-1 grid grid-cols-1 gap-5 empty:hidden xl:sticky xl:top-6 xl:order-none">
            {(wide || waiting.length > 0) && waitingPanel}
            {wide && (
              <div className="min-h-[26rem] rounded-xl bg-card p-5 shadow-md">
                {details ?? (
                  <EmptyState icon={CursorClickIcon} tone="slate" title={t("nothingSelected")}>
                    {t("pickOne")}
                  </EmptyState>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!wide && (
        <Sheet open={selected !== null} onOpenChange={(next) => !next && url.open(null)}>
          <SheetContent
            side={phone ? "bottom" : "right"}
            showCloseButton={false}
            className={phone ? "max-h-[90dvh] overflow-y-auto p-6" : "p-6"}
          >
            <SheetTitle className="sr-only">{selected?.customerName}</SheetTitle>
            {details}
          </SheetContent>
        </Sheet>
      )}

      <BookingSheet
        start={sheet}
        today={today}
        now={now}
        onClose={() => setSheet(null)}
        onSaved={(booking) => {
          setSheet(null);
          url.open(booking.id, businessDate(booking.startsAt));
        }}
      />

      {restaurant && day.data && (
        <DaySheet restaurant={restaurant.name} day={url.day} bookings={onGrid} now={now} />
      )}

      {deciding && (
        <BookingDecisionDialog
          booking={deciding.booking}
          decision={deciding.decision}
          now={now}
          onOpenChange={(next) => !next && setDeciding(null)}
        />
      )}
    </PageFrame>
  );
}

function GridSkeleton() {
  return (
    <div aria-busy className="grid gap-2 p-5">
      <Skeleton className="h-6 w-full" />
      {Array.from({ length: 7 }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}
