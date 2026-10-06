import { describe, expect, it } from "vitest";
import type { FoodOut, TopFood } from "@/lib/api/schema";
import type { LiveOrder } from "@/lib/live/types";
import { attentionPicks, pipeline } from "./overview";
import {
  autoGroup,
  categoryTotals,
  change,
  compareRange,
  matchPreset,
  niceScale,
  perHundred,
  presetRange,
  rangeDays,
  scaleTicks,
  slowDishes,
  spanRange,
  TOP_FOODS_LIMIT,
} from "./reports";

const today = "2026-10-11";

describe("ranges", () => {
  it("builds the presets in business days", () => {
    expect(presetRange("today", today)).toEqual({ from: today, to: today });
    expect(presetRange("week", today)).toEqual({ from: "2026-10-05", to: today });
    expect(presetRange("month", today)).toEqual({ from: "2026-10-01", to: today });
    expect(presetRange("lastMonth", today)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(presetRange("year", today)).toEqual({ from: "2026-01-01", to: today });
    expect(presetRange("lastMonth", "2026-01-15")).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
    });
  });

  it("recognises a preset from its dates", () => {
    expect(matchPreset({ from: "2026-10-05", to: today }, today)).toBe("week");
    expect(matchPreset({ from: "2026-10-04", to: today }, today)).toBeNull();
  });

  it("counts both ends", () => {
    expect(rangeDays({ from: today, to: today })).toBe(1);
    expect(rangeDays({ from: "2026-10-01", to: today })).toBe(11);
  });

  it("compares a month so far with the same days of the month before", () => {
    expect(compareRange({ from: "2026-10-01", to: today })).toEqual({
      from: "2026-09-01",
      to: "2026-09-11",
    });
    // Short months clamp, and a whole month compares with the whole month before.
    expect(compareRange({ from: "2026-03-01", to: "2026-03-31" })).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
    expect(compareRange({ from: "2026-03-01", to: "2026-03-30" })).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });

  it("compares the year so far with last year, anything else with the days before", () => {
    expect(compareRange({ from: "2026-01-01", to: today })).toEqual({
      from: "2025-01-01",
      to: "2025-10-11",
    });
    expect(compareRange({ from: "2026-10-05", to: today })).toEqual({
      from: "2026-09-28",
      to: "2026-10-04",
    });
    expect(compareRange({ from: today, to: today })).toEqual({
      from: "2026-10-10",
      to: "2026-10-10",
    });
  });

  it("groups by what fits on a chart", () => {
    expect(autoGroup({ from: "2026-10-01", to: "2026-10-31" })).toBe("day");
    expect(autoGroup({ from: "2026-06-01", to: today })).toBe("week");
    expect(autoGroup({ from: "2026-01-01", to: today })).toBe("month");
    expect(autoGroup({ from: "2020-01-01", to: today })).toBe("year");
  });

  it("gives the overview spans", () => {
    expect(spanRange("days14", today)).toEqual({ from: "2026-09-28", to: today, groupBy: "day" });
    expect(spanRange("year", today).groupBy).toBe("month");
  });
});

describe("numbers", () => {
  it("only gives a percentage when there is something to compare with", () => {
    expect(change(110, 100)).toBeCloseTo(10);
    expect(change(90, 100)).toBeCloseTo(-10);
    expect(change(-50, -100)).toBeCloseTo(50);
    expect(change(50, 0)).toBeNull();
  });

  it("rounds an axis up to a readable top", () => {
    expect(niceScale(63_840)).toEqual({ top: 80_000, step: 20_000 });
    expect(niceScale(43_790)).toEqual({ top: 60_000, step: 15_000 });
    expect(niceScale(0)).toEqual({ top: 4000, step: 1000 });
    expect(scaleTicks({ top: 80_000, step: 20_000 })).toEqual([0, 20_000, 40_000, 60_000, 80_000]);
  });

  it("splits every ৳100 of sales", () => {
    const split = perHundred({
      sales: 390_420,
      vat: 27_238.61,
      refunds: 1_276.88,
      expenses: 305_440,
      profit: 56_464.51,
      orders: 312,
      averageOrder: 1251.35,
      discounts: 0,
    })!;
    expect(split.vat).toBeCloseTo(6.98, 2);
    expect(split.expenses).toBeCloseTo(78.23, 2);
    expect(split.vat + split.refunds + split.expenses + split.profit).toBeCloseTo(100, 6);
    expect(
      perHundred({
        sales: 0,
        vat: 0,
        refunds: 0,
        expenses: 0,
        profit: 0,
        orders: 0,
        averageOrder: 0,
        discounts: 0,
      }),
    ).toBeNull();
  });
});

