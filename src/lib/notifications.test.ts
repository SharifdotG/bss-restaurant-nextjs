import { describe, expect, it } from "vitest";
import type { LiveOrder, LiveReservation } from "@/lib/live/types";
import { notices } from "./notifications";

const order = (id: number, status: LiveOrder["status"], source: LiveOrder["source"] = "staff") =>
  ({
    id,
    orderNumber: `261011-00${id}`,
    orderType: "dine_in",
    source,
    status,
    table: null,
    waiter: null,
    customerName: null,
    notes: null,
    items: [],
    itemCount: 1,
    total: 300,
    balanceDue: 300,
    createdAt: `2026-10-11T14:${10 + id}:00Z`,
    updatedAt: `2026-10-11T14:${10 + id}:00Z`,
  }) satisfies LiveOrder;

const booking = (id: number, status: LiveReservation["status"]): LiveReservation => ({
  id,
  source: "online",
  status,
  table: null,
  partySize: 2,
  startsAt: "2026-10-11T15:30:00Z",
  endsAt: "2026-10-11T17:00:00Z",
  customerName: "Sakib",
  customerPhone: "01700000000",
  notes: null,
  updatedAt: "2026-10-11T14:05:00Z",
});

const orders = [
  order(1, "pending", "qr"),
  order(2, "pending", "staff"),
  order(3, "confirmed"),
  order(4, "ready"),
  order(5, "preparing"),
];
const bookings = [booking(1, "requested"), booking(2, "confirmed")];
const keys = (role: Parameters<typeof notices>[0]) =>
  notices(role, orders, bookings).map((notice) => notice.key);

describe("notices", () => {
  it("gives a waiter guest orders to accept, food to serve and booking requests", () => {
    expect(keys("waiter")).toEqual(["ready:4", "incoming:1", "request:1"]);
  });

  it("gives the chef only confirmed tickets to start", () => {
    expect(keys("chef")).toEqual(["toCook:3"]);
  });

  it("leaves serving to the floor for a cashier", () => {
    expect(keys("cashier")).toEqual(["incoming:1", "request:1"]);
  });
});
