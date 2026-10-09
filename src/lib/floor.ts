import type { OrderOut, ReservationOut, TableOut } from "@/lib/api/schema";
import { groupByArea } from "@/lib/reservations";

// The API has no table status: a table is busy while it has an open order, and a booking
// holds it from shortly before the guests are due.

/** How early a booking starts to hold its table. */
export const HOLD_MINUTES = 60;
/** How far ahead "Up next" looks for arrivals. */
export const ARRIVING_HOURS = 3;

export type TableState =
  | { kind: "order"; order: OrderOut; others: number }
  | { kind: "booked"; booking: ReservationOut }
  | { kind: "free"; laterBooking: ReservationOut | null };

export type FloorTable = { table: TableOut; state: TableState };

const WAITING: readonly ReservationOut["status"][] = ["requested", "confirmed"];

const byStart = (a: ReservationOut, b: ReservationOut) =>
  Date.parse(a.startsAt) - Date.parse(b.startsAt);

/** Each active table with what's happening at it now. */
export function floorTables(
  tables: readonly TableOut[],
  orders: readonly OrderOut[],
  bookings: readonly ReservationOut[],
  now: number,
): FloorTable[] {
  return tables.map((table) => {
    const here = orders
      .filter((order) => order.table?.id === table.id)
      .toSorted((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    if (here.length > 0) {
      return { table, state: { kind: "order", order: here[0], others: here.length - 1 } };
    }

    const upcoming = bookings
      .filter(
        (booking) =>
          booking.table?.id === table.id &&
          (booking.status === "seated" ||
            (booking.status === "confirmed" && Date.parse(booking.endsAt) > now)),
      )
      .toSorted(byStart);
    const holding = upcoming.find(
      (booking) =>
        booking.status === "seated" || Date.parse(booking.startsAt) - now <= HOLD_MINUTES * 60_000,
    );
    if (holding) return { table, state: { kind: "booked", booking: holding } };
    return { table, state: { kind: "free", laterBooking: upcoming[0] ?? null } };
  });
}

/** Tables grouped by where they are, areas in the order the room was set up. */
export const byArea = (tables: readonly FloorTable[]) =>
  groupByArea(tables, (entry) => entry.table).map(({ area, items }) => ({ area, tables: items }));

export const FLOOR_VIEWS = ["all", "inUse", "free", "booked", "mine"] as const;
export type FloorView = (typeof FLOOR_VIEWS)[number];

export function matchesView(entry: FloorTable, view: FloorView, myEmployeeId: number | null) {
  switch (view) {
    case "all":
      return true;
    case "inUse":
      return entry.state.kind === "order";
    case "free":
      return entry.state.kind === "free";
    case "booked":
      return entry.state.kind === "booked";
    case "mine":
      return entry.table.employees.some((employee) => employee.id === myEmployeeId);
  }
}

/** Guests expected soon who haven't sat down yet. */
export const arrivals = (bookings: readonly ReservationOut[], now: number) =>
  bookings
    .filter((booking) => {
      if (!WAITING.includes(booking.status)) return false;
      const start = Date.parse(booking.startsAt);
      return start > now - 30 * 60_000 && start < now + ARRIVING_HOURS * 3_600_000;
    })
    .toSorted(byStart);
