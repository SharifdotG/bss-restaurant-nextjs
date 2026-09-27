import { describe, expect, it } from "vitest";
import type { UserRole as Role } from "@/lib/api/schema";
import {
  can,
  canAddItems,
  canManageAccount,
  canOpen,
  canRefund,
  canReplaceItems,
  canTakePayment,
  cancelNeedsRefund,
  landingPath,
  orderMoves,
  pageForPath,
  reservationMoves,
  type Page,
} from "./permissions";

const ROLES: Role[] = ["admin", "manager", "cashier", "waiter", "chef"];

// The table agreed for S7; admin matches manager.
const PAGES: Record<Page, Role[]> = {
  overview: ["admin", "manager", "cashier"],
  orders: ["admin", "manager", "cashier", "waiter"],
  newOrder: ["admin", "manager", "cashier", "waiter"],
  floor: ["admin", "manager", "cashier", "waiter"],
  kitchen: ["admin", "manager", "chef"],
  billing: ["admin", "manager", "cashier"],
  reservations: ["admin", "manager", "cashier", "waiter"],
  menu: ROLES,
  tables: ["admin", "manager"],
  staff: ["admin", "manager"],
  expenses: ["admin", "manager", "cashier"],
  reports: ["admin", "manager"],
  settings: ["admin", "manager"],
  profile: ROLES,
};

describe("pages", () => {
  it.each(Object.entries(PAGES) as [Page, Role[]][])("%s is open to %j", (page, allowed) => {
    expect(ROLES.filter((role) => canOpen(role, page))).toEqual(allowed);
  });

  it("lands each role on its own workspace, and every landing page is open to it", () => {
    expect(ROLES.map(landingPath)).toEqual([
      "/overview",
      "/overview",
      "/billing",
      "/floor",
      "/kitchen",
    ]);
    for (const role of ROLES) expect(canOpen(role, pageForPath(landingPath(role))!)).toBe(true);
  });

  it("finds the page behind a path", () => {
    expect(pageForPath("/orders")).toBe("orders");
    expect(pageForPath("/orders/42")).toBe("orders");
    expect(pageForPath("/orders/new")).toBe("newOrder");
    expect(pageForPath("/ordersx")).toBeNull();
    expect(pageForPath("/")).toBeNull();
  });
});

describe("actions", () => {
  it("keeps the till and refunds away from the floor", () => {
    expect(ROLES.filter((role) => can(role, "order.pay"))).toEqual(["admin", "manager", "cashier"]);
    expect(ROLES.filter((role) => can(role, "order.refund"))).toEqual(["admin", "manager"]);
  });

  it("lets the chef mark dishes sold out but not edit the menu", () => {
    expect(can("chef", "menu.soldOut")).toBe(true);
    expect(can("chef", "menu.edit")).toBe(false);
  });

  it("only lets an admin manage admin and manager logins", () => {
    expect(canManageAccount("manager", "waiter")).toBe(true);
    expect(canManageAccount("manager", "manager")).toBe(false);
    expect(canManageAccount("manager", "admin")).toBe(false);
    expect(canManageAccount("admin", "manager")).toBe(true);
    expect(canManageAccount("cashier", "waiter")).toBe(false);
  });
});

const order = (status: Parameters<typeof orderMoves>[1]["status"], paid = 0) => ({
  status,
  total: 500,
  balanceDue: 500 - paid,
});

describe("order moves", () => {
  it("narrows the API's nextStatuses to what the role may do", () => {
    expect(
      orderMoves("waiter", { ...order("pending"), nextStatuses: ["confirmed", "cancelled"] }),
    ).toEqual(["confirmed", "cancelled"]);
    expect(orderMoves("chef", order("pending"))).toEqual([]);
    expect(orderMoves("chef", order("confirmed"))).toEqual(["preparing"]);
    expect(orderMoves("cashier", order("ready"))).toEqual([]);
    expect(orderMoves("waiter", order("ready"))).toEqual(["served"]);
  });

  it("leaves cancelling a cooking order to managers", () => {
    expect(orderMoves("waiter", order("preparing"))).toEqual([]);
    expect(orderMoves("chef", order("preparing"))).toEqual(["ready"]);
    expect(orderMoves("manager", order("preparing"))).toEqual(["ready", "cancelled"]);
    expect(orderMoves("admin", order("preparing"))).toEqual(["ready", "cancelled"]);
  });

  it("never offers paid by hand", () => {
    for (const role of ROLES) expect(orderMoves(role, order("served"))).toEqual([]);
  });

  it("asks for a refund before cancelling a paid order", () => {
    expect(cancelNeedsRefund(order("confirmed"))).toBe(false);
    expect(cancelNeedsRefund(order("confirmed", 200))).toBe(true);
    expect(cancelNeedsRefund({ ...order("confirmed"), amountPaid: 50 })).toBe(true);
  });

  it("locks items once the kitchen starts, but still takes additions", () => {
    expect(canReplaceItems("waiter", order("confirmed"))).toBe(true);
    expect(canReplaceItems("waiter", order("preparing"))).toBe(false);
    expect(canAddItems("waiter", order("preparing"))).toBe(true);
    expect(canAddItems("waiter", order("ready"))).toBe(false);
    expect(canAddItems("chef", order("pending"))).toBe(false);
  });

  it("takes payments while something is due and refunds what was paid", () => {
    expect(canTakePayment("cashier", order("served"))).toBe(true);
    expect(canTakePayment("waiter", order("served"))).toBe(false);
    expect(canTakePayment("cashier", order("served", 500))).toBe(false);
    expect(canTakePayment("cashier", { ...order("paid"), balanceDue: 0 })).toBe(false);
    expect(canRefund("manager", { ...order("paid"), balanceDue: 0, amountPaid: 500 })).toBe(true);
    expect(canRefund("cashier", { ...order("paid"), balanceDue: 0, amountPaid: 500 })).toBe(false);
  });
});

describe("booking moves", () => {
  const now = Date.parse("2026-10-11T14:00:00Z");
  const booking = (status: "requested" | "confirmed", startsAt: string, endsAt: string) => ({
    status,
    startsAt,
    endsAt,
  });

  it("waits for the booking time before offering no-show", () => {
    const later = booking("confirmed", "2026-10-11T15:00:00Z", "2026-10-11T16:30:00Z");
    expect(reservationMoves("waiter", later, now)).toEqual(["seated", "cancelled"]);
    const due = booking("confirmed", "2026-10-11T13:30:00Z", "2026-10-11T15:00:00Z");
    expect(reservationMoves("waiter", due, now)).toEqual(["seated", "no_show", "cancelled"]);
  });

  it("can't confirm a request that is already over", () => {
    const over = booking("requested", "2026-10-11T11:00:00Z", "2026-10-11T12:30:00Z");
    expect(reservationMoves("manager", over, now)).toEqual(["declined", "cancelled"]);
  });

  it("keeps the chef out of bookings", () => {
    const later = booking("confirmed", "2026-10-11T15:00:00Z", "2026-10-11T16:30:00Z");
    expect(reservationMoves("chef", later, now)).toEqual([]);
  });
});
