import { describe, expect, it } from "vitest";
import type { OrderOut, ReservationOut, TableOut } from "@/lib/api/schema";
import {
  byDay,
  dayWindow,
  gridAreas,
  isLate,
  lanes,
  lengthChoices,
  openingHours,
  paidButSeated,
  timeSteps,
  upcomingAt,
  waitingList,
} from "./reservations";
import { areaNames, matchesTable, qrLink, shortCode } from "./tables";
import { businessDate } from "./format";

const DAY = "2026-10-11";
const at = (time: string, day = DAY) => `${day}T${time}:00+06:00`;
const NOW = Date.parse(at("20:54"));

const booking = (
  id: number,
  tableId: number | null,
  from: string,
  to: string,
  status: ReservationOut["status"] = "confirmed",
) =>
  ({
    id,
    status,
    partySize: 2,
    table: tableId ? { id: tableId, number: `T${tableId}` } : null,
    startsAt: at(from),
    endsAt: at(to),
  }) as ReservationOut;

const table = (id: number, number: string, location: string | null) =>
  ({ id, number, location, seats: 4 }) as TableOut;

describe("opening hours", () => {
  it("runs past midnight when closing comes before opening", () => {
    const { opens, closes } = openingHours(DAY, "17:00", "02:00");
    expect(new Date(opens).toISOString()).toBe("2026-10-11T11:00:00.000Z");
    expect((closes - opens) / 3_600_000).toBe(9);
  });

  it("treats the same opening and closing time as a full day", () => {
    const { opens, closes } = openingHours(DAY, "00:00", "00:00");
    expect((closes - opens) / 3_600_000).toBe(24);
  });
});

describe("dayWindow", () => {
  it("covers opening hours on whole hours", () => {
    const window = dayWindow(DAY, "11:00", "23:00");
    expect(window.hours).toHaveLength(12);
    expect(window.from).toBe(Date.parse(at("11:00")));
  });

  it("widens to fit a booking outside the hours", () => {
    const window = dayWindow(DAY, "11:00", "23:00", [booking(1, 1, "22:30", "23:45")]);
    expect(window.to).toBe(Date.parse(at("00:00", "2026-10-12")));
  });
});

describe("lanes", () => {
  it("stacks overlapping bookings and keeps back-to-back ones on one lane", () => {
    const { placed, count } = lanes([
      booking(1, 1, "19:00", "20:30"),
      booking(2, 1, "20:30", "22:00"),
      booking(3, 1, "20:00", "21:00", "requested"),
    ]);
    expect(count).toBe(2);
    expect(placed.map((p) => [p.booking.id, p.lane])).toEqual([
      [1, 0],
      [3, 1],
      [2, 0],
    ]);
  });
});

describe("gridAreas", () => {
  const tables = [table(2, "T2", "Ground"), table(1, "T1", "Ground"), table(3, "R1", "Roof")];

  it("groups tables by area and keeps requests without a table apart", () => {
    const { unassigned, areas } = gridAreas(tables, [
      booking(1, null, "21:30", "23:00", "requested"),
      booking(2, 1, "19:00", "20:30"),
      booking(3, 1, "18:00", "19:00", "cancelled"),
    ]);
    expect(unassigned.map((b) => b.id)).toEqual([1]);
    expect(areas.map((a) => [a.area, a.rows.map((r) => r.table?.number)])).toEqual([
      ["Ground", ["T1", "T2"]],
      ["Roof", ["R1"]],
    ]);
    expect(areas[0].rows[0].bookings.map((b) => b.id)).toEqual([2]);
  });

  it("gives a switched-off table a row while it still has bookings", () => {
    const { areas } = gridAreas(tables, [booking(4, 9, "19:00", "20:00")]);
    const retired = areas.flatMap((a) => a.rows).find((row) => row.retired);
    expect(retired?.table?.number).toBe("T9");
  });
});

describe("booking states", () => {
  it("flags confirmed guests 15 minutes late, not seated ones", () => {
    expect(isLate(booking(1, 1, "20:39", "22:00"), NOW)).toBe(true);
    expect(isLate(booking(1, 1, "20:40", "22:00"), NOW)).toBe(false);
    expect(isLate(booking(1, 1, "20:00", "22:00", "seated"), NOW)).toBe(false);
    expect(isLate(booking(1, 1, "19:00", "20:30"), NOW)).toBe(false);
  });

  it("lists requests that haven't ended, soonest first", () => {
    const list = waitingList(
      [
        booking(1, null, "23:00", "23:30", "requested"),
        booking(2, null, "19:00", "20:00", "requested"),
        booking(3, null, "21:30", "23:00", "requested"),
        booking(4, 1, "21:00", "22:00"),
      ],
      NOW,
    );
    expect(list.map((b) => b.id)).toEqual([3, 1]);
  });

  it("nudges a seated booking once its table has paid and nothing is open", () => {
    const seated = booking(1, 5, "19:00", "20:30", "seated");
    const paid = [{ table: { id: 5, number: "T5" }, updatedAt: at("20:40") }] as OrderOut[];
    const earlier = [{ table: { id: 5, number: "T5" }, updatedAt: at("18:40") }] as OrderOut[];
    const open = [{ table: { id: 5, number: "T5" } }] as OrderOut[];
    expect(paidButSeated(seated, [], paid)).toBe(true);
    expect(paidButSeated(seated, open, paid)).toBe(false);
    expect(paidButSeated(seated, [], earlier)).toBe(false);
  });

  it("finds bookings still to come at a table", () => {
    const list = upcomingAt(
      1,
      [
        booking(1, 1, "22:00", "23:00"),
        booking(2, 1, "18:00", "19:00"),
        booking(3, 1, "21:30", "23:00", "requested"),
        booking(4, 2, "22:00", "23:00"),
      ],
      NOW,
    );
    expect(list.map((b) => b.id)).toEqual([3, 1]);
  });
});

describe("booking sheet", () => {
  it("offers 15-minute starts inside opening hours, dropping the past today", () => {
    const steps = timeSteps(DAY, "11:00", "23:00", NOW);
    expect(new Date(steps[0]).toISOString()).toBe(new Date(at("20:45")).toISOString());
    expect(new Date(steps.at(-1)!).toISOString()).toBe(new Date(at("22:45")).toISOString());
    expect(timeSteps("2026-10-12", "11:00", "23:00", NOW)).toHaveLength(48);
  });

  it("slots an unusual default length into the choices", () => {
    expect(lengthChoices(90)).toEqual([60, 90, 120, 150, 180]);
    expect(lengthChoices(75)).toEqual([60, 75, 90, 120, 150, 180]);
  });

  it("groups search results by Dhaka day", () => {
    const groups = byDay(
      [booking(1, 1, "19:00", "20:00"), booking(2, 1, "01:00", "02:00")].concat(
        booking(3, 1, "12:00", "13:00"),
      ),
      (value) => businessDate(value),
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((b) => b.id)).toEqual([2, 3, 1]);
  });
});

describe("tables", () => {
  it("links QR codes without a locale", () => {
    expect(qrLink("https://example.com", "abc123XYZ")).toBe("https://example.com/t/abc123XYZ");
    expect(shortCode("abc123XYZ")).toBe("abc123");
  });

  it("lists areas once and matches by number or area", () => {
    const tables = [table(1, "T1", "Ground"), table(2, "R1", "Roof"), table(3, "T2", "Ground ")];
    expect(areaNames(tables)).toEqual(["Ground", "Roof"]);
    expect(matchesTable(tables[1], "roo")).toBe(true);
    expect(matchesTable(tables[0], "r1")).toBe(false);
  });
});
