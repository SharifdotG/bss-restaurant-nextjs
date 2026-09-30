import { describe, expect, it } from "vitest";
import type { OrderOut, ReservationOut, TableOut } from "@/lib/api/schema";
import { arrivals, byArea, floorTables, matchesView } from "./floor";

const NOW = Date.parse("2026-10-11T14:54:00Z"); // 8:54 pm in Dhaka
const minutes = (n: number) => new Date(NOW + n * 60_000).toISOString();

const table = (id: number, number: string, location: string | null, employees: number[] = []) =>
  ({ id, number, location, seats: 4, employees: employees.map((e) => ({ id: e })) }) as TableOut;

const order = (id: number, tableId: number, createdAt: string) =>
  ({ id, table: { id: tableId, number: "" }, createdAt }) as OrderOut;

const booking = (
  id: number,
  tableId: number | null,
  start: number,
  status: ReservationOut["status"] = "confirmed",
) =>
  ({
    id,
    status,
    table: tableId ? { id: tableId, number: "" } : null,
    startsAt: minutes(start),
    endsAt: minutes(start + 90),
  }) as ReservationOut;

// Sorted by number, as the API returns them: R1 comes before the ground floor.
const tables = [
  table(3, "R1", "Rooftop"),
  table(1, "T1", "Ground floor", [7]),
  table(2, "T2", "Ground floor"),
];

describe("floorTables", () => {
  it("puts the oldest open order on a busy table", () => {
    const [, t1] = floorTables(
      tables,
      [order(9, 1, minutes(-5)), order(8, 1, minutes(-20))],
      [],
      NOW,
    );
    expect(t1.state).toMatchObject({ kind: "order", order: { id: 8 }, others: 1 });
  });

  it("holds a table for a booking due within the hour", () => {
    const states = floorTables(tables, [], [booking(1, 2, 30), booking(2, 3, 150)], NOW);
    expect(states[2].state).toMatchObject({ kind: "booked", booking: { id: 1 } });
    expect(states[0].state).toMatchObject({ kind: "free", laterBooking: { id: 2 } });
  });

  it("keeps seated guests on their table and ignores finished bookings", () => {
    const states = floorTables(
      tables,
      [],
      [booking(1, 2, -40, "seated"), booking(2, 3, -200), booking(3, 1, 10, "cancelled")],
      NOW,
    );
    expect(states[2].state.kind).toBe("booked");
    expect(states[0].state).toMatchObject({ kind: "free", laterBooking: null });
    expect(states[1].state.kind).toBe("free");
  });
});

describe("views and areas", () => {
  const states = floorTables(tables, [order(1, 2, minutes(-5))], [], NOW);

  it("groups by area in setup order, whatever the table numbers", () => {
    expect(byArea(states).map((group) => [group.area, group.tables.length])).toEqual([
      ["Ground floor", 2],
      ["Rooftop", 1],
    ]);
  });

  it("filters by what's happening and by who's assigned", () => {
    expect(states.filter((entry) => matchesView(entry, "inUse", null))).toHaveLength(1);
    expect(states.filter((entry) => matchesView(entry, "free", null))).toHaveLength(2);
    expect(
      states.filter((entry) => matchesView(entry, "mine", 7)).map((e) => e.table.number),
    ).toEqual(["T1"]);
  });
});

describe("arrivals", () => {
  it("lists guests due in the next three hours, soonest first", () => {
    const list = arrivals(
      [
        booking(1, 1, 200),
        booking(2, null, 35, "requested"),
        booking(3, 2, 6),
        booking(4, 3, -10, "seated"),
      ],
      NOW,
    );
    expect(list.map((b) => b.id)).toEqual([3, 2]);
  });
});
