import { describe, expect, it } from "vitest";
import {
  ageTone,
  boardColumn,
  countQuery,
  forwardMove,
  minutesSince,
  ordersQuery,
  rangeDates,
  summarizeItems,
  type OrderFilters,
} from "./orders";

// 8:54 pm on Sunday 11 October in Dhaka.
const NOW = Date.parse("2026-10-11T14:54:00Z");

const filters: OrderFilters = {
  tab: "all",
  search: "",
  sources: [],
  tableId: null,
  range: "today",
  waiterId: null,
  sort: "-createdAt",
  page: 1,
  size: 20,
};

describe("rangeDates", () => {
  it("follows the Dhaka day, not UTC", () => {
    // 1:30 am in Dhaka is still the previous day in UTC.
    expect(rangeDates("today", Date.parse("2026-10-11T19:30:00Z"))).toEqual({
      dateFrom: "2026-10-12",
      dateTo: "2026-10-12",
    });
  });

  it("covers yesterday, the last 7 days and this month", () => {
    expect(rangeDates("yesterday", NOW)).toEqual({ dateFrom: "2026-10-10", dateTo: "2026-10-10" });
    expect(rangeDates("week", NOW)).toEqual({ dateFrom: "2026-10-05", dateTo: "2026-10-11" });
    expect(rangeDates("month", NOW)).toEqual({ dateFrom: "2026-10-01", dateTo: "2026-10-11" });
    expect(rangeDates("any", NOW)).toEqual({});
  });

  it("crosses month and year ends", () => {
    expect(rangeDates("yesterday", Date.parse("2026-01-01T06:00:00Z"))).toEqual({
      dateFrom: "2025-12-31",
      dateTo: "2025-12-31",
    });
  });
});

describe("ordersQuery", () => {
  it("open orders ignore the date range", () => {
    expect(ordersQuery({ ...filters, tab: "open" }, NOW)).toEqual({
      active: true,
      sort: "-createdAt",
      page: 1,
      size: 20,
    });
  });

  it("closed tabs keep the range and the filters", () => {
    expect(
      ordersQuery(
        { ...filters, tab: "paid", search: " 22 ", sources: ["qr"], tableId: 4, waiterId: 2 },
        NOW,
      ),
    ).toEqual({
      status: ["paid"],
      dateFrom: "2026-10-11",
      dateTo: "2026-10-11",
      search: "22",
      source: ["qr"],
      tableId: 4,
      waiterId: 2,
      sort: "-createdAt",
      page: 1,
      size: 20,
    });
  });

  it("counts ask for a single row and drop the search", () => {
    const query = countQuery("cancelled", { ...filters, search: "rafiq", page: 3 }, NOW);
    expect(query).toMatchObject({ status: ["cancelled"], page: 1, size: 1 });
    expect(query.search).toBeUndefined();
  });
});

describe("summarizeItems", () => {
  const items = [
    { foodName: "Beef Bhuna", quantity: 2 },
    { foodName: "Plain Polao", quantity: 2 },
    { foodName: "Borhani", quantity: 1 },
  ];

  it("keeps the first lines and counts the rest", () => {
    expect(summarizeItems(items)).toEqual({ shown: items.slice(0, 2), more: 1 });
    expect(summarizeItems(items, 5).more).toBe(0);
  });
});

describe("board and time", () => {
  it("groups pending and confirmed as waiting", () => {
    expect(boardColumn("pending")).toBe("waiting");
    expect(boardColumn("confirmed")).toBe("waiting");
    expect(boardColumn("served")).toBe("served");
    expect(boardColumn("paid")).toBeNull();
  });

  it("counts whole minutes and flags long waits", () => {
    expect(minutesSince("2026-10-11T14:35:00Z", NOW)).toBe(19);
    expect(minutesSince("2026-10-11T15:00:00Z", NOW)).toBe(0);
    expect(ageTone(8)).toBe("slate");
    expect(ageTone(19)).toBe("amber");
    expect(ageTone(45)).toBe("red");
  });

  it("never offers cancel as the main move", () => {
    expect(forwardMove(["cancelled", "served"])).toBe("served");
    expect(forwardMove(["cancelled"])).toBeNull();
  });
});
