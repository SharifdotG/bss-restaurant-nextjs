"use client";

import { useState } from "react";
import { CheckIcon, WarningIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Count } from "@/components/ui/count";
import { availabilityQuery } from "@/lib/api/queries";
import type { ReservationOut } from "@/lib/api/schema";
import { useReservationStatus } from "@/lib/use-reservation-actions";
import { cn } from "@/lib/utils";
import { useWhen } from "./booking-bits";

const SHOWN = 3;

type WaitingPanelProps = {
  requests: ReservationOut[];
  today: string;
  canManage: boolean;
  onOpen: (booking: ReservationOut) => void;
  onDecline: (booking: ReservationOut) => void;
  className?: string;
};

/** Website requests waiting for a yes, soonest first, each with the table a yes would get. */
export function WaitingPanel({
  requests,
  today,
  canManage,
  onOpen,
  onDecline,
  className,
}: WaitingPanelProps) {
  const t = useTranslations("reservations.waiting");
  const [all, setAll] = useState(false);
  const shown = all ? requests : requests.slice(0, SHOWN);

  return (
    <section className={cn("rounded-xl bg-card p-5 shadow-md", className)}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-md font-bold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{requests.length ? t("sub") : t("empty")}</p>
        </div>
        {requests.length > 0 && <Count value={requests.length} className="mt-1" />}
      </header>
      {shown.length > 0 && (
        <ul className="mt-4 grid divide-y divide-border border-t border-border">
          {shown.map((booking) => (
            <Request
              key={booking.id}
              booking={booking}
              today={today}
              canManage={canManage}
              onOpen={() => onOpen(booking)}
              onDecline={() => onDecline(booking)}
            />
          ))}
        </ul>
      )}
      {requests.length > SHOWN && (
        <Button variant="link" size="sm" className="mt-2 px-0" onClick={() => setAll(!all)}>
          {all ? t("fewer") : t("all", { n: requests.length })}
        </Button>
      )}
    </section>
  );
}

type RequestProps = {
  booking: ReservationOut;
  today: string;
  canManage: boolean;
  onOpen: () => void;
  onDecline: () => void;
};

function Request({ booking, today, canManage, onOpen, onDecline }: RequestProps) {
  const t = useTranslations("reservations.waiting");
  const when = useWhen();
  const move = useReservationStatus();
  // What a yes would get: the API confirms on the smallest table that fits and is free.
  const free = useQuery(
    availabilityQuery(
      {
        startsAt: booking.startsAt,
        partySize: booking.partySize,
        minutes: booking.minutes,
        reservationId: booking.id,
      },
      canManage,
    ),
  ).data;
  const table = booking.table ?? free?.tables[0] ?? null;
  const full = free !== undefined && free.tables.length === 0 && !booking.table;

  return (
    <li className="py-4 last:pb-0">
      <button
        type="button"
        onClick={onOpen}
        className="-mx-1.5 block w-[calc(100%+0.75rem)] rounded-md px-1.5 text-left outline-none hover:bg-foreground/[0.04] focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <span className="flex items-baseline justify-between gap-3 text-sm">
          <span className="min-w-0 truncate">
            <span className="font-bold">{booking.customerName}</span>
            <span className="text-muted-foreground">
              {" "}
              · {t("guests", { n: booking.partySize })}
            </span>
          </span>
          <span className="shrink-0 font-bold tabular-nums">{when(booking.startsAt, today)}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground tabular-nums">
          {[t(`source.${booking.source}`), booking.customerPhone].join(" · ")}
          {table && <span> · {t("freeTable", { table: table.number })}</span>}
          {full && (
            <span className="flex items-center gap-1 font-bold text-tone-amber-text">
              · <WarningIcon weight="fill" className="size-3" />
              {t("noneFree")}
            </span>
          )}
        </span>
      </button>
      {canManage && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={onDecline} disabled={move.isPending}>
            {t("decline")}
          </Button>
          <Button
            variant="soft"
            size="sm"
            disabled={full || move.isPending}
            onClick={() => move.mutate({ booking, status: "confirmed" })}
          >
            <CheckIcon weight="bold" />
            {move.isPending ? t("confirming") : t("confirm")}
          </Button>
        </div>
      )}
    </li>
  );
}
