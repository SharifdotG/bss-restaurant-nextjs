"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { reservationSearchQuery } from "@/lib/api/queries";
import type { ReservationOut } from "@/lib/api/schema";
import { businessDate, dayToDate } from "@/lib/format";
import { byDay, isLate } from "@/lib/reservations";
import { useFormat } from "@/lib/use-format";
import { BookingStatusPill } from "./booking-bits";

type BookingSearchProps = {
  search: string;
  today: string;
  now: number;
  onOpen: (booking: ReservationOut) => void;
};

/** Every booking matching a name, phone or code, on any date, latest day first. */
export function BookingSearch({ search, today, now, onOpen }: BookingSearchProps) {
  const t = useTranslations("reservations.search");
  const format = useFormat();
  const results = useQuery(reservationSearchQuery(search));
  const page = results.data;
  // The API sorts latest first; days keep that order.
  const days = page ? byDay(page.items, (at) => businessDate(at)).reverse() : [];

  if (!page) {
    return (
      <div aria-busy className="grid gap-2 p-5">
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-14 rounded-md" />
        ))}
      </div>
    );
  }
  if (page.total === 0) {
    return (
      <EmptyState icon={MagnifyingGlassIcon} tone="slate" title={t("none", { search })}>
        {t("noneHint")}
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-1 pb-3">
      <p className="px-5 pt-4 text-sm text-muted-foreground">
        {page.total > page.items.length
          ? t("countMore", { n: page.items.length, total: page.total })
          : t("count", { n: page.total })}
      </p>
      {days.map(({ day, items }) => (
        <section key={day} aria-label={format.weekday(dayToDate(day))}>
          <h2 className="sticky top-0 z-10 bg-card px-5 pt-4 pb-1 text-xs font-bold text-muted-foreground">
            {day === today ? t("today") : format.dayWithWeekday(day)}
          </h2>
          <ul>
            {items.map((booking) => (
              <li key={booking.id}>
                <button
                  type="button"
                  onClick={() => onOpen(booking)}
                  className="flex w-full items-center gap-4 px-5 py-2.5 text-left outline-none hover:bg-foreground/[0.03] focus-visible:bg-primary/10"
                >
                  <span className="w-20 shrink-0 text-sm font-bold tabular-nums">
                    {format.time(booking.startsAt)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{booking.customerName}</span>
                    <span className="block truncate text-xs text-muted-foreground tabular-nums">
                      {[
                        t("guests", { n: booking.partySize }),
                        booking.table?.number ?? t("noTable"),
                        booking.customerPhone,
                      ].join(" · ")}
                    </span>
                  </span>
                  <BookingStatusPill status={booking.status} late={isLate(booking, now)} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
