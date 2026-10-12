"use client";

import { CaretLeftIcon, CaretRightIcon, UsersIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { upcomingReservationsQuery } from "@/lib/api/queries";
import type { ReservationOut } from "@/lib/api/schema";
import { businessDate, dayToDate, shiftDay } from "@/lib/format";
import { BOOKING_LOOK, byStart, isLate, ON_GRID } from "@/lib/reservations";
import { TONE_EDGES, TONES } from "@/lib/tones";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

type BookingAgendaProps = {
  day: string;
  today: string;
  now: number;
  bookings: ReservationOut[];
  selected: number | null;
  onDay: (day: string) => void;
  onOpen: (booking: ReservationOut) => void;
};

/** Bangladesh's week starts on Saturday. */
const weekStart = (day: string) => shiftDay(day, -((dayToDate(day).getUTCDay() + 1) % 7));

/** Phones get the day as a list: a week strip on top, then each booking in time order. */
export function BookingAgenda({
  day,
  today,
  now,
  bookings,
  selected,
  onDay,
  onOpen,
}: BookingAgendaProps) {
  const t = useTranslations("reservations.agenda");
  const format = useFormat();
  const start = weekStart(day);
  const week = Array.from({ length: 7 }, (_, i) => shiftDay(start, i));
  const booked = new Set(
    (
      useQuery(upcomingReservationsQuery({ dateFrom: start, dateTo: week[6] }, [...ON_GRID]))
        .data ?? []
    ).map((booking) => businessDate(booking.startsAt)),
  );

  const rows = bookings.filter((booking) => ON_GRID.includes(booking.status)).toSorted(byStart);
  const coming = rows.filter(
    (booking) => booking.status === "requested" || booking.status === "confirmed",
  );
  const nowIndex =
    day === today ? rows.findIndex((booking) => Date.parse(booking.startsAt) > now) : -1;

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("previousWeek")}
          onClick={() => onDay(shiftDay(start, -7))}
        >
          <CaretLeftIcon />
        </Button>
        <ol className="grid flex-1 grid-cols-7 gap-1">
          {week.map((date) => {
            const active = date === day;
            return (
              <li key={date}>
                <button
                  type="button"
                  onClick={() => onDay(date)}
                  aria-current={active ? "date" : undefined}
                  aria-label={[format.dayWithWeekday(date), booked.has(date) && t("hasBookings")]
                    .filter(Boolean)
                    .join(", ")}
                  className={cn(
                    "flex w-full flex-col items-center gap-0.5 rounded-lg py-2 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground shadow-sm",
                  )}
                >
                  {format.weekdayShort(dayToDate(date))}
                  <span
                    className={cn("text-md font-bold tabular-nums", !active && "text-foreground")}
                  >
                    {format.number(Number(date.slice(8)))}
                  </span>
                  <span
                    className={cn(
                      "size-1 rounded-full",
                      booked.has(date)
                        ? active
                          ? "bg-primary-foreground"
                          : "bg-primary"
                        : "bg-transparent",
                    )}
                  />
                </button>
              </li>
            );
          })}
        </ol>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("nextWeek")}
          onClick={() => onDay(shiftDay(start, 7))}
        >
          <CaretRightIcon />
        </Button>
      </div>

      <section>
        <header className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-md font-bold">
            {day === today ? t("today") : format.weekdayName(dayToDate(day))}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("summary", {
              n: coming.length,
              guests: coming.reduce((sum, booking) => sum + booking.partySize, 0),
            })}
          </p>
        </header>
        {rows.length === 0 ? (
          <p className="rounded-xl bg-card px-5 py-8 text-center text-sm text-muted-foreground shadow-sm">
            {t("none")}
          </p>
        ) : (
          <ol className="grid gap-2">
            {rows.map((booking, i) => {
              const { tone, icon: Icon } = BOOKING_LOOK[booking.status];
              const late = isLate(booking, now);
              return (
                <li key={booking.id}>
                  {i === nowIndex && <NowLine now={now} />}
                  <div className="flex items-start gap-3">
                    <span className="w-16 shrink-0 pt-2.5 text-xs font-bold tabular-nums">
                      {format.time(booking.startsAt)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpen(booking)}
                      aria-pressed={booking.id === selected}
                      className={cn(
                        "min-w-0 flex-1 rounded-lg border px-3 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                        TONES[tone],
                        TONE_EDGES[tone],
                        booking.status === "requested" && "border-dashed",
                        booking.id === selected && "ring-2 ring-primary",
                      )}
                    >
                      <span className="flex items-center gap-1.5 text-sm font-bold">
                        <Icon weight="duotone" className="size-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{booking.customerName}</span>
                        <UsersIcon className="size-4" aria-hidden />
                        {format.number(booking.partySize)}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-xs tabular-nums">
                        {late && <WarningCircleIcon weight="fill" className="size-3" />}
                        {[
                          booking.table?.number ?? t("noTable"),
                          late ? t("late") : format.timeRange(booking.startsAt, booking.endsAt),
                        ].join(" · ")}
                      </span>
                    </button>
                  </div>
                </li>
              );
            })}
            {nowIndex === -1 && day === today && rows.length > 0 && (
              <li>
                <NowLine now={now} />
              </li>
            )}
          </ol>
        )}
      </section>
    </div>
  );
}

function NowLine({ now }: { now: number }) {
  const format = useFormat();
  return (
    <div className="my-1 flex items-center gap-3" aria-hidden>
      <span className="w-16 shrink-0 text-xs font-bold text-primary-soft-foreground tabular-nums">
        {format.time(now)}
      </span>
      <span className="size-2 rounded-full bg-primary" />
      <span className="h-px flex-1 bg-primary" />
    </div>
  );
}