const sold = (id: number, name: string, quantity: number, revenue: number, category = "Curries") =>
  ({ id, name, category, quantity, orders: quantity, revenue }) as TopFood;
const food = (id: number, name: string, isAvailable = true) =>
  ({ id, name, isAvailable, category: { id: 1, name: "Starters" } }) as FoodOut;

describe("dishes", () => {
  it("adds up food revenue per category", () => {
    const totals = categoryTotals([
      sold(1, "Beef Bhuna", 9, 3150.1),
      sold(2, "Kacchi", 14, 5880, "Rice"),
      sold(3, "Shorshe Ilish", 6, 3000.2),
    ]);
    expect(totals.map((t) => t.category)).toEqual(["Curries", "Rice"]);
    expect(totals[0].revenue).toBe(6150.3);
    expect(totals[0].plates).toBe(15);
    expect(totals[0].share + totals[1].share).toBeCloseTo(100);
  });

  it("puts unsold dishes first, but only when the report is complete", () => {
    const report = [sold(1, "Kacchi", 14, 5880), sold(2, "Fuchka", 2, 200)];
    const menu = [food(1, "Kacchi"), food(2, "Fuchka"), food(3, "Chotpoti"), food(4, "Off", false)];
    expect(slowDishes(menu, report).map((d) => d.name)).toEqual(["Chotpoti", "Fuchka", "Kacchi"]);

    const full = Array.from({ length: TOP_FOODS_LIMIT }, (_, i) =>
      sold(i + 10, `Dish ${i}`, 50 - i, 100),
    );
    expect(slowDishes(menu, full, 1)[0].name).toBe("Dish 49");
  });
});

const live = (
  id: number,
  status: LiveOrder["status"],
  minutesAgo: number,
  extra: Partial<LiveOrder> = {},
) =>
  ({
    id,
    status,
    source: "staff",
    createdAt: new Date(Date.parse("2026-10-11T14:00:00Z") - minutesAgo * 60_000).toISOString(),
    updatedAt: new Date(Date.parse("2026-10-11T14:00:00Z") - minutesAgo * 60_000).toISOString(),
    ...extra,
  }) as LiveOrder;

describe("overview", () => {
  it("lines up open orders by status, oldest first", () => {
    const lanes = pipeline([live(1, "ready", 5), live(2, "ready", 20), live(3, "paid", 1)]);
    expect(lanes.ready.map((o) => o.id)).toEqual([2, 1]);
    expect(lanes.pending).toEqual([]);
  });

  it("picks guests waiting, then food at the pass, then the longest kitchen wait", () => {
    const picks = attentionPicks(
      [
        live(1, "preparing", 30),
        live(2, "ready", 40, { updatedAt: "2026-10-11T13:58:00Z" }),
        live(3, "pending", 2, { source: "qr" }),
        live(4, "confirmed", 45),
        live(5, "pending", 3),
      ],
      3,
    );
    expect(picks.map((p) => [p.order.id, p.reason])).toEqual([
      [3, "guest"],
      [2, "ready"],
      [4, "kitchen"],
    ]);
  });
});
