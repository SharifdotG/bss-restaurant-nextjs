"use client";

import { useEffect, useRef } from "react";
import { UsersIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import type { ReservationOut, TableOut } from "@/lib/api/schema";
import {
  blockSpan,
  BOOKING_LOOK,
  isLate,
  lanes,
  STEP_MINUTES,
  type DayWindow,
  type GridRow,
} from "@/lib/reservations";
import { TONE_EDGES, TONES } from "@/lib/tones";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

const HOUR_PX = 96;
const LANE_PX = 60;
const LABEL_PX = 128;
const PX_PER_MINUTE = HOUR_PX / 60;

type BookingGridProps = {
  span: DayWindow;
  unassigned: ReservationOut[];
  areas: { area: string; rows: GridRow<ReservationOut>[] }[];
  selected: number | null;
  now: number;
  onOpen: (booking: ReservationOut) => void;
  /** Clicking an empty slot books that table then; absent for roles that can't book. */
  onBook?: (table: Pick<TableOut, "id">, startsAt: number) => void;
};

/** Tables down the side, the day's hours across, each booking a block where it falls. */
export function BookingGrid({
  span,
  unassigned,
  areas,
  selected,
  now,
  onOpen,
  onBook,
}: BookingGridProps) {
  const t = useTranslations("reservations.grid");
  const format = useFormat();
  const scroller = useRef<HTMLDivElement>(null);
  const width = span.hours.length * HOUR_PX;
  const nowAt = now >= span.from && now < span.to ? (now - span.from) / 60_000 : null;

  // Open on what matters: now on today, the first booking on other days.
  const firstStart = [...unassigned, ...areas.flatMap((a) => a.rows.flatMap((r) => r.bookings))]
    .map((booking) => Date.parse(booking.startsAt))
    .reduce((min, at) => Math.min(min, at), Infinity);
  const focusMinute =
    nowAt ?? (Number.isFinite(firstStart) ? (firstStart - span.from) / 60_000 : 0);
  useEffect(() => {
    scroller.current?.scrollTo({ left: Math.max(0, focusMinute * PX_PER_MINUTE - HOUR_PX * 1.5) });
    // Only when the day changes; later ticks of the clock shouldn't move the grid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [span.from]);

  // A booking opened from elsewhere (search, the waiting list, a save) is brought into view.
  useEffect(() => {
    const block = scroller.current?.querySelector<HTMLElement>(`[data-booking="${selected}"]`);
    const view = scroller.current;
    if (!block || !view) return;
    const left = block.offsetLeft + LABEL_PX;
    if (
      left < view.scrollLeft + LABEL_PX ||
      left + block.offsetWidth > view.scrollLeft + view.clientWidth
    ) {
      view.scrollTo({ left: Math.max(0, left - LABEL_PX - HOUR_PX), behavior: "smooth" });
    }
  }, [selected]);

  const row = (
    key: string,
    label: React.ReactNode,
    bookings: ReservationOut[],
    table?: Pick<TableOut, "id">,
  ) => {
    const { placed, count } = lanes(bookings);
    return (
      <div key={key} role="row" className="flex border-b border-border last:border-b-0">
        <div
          role="rowheader"
          className="sticky left-0 z-20 flex shrink-0 flex-col justify-center border-r border-border bg-card px-5"
          style={{ width: LABEL_PX }}
        >
          {label}
        </div>
        <div
          role="cell"
          className="relative shrink-0"
          style={{
            width,
            height: count * LANE_PX,
            backgroundImage: "linear-gradient(to right, var(--border) 1px, transparent 1px)",
            backgroundSize: `${HOUR_PX}px 100%`,
          }}
        >
          {onBook &&
            table &&
            span.hours.map((hour, i) =>
              hour + 3_600_000 <= now ? null : (
                <button
                  key={hour}
                  type="button"
                  aria-label={t("bookAt", { time: format.hour(hour) })}
                  className="absolute inset-y-0 cursor-cell outline-none hover:bg-foreground/[0.03] focus-visible:bg-primary/10"
                  style={{ left: i * HOUR_PX, width: HOUR_PX }}
                  onClick={(event) => {
                    // Mouse clicks land on the quarter hour under the pointer; keys book on the hour.
                    const quarter = Math.floor(
                      (event.nativeEvent.offsetX / HOUR_PX) * (60 / STEP_MINUTES),
                    );
                    const at = hour + Math.max(0, quarter) * STEP_MINUTES * 60_000;
                    onBook(table, Math.max(at, Math.ceil(now / 900_000) * 900_000));
                  }}
                />
              ),
            )}
          {placed.map(({ booking, lane }) => (
            <Block
              key={booking.id}
              booking={booking}
              span={span}
              lane={lane}
              late={isLate(booking, now)}
              selected={booking.id === selected}
              onOpen={() => onOpen(booking)}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div ref={scroller} className="overflow-x-auto overscroll-x-contain">
      <div
        role="table"
        aria-label={t("label")}
        className="relative"
        style={{ width: LABEL_PX + width }}
      >
        <div
          role="row"
          className="flex h-10 border-b border-border text-xs font-bold text-muted-foreground"
        >
          <div
            role="columnheader"
            className="sticky left-0 z-20 flex shrink-0 items-center border-r border-border bg-card px-5 uppercase"
            style={{ width: LABEL_PX }}
          >
            {t("table")}
          </div>
          <div className="relative shrink-0" style={{ width }}>
            {span.hours.map((hour, i) => (
              <span
                key={hour}
                role="columnheader"
                className="absolute top-0 flex h-full items-center pl-2 font-medium whitespace-nowrap tabular-nums"
                style={{ left: i * HOUR_PX }}
              >
                {format.hour(hour)}
              </span>
            ))}
          </div>
        </div>

        {unassigned.length > 0 && (
          <>
            <AreaHeader>{t("requests")}</AreaHeader>
            {row(
              "unassigned",
              <>
                <span className="text-sm font-bold">{t("noTable")}</span>
                <span className="text-xs text-muted-foreground">{t("needsYes")}</span>
              </>,
              unassigned,
            )}
          </>
        )}

        {areas.map(({ area, rows }) => (
          <div key={area} role="rowgroup">
            <AreaHeader>
              {area || t("noArea")}
              <span className="font-normal"> · {t("tables", { n: rows.length })}</span>
            </AreaHeader>
            {rows.map((entry) =>
              row(
                String(entry.table!.id),
                <>
                  <span className="truncate text-sm font-bold">{entry.table!.number}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {entry.retired ? t("switchedOff") : t("seats", { n: entry.table!.seats })}
                  </span>
                </>,
                entry.bookings,
                entry.retired ? undefined : entry.table!,
              ),
            )}
          </div>
        ))}

        {nowAt !== null && (
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-primary"
            style={{ left: LABEL_PX + nowAt * PX_PER_MINUTE }}
          >
            <span className="absolute top-[34px] -left-1 size-2.5 -translate-x-px rounded-full bg-primary" />
          </div>
        )}
      </div>
    </div>
  );
}

function AreaHeader({ children }: { children: React.ReactNode }) {
  return (
    <div role="row" className="border-b border-border bg-muted/60">
      <div
        role="rowheader"
        className="sticky left-0 inline-block px-5 py-1.5 text-xs font-bold text-muted-foreground"
      >
        {children}
      </div>
    </div>
  );
}

type BlockProps = {
  booking: ReservationOut;
  span: DayWindow;
  lane: number;
  late: boolean;
  selected: boolean;
  onOpen: () => void;
};

function Block({ booking, span, lane, late, selected, onOpen }: BlockProps) {
  const t = useTranslations("reservations");
  const status = useTranslations("status.reservation");
  const format = useFormat();
  const { tone, icon: Icon } = BOOKING_LOOK[booking.status];
  const { offset, length } = blockSpan(booking, span);
  const time = format.time(booking.startsAt);
  const when =
    booking.status === "no_show"
      ? t("grid.noShowAt", { time })
      : late
        ? t("grid.lateAt", { time })
        : format.timeRange(booking.startsAt, booking.endsAt);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={selected}
      data-booking={booking.id}
      aria-label={t("grid.blockLabel", {
        name: booking.customerName,
        n: booking.partySize,
        when,
        status: status(booking.status),
      })}
      className={cn(
        "absolute z-10 flex flex-col justify-center gap-0.5 overflow-hidden rounded-lg border px-2.5 text-left outline-none",
        "transition-[box-shadow,translate] duration-(--duration-fast) ease-standard hover:-translate-y-px hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50",
        TONES[tone],
        TONE_EDGES[tone],
        booking.status === "requested" && "border-dashed",
        selected && "ring-2 ring-primary",
      )}
      style={{
        left: offset * PX_PER_MINUTE + 3,
        width: Math.max(length * PX_PER_MINUTE - 6, 36),
        top: lane * LANE_PX + 6,
        height: LANE_PX - 12,
      }}
    >
      <span className="flex min-w-0 items-center gap-1.5 text-sm font-bold">
        <Icon weight="duotone" className="size-3.5 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{booking.customerName}</span>
        <span className="flex shrink-0 items-center gap-0.5 text-xs tabular-nums">
          <UsersIcon className="size-3.5" aria-hidden />
          {format.number(booking.partySize)}
        </span>
      </span>
      <span className="flex min-w-0 items-center gap-1 text-xs whitespace-nowrap tabular-nums opacity-90">
        {late && <WarningCircleIcon weight="fill" className="size-3 shrink-0" aria-hidden />}
        <span className="truncate">{when}</span>
      </span>
    </button>
  );
}
