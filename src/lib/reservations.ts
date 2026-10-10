import type { Icon } from "@phosphor-icons/react";
import {
  ArmchairIcon,
  CheckCircleIcon,
  HourglassMediumIcon,
  ProhibitIcon,
  SealCheckIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import type { OrderOut, ReservationOut, ReservationStatus, TableOut } from "@/lib/api/schema";
import { dhakaDateTime, shiftDay } from "@/lib/format";
import type { Tone } from "@/lib/tones";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Confirmed guests this long past their time get a "late" tag. */
export const LATE_MINUTES = 15;
/** Booking times in the sheet move in these steps. */
export const STEP_MINUTES = 15;
export const LENGTHS = [60, 90, 120, 150, 180];
/** Website requests can be made this far ahead (API rule), so the waiting list looks as far. */
export const REQUEST_DAYS = 60;

export const BOOKING_LOOK: Record<ReservationStatus, { tone: Tone; icon: Icon }> = {
  requested: { tone: "amber", icon: HourglassMediumIcon },
  confirmed: { tone: "green", icon: SealCheckIcon },
  seated: { tone: "orange", icon: ArmchairIcon },
  completed: { tone: "slate", icon: CheckCircleIcon },
  no_show: { tone: "red", icon: ProhibitIcon },
  cancelled: { tone: "slate", icon: XCircleIcon },
  declined: { tone: "slate", icon: XCircleIcon },
};

/** What the grid draws. Cancelled and declined bookings only turn up in search. */
export const ON_GRID: readonly ReservationStatus[] = [
  "requested",
  "confirmed",
  "seated",
  "completed",
  "no_show",
];

type BookingLike = Pick<ReservationOut, "id" | "status" | "startsAt" | "endsAt"> & {
  table: { id: number; number: string } | null;
};

const start = (booking: Pick<ReservationOut, "startsAt">) => Date.parse(booking.startsAt);
const end = (booking: Pick<ReservationOut, "endsAt">) => Date.parse(booking.endsAt);
export const byStart = (a: Pick<ReservationOut, "startsAt">, b: Pick<ReservationOut, "startsAt">) =>
  start(a) - start(b);

const toMinutes = (time: string) => {
  const [hours = 0, mins = 0] = time.split(":").map(Number);
  return hours * 60 + mins;
};

/** Opening and closing on a business day as timestamps. Closing before opening runs past midnight. */
export function openingHours(day: string, opensAt: string, closesAt: string) {
  const opens = Date.parse(dhakaDateTime(day, opensAt.slice(0, 5)));
  const span = (toMinutes(closesAt) - toMinutes(opensAt) + 1440) % 1440 || 1440;
  return { opens, closes: opens + span * MINUTE };
}

export type DayWindow = { from: number; to: number; hours: number[] };

/**
 * The stretch of a day the grid covers: opening to closing on whole hours, widened to take in
 * any booking made outside them.
 */
export function dayWindow(
  day: string,
  opensAt: string,
  closesAt: string,
  bookings: readonly Pick<ReservationOut, "startsAt" | "endsAt">[] = [],
): DayWindow {
  const { opens, closes } = openingHours(day, opensAt, closesAt);
  // Dhaka is a whole number of hours from UTC, so flooring to the hour works on timestamps.
  let from = Math.floor(opens / HOUR) * HOUR;
  let to = Math.ceil(closes / HOUR) * HOUR;
  for (const booking of bookings) {
    from = Math.min(from, Math.floor(start(booking) / HOUR) * HOUR);
    to = Math.max(to, Math.ceil(end(booking) / HOUR) * HOUR);
  }
  const hours = Array.from({ length: (to - from) / HOUR }, (_, i) => from + i * HOUR);
  return { from, to, hours };
}

/** Where a booking sits on the grid, in minutes from the window's start. */
export const blockSpan = (
  booking: Pick<ReservationOut, "startsAt" | "endsAt">,
  window: DayWindow,
) => ({
  offset: (Math.max(start(booking), window.from) - window.from) / MINUTE,
  length: (Math.min(end(booking), window.to) - Math.max(start(booking), window.from)) / MINUTE,
});

/**
 * Overlapping bookings on one table stacked into lanes, first fit. Only confirmed and seated
 * bookings hold a table, so a request or a no-show can share its time with another booking.
 */
export function lanes<T extends Pick<ReservationOut, "startsAt" | "endsAt">>(
  bookings: readonly T[],
) {
  const ends: number[] = [];
  const placed = bookings.toSorted(byStart).map((booking) => {
    let lane = ends.findIndex((laneEnd) => laneEnd <= start(booking));
    if (lane === -1) lane = ends.length;
    ends[lane] = end(booking);
    return { booking, lane };
  });
  return { placed, count: Math.max(ends.length, 1) };
}

export type GridRow<T> = {
  /** null is the row for website requests that don't have a table yet. */
  table: Pick<TableOut, "id" | "number" | "seats" | "location"> | null;
  /** The table was switched off or deleted but still has bookings on this day. */
  retired?: boolean;
  bookings: T[];
};

export type GridArea<T> = { area: string; rows: GridRow<T>[] };

/** Tables grouped by area in the order the room was set up, numbers in natural order. */
export function groupByArea<T>(
  items: readonly T[],
  tableOf: (item: T) => Pick<TableOut, "id" | "number" | "location">,
) {
  const areas = new Map<string, T[]>();
  for (const item of items.toSorted((a, b) => tableOf(a).id - tableOf(b).id)) {
    const area = tableOf(item).location?.trim() || "";
    areas.set(area, [...(areas.get(area) ?? []), item]);
  }
  return [...areas].map(([area, entries]) => ({
    area,
    items: entries.toSorted((a, b) =>
      tableOf(a).number.localeCompare(tableOf(b).number, "en", { numeric: true }),
    ),
  }));
}

/** The grid's rows: a no-table row when needed, then each area's tables with their bookings. */
export function gridAreas<T extends BookingLike>(
  tables: readonly TableOut[],
  bookings: readonly T[],
): { unassigned: T[]; areas: GridArea<T>[] } {
  const shown = bookings.filter((booking) => ON_GRID.includes(booking.status));
  const known = new Set(tables.map((table) => table.id));
  const rows: GridRow<T>[] = tables.map((table) => ({
    table,
    bookings: shown.filter((booking) => booking.table?.id === table.id),
  }));
  // A table switched off after it was booked still needs a row, or its guests vanish.
  const retired = new Map<number, GridRow<T>>();
  for (const booking of shown) {
    if (!booking.table || known.has(booking.table.id)) continue;
    const row = retired.get(booking.table.id) ?? {
      table: { ...booking.table, seats: 0, location: null },
      retired: true,
      bookings: [],
    };
    row.bookings.push(booking);
    retired.set(booking.table.id, row);
  }

  const areas = groupByArea([...rows, ...retired.values()], (row) => row.table!).map(
    ({ area, items }) => ({ area, rows: items }),
  );
  return { unassigned: shown.filter((booking) => !booking.table), areas };
}

/** Confirmed guests who haven't turned up 15 minutes after their time, while it still matters. */
export const isLate = (
  booking: Pick<ReservationOut, "status" | "startsAt" | "endsAt">,
  now: number,
) =>
  booking.status === "confirmed" &&
  now - start(booking) >= LATE_MINUTES * MINUTE &&
  now < end(booking);

/** Requests still worth answering, soonest first. */
export const waitingList = <T extends Pick<ReservationOut, "status" | "startsAt" | "endsAt">>(
  bookings: readonly T[],
  now: number,
) => bookings.filter((b) => b.status === "requested" && end(b) > now).toSorted(byStart);

/**
 * Seated guests whose table has paid since they sat down and has nothing open: they've most
 * likely left, and the booking is still holding the table.
 */
export function paidButSeated(
  booking: Pick<ReservationOut, "status" | "startsAt"> & { table: { id: number } | null },
  open: readonly Pick<OrderOut, "table">[],
  paid: readonly Pick<OrderOut, "table" | "updatedAt">[],
) {
  if (booking.status !== "seated" || !booking.table) return false;
  const tableId = booking.table.id;
  if (open.some((order) => order.table?.id === tableId)) return false;
  return paid.some(
    (order) => order.table?.id === tableId && Date.parse(order.updatedAt) > start(booking),
  );
}

/**
 * Start times for the booking sheet: every 15 minutes from opening until the last slot that
 * still starts before closing. Today drops the ones already gone.
 */
export function timeSteps(day: string, opensAt: string, closesAt: string, now: number) {
  const { opens, closes } = openingHours(day, opensAt, closesAt);
  const steps: number[] = [];
  for (let at = opens; at < closes; at += STEP_MINUTES * MINUTE) {
    if (at >= now - STEP_MINUTES * MINUTE) steps.push(at);
  }
  return steps;
}

/** The next step on or after a moment, for "book this table now". */
export const roundUpToStep = (at: number) =>
  Math.ceil(at / (STEP_MINUTES * MINUTE)) * STEP_MINUTES * MINUTE;

/** The length choices, with the restaurant's default slotted in if it's unusual. */
export const lengthChoices = (standard: number) =>
  LENGTHS.includes(standard) ? LENGTHS : [...LENGTHS, standard].toSorted((a, b) => a - b);

/** Search results by business day, soonest day first. */
export function byDay<T extends Pick<ReservationOut, "startsAt">>(
  bookings: readonly T[],
  dayOf: (at: string) => string,
) {
  const days = new Map<string, T[]>();
  for (const booking of bookings.toSorted(byStart)) {
    const day = dayOf(booking.startsAt);
    days.set(day, [...(days.get(day) ?? []), booking]);
  }
  return [...days].map(([day, items]) => ({ day, items }));
}

/** Requests can be for any day up to two months out; the list query spans that. */
export const requestRange = (today: string) => ({
  dateFrom: today,
  dateTo: shiftDay(today, REQUEST_DAYS),
});

/** Bookings that will still need a table, for warnings before a table is switched off or shrunk. */
export const upcomingAt = <T extends BookingLike & Pick<ReservationOut, "partySize">>(
  tableId: number,
  bookings: readonly T[],
  now: number,
) =>
  bookings
    .filter(
      (booking) =>
        booking.table?.id === tableId &&
        (booking.status === "requested" || booking.status === "confirmed") &&
        end(booking) > now,
    )
    .toSorted(byStart);
