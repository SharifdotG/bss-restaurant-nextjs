import { describe, expect, it } from "vitest";
import type { LiveOrder } from "@/lib/live/types";
import { bottomTabs, goShortcuts, morePages, navCounts, navGroups } from "./navigation";

const order = (status: LiveOrder["status"], total = 500, balanceDue = total): LiveOrder => ({
  id: Math.random(),
  orderNumber: "261011-0001",
  orderType: "dine_in",
  source: "staff",
  status,
  table: null,
  waiter: null,
  customerName: null,
  notes: null,
  items: [],
  itemCount: 1,
  total,
  balanceDue,
  createdAt: "2026-10-11T14:00:00Z",
  updatedAt: "2026-10-11T14:00:00Z",
});

describe("navGroups", () => {
  it("gives managers both groups in sidebar order", () => {
    expect(navGroups("manager")).toEqual([
      {
        id: "service",
        pages: ["overview", "orders", "floor", "kitchen", "billing", "reservations"],
      },
      { id: "manage", pages: ["menu", "tables", "staff", "expenses", "reports", "settings"] },
    ]);
  });

  it("only lists what a chef can open", () => {
    expect(navGroups("chef")).toEqual([
      { id: "service", pages: ["kitchen"] },
      { id: "manage", pages: ["menu"] },
    ]);
  });

  it("keeps the cashier's expenses and drops manager pages", () => {
    expect(navGroups("cashier").flatMap((group) => group.pages)).toEqual([
      "overview",
      "orders",
      "floor",
      "billing",
      "reservations",
      "menu",
      "expenses",
    ]);
  });
});

describe("phone tabs", () => {
  it("puts the waiter's new order in the middle", () => {
    expect(bottomTabs("waiter")).toEqual(["floor", "orders", "newOrder", "reservations"]);
  });

  it("moves everything else behind More", () => {
    expect(morePages("cashier")).toEqual(["overview", "floor", "menu", "expenses"]);
    expect(morePages("chef")).toEqual([]);
  });
});

describe("navCounts", () => {
  it("counts open orders and the bills waiting at the till", () => {
    const orders = [
      order("pending"),
      order("preparing"),
      order("served"),
      order("ready", 800, 300), // part paid by card
      order("confirmed", 500, 500),
    ];
    expect(navCounts(orders)).toEqual({ orders: 5, billing: 2 });
  });
});

describe("goShortcuts", () => {
  it("only offers keys for pages the role can open", () => {
    expect(goShortcuts("chef")).toEqual([
      ["kitchen", "k"],
      ["menu", "m"],
    ]);
  });

  it("never gives two pages the same key", () => {
    const keys = goShortcuts("admin").map(([, key]) => key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
