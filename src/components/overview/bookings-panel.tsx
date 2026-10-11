"use client";

import { ArrowRightIcon, CalendarCheckIcon, UsersIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/empty-state";
import { Panel } from "@/components/panel";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { tablesQuery } from "@/lib/api/queries";
import type { ReservationOut } from "@/lib/api/schema";
import { listItem } from "@/lib/motion";
import { PAGE_PATHS } from "@/lib/permissions";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

const SHOWN = 4;
// A booking a quarter of an hour late is still "to come"; the floor hasn't given up on it.
const GRACE_MS = 15 * 60_000;

/** Today's bookings that haven't sat down yet, earliest first. */
export function upcomingBookings(bookings: ReservationOut[], now: number) {
  return bookings.filter(
    (booking) =>
      (booking.status === "confirmed" || booking.status === "requested") &&
      Date.parse(booking.startsAt) >= now - GRACE_MS,
  );
}

export function BookingsPanel({
  bookings,
  now,
  className,
}: {
  bookings: ReservationOut[] | undefined;
  now: number;
  className?: string;
}) {
  const t = useTranslations("overview.bookings");
  const format = useFormat();
  const locations = new Map(useQuery(tablesQuery).data?.map((table) => [table.id, table.location]));
  const upcoming = bookings && upcomingBookings(bookings, now);
  const guests = upcoming?.reduce((sum, booking) => sum + booking.partySize, 0) ?? 0;

  return (
    <Panel
      className={className}
      title={t("title")}
      subtitle={
        upcoming ? (upcoming.length ? t("sub", { n: upcoming.length, guests }) : t("none")) : " "
      }
      action={
        <Link
          href={PAGE_PATHS.reservations}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-mr-2")}
        >
          {t("all")}
          <ArrowRightIcon />
        </Link>
      }
    >
      {!upcoming ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : upcoming.length === 0 ? (
        <EmptyState
          icon={CalendarCheckIcon}
          tone="slate"
          title={t("emptyTitle")}
          className="py-6"
        />
      ) : (
        <ul className="grid animate-appear gap-2">
          <AnimatePresence initial={false} mode="popLayout">
            {upcoming.slice(0, SHOWN).map((booking) => {
              const request = booking.status === "requested";
              const where = booking.table
                ? [booking.table.number, locations.get(booking.table.id)]
                    .filter(Boolean)
                    .join(" · ")
                : t("noTable");
              return (
                <m.li
                  key={booking.id}
                  {...listItem}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5",
                    request ? "bg-tone-amber-subtle" : "bg-muted/60",
                  )}
                >
                  <span className="w-16 shrink-0 text-sm font-bold tabular-nums">
                    {format.time(booking.startsAt)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{booking.customerName}</p>
                    <p
                      className={cn(
                        "truncate text-xs",
                        request ? "font-medium text-tone-amber-text" : "text-muted-foreground",
                      )}
                    >
                      {request ? t("request") : where}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-bold tabular-nums">
                    <UsersIcon weight="duotone" className="size-4 text-muted-foreground" />
                    {format.number(booking.partySize)}
                  </span>
                </m.li>
              );
            })}
          </AnimatePresence>
          {upcoming.length > SHOWN && (
            <li className="px-3 pt-1 text-xs text-muted-foreground">
              {t("more", { n: upcoming.length - SHOWN })}
            </li>
          )}
        </ul>
      )}
    </Panel>
  );
}
