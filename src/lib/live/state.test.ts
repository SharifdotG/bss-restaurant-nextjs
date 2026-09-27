import { describe, expect, it } from "vitest";
import { applyMessage, EMPTY, isLiveReservation, sortedOrders, type LiveState } from "./state";
import type { LiveOrder, LiveReservation } from "./types";

// 20:00 in Dhaka on Oct 11.
const NOW = Date.parse("2026-10-11T14:00:00Z");

const order = (id: number, overrides: Partial<LiveOrder> = {}): LiveOrder => ({
  id,
  orderNumber: `261011-${String(id).padStart(4, "0")}`,
  orderType: "dine_in",
  source: "staff",
  status: "confirmed",
  table: { id: 1, number: "T1" },
  waiter: null,
  customerName: null,
  notes: null,
  items: [{ foodName: "Shorshe Ilish", quantity: 1, notes: null }],
  itemCount: 1,
  total: 654.68,
  balanceDue: 654.68,
  createdAt: "2026-10-11T13:00:00Z",
  updatedAt: "2026-10-11T13:00:00Z",
  ...overrides,
});

const booking = (id: number, overrides: Partial<LiveReservation> = {}): LiveReservation => ({
  id,
  source: "staff",
  status: "confirmed",
  table: null,
  partySize: 4,
  startsAt: "2026-10-11T15:00:00Z",
  endsAt: "2026-10-11T16:30:00Z",
  customerName: "Rahim",
  customerPhone: "01700000000",
  notes: null,
  updatedAt: "2026-10-11T12:00:00Z",
  ...overrides,
});

const snapshot = (orders: LiveOrder[], reservations?: LiveReservation[]) =>
  applyMessage(
    EMPTY,
    { event: "snapshot", at: new Date(NOW + 2_000).toISOString(), orders, reservations },
    NOW,
  ).state;

const updated = (state: LiveState, data: LiveOrder) =>
  applyMessage(state, { event: "order.updated", topic: "orders", at: "", data }, NOW).state;

describe("snapshot", () => {
  it("replaces everything and measures the clock skew", () => {
    const state = snapshot([order(1), order(2)]);
    expect([...state.orders.keys()]).toEqual([1, 2]);
    expect(state.skew).toBe(2_000);
    expect(state.synced).toBe(true);
  });

  it("leaves a topic alone when the role doesn't follow it", () => {
    const withBooking = snapshot([], [booking(7)]);
    const chefSnapshot = applyMessage(
      withBooking,
      { event: "snapshot", at: new Date(NOW).toISOString(), orders: [order(1)] },
      NOW,
    ).state;
    expect(chefSnapshot.reservations).toBe(withBooking.reservations);
  });
});

describe("order events", () => {
  it("adds new orders and keeps them in the order they came in", () => {
    const state = applyMessage(
      snapshot([order(2, { createdAt: "2026-10-11T13:05:00Z" })]),
      { event: "order.created", topic: "orders", at: "", data: order(1) },
      NOW,
    ).state;
    expect(sortedOrders(state).map((o) => o.id)).toEqual([1, 2]);
  });

  it("ignores events older than what it already has", () => {
    const fresh = snapshot([order(1, { status: "ready", updatedAt: "2026-10-11T13:30:00Z" })]);
    const late = updated(
      fresh,
      order(1, { status: "preparing", updatedAt: "2026-10-11T13:20:00Z" }),
    );
    expect(late).toBe(fresh);
    expect(late.orders.get(1)?.status).toBe("ready");
  });

  it("drops orders once they're paid or cancelled", () => {
    const state = snapshot([order(1), order(2)]);
    const paid = updated(state, order(1, { status: "paid", updatedAt: "2026-10-11T13:40:00Z" }));
    expect([...paid.orders.keys()]).toEqual([2]);
  });

  it("asks for the full order when the event was too big to relay", () => {
    const state = snapshot([order(1)]);
    const result = applyMessage(
      state,
      { event: "order.updated", topic: "orders", at: "", data: { id: 1 }, partial: true },
      NOW,
    );
    expect(result.fetchOrder).toBe(1);
    expect(result.state).toBe(state);
  });
});

describe("bookings", () => {
  it("keeps who's seated, who's due today and open requests", () => {
    const now = NOW;
    expect(isLiveReservation(booking(1, { status: "seated" }), now)).toBe(true);
    expect(isLiveReservation(booking(2), now)).toBe(true);
    expect(isLiveReservation(booking(3, { startsAt: "2026-10-12T15:00:00Z" }), now)).toBe(false);
    expect(isLiveReservation(booking(4, { status: "requested" }), now)).toBe(true);
    expect(
      isLiveReservation(booking(5, { status: "requested", endsAt: "2026-10-11T13:00:00Z" }), now),
    ).toBe(false);
    expect(isLiveReservation(booking(6, { status: "completed" }), now)).toBe(false);
  });

  it("uses the Dhaka day, so a 1 AM booking counts for the next date", () => {
    // 19:30 UTC on the 11th is 1:30 AM on the 12th in Dhaka.
    expect(isLiveReservation(booking(1, { startsAt: "2026-10-11T19:30:00Z" }), NOW)).toBe(false);
  });

  it("removes a booking once it's done", () => {
    const state = snapshot([], [booking(1)]);
    const done = applyMessage(
      state,
      {
        event: "reservation.updated",
        topic: "reservations",
        at: "",
        data: booking(1, { status: "no_show", updatedAt: "2026-10-11T13:00:00Z" }),
      },
      NOW,
    ).state;
    expect(done.reservations.size).toBe(0);
  });
});
