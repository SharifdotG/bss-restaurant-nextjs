import { useSyncExternalStore } from "react";
import { api, unwrap } from "@/lib/api/client";
import type { OrderOut, ReservationOut } from "@/lib/api/schema";
import { useNow } from "@/lib/use-now";
import { getLiveStatus, onLiveEvent, subscribeLiveStatus } from "./socket";
import { applyMessage, EMPTY, sortedOrders, sortedReservations, type LiveState } from "./state";
import type { LiveMessage, LiveOrder, LiveReservation } from "./types";

// Active orders and today's bookings, kept current by the socket. The kitchen, the floor and
// the incoming-orders inbox read from here instead of polling.

let state: LiveState = EMPTY;
let orders: LiveOrder[] = [];
let reservations: LiveReservation[] = [];
const listeners = new Set<() => void>();

function commit(next: LiveState) {
  if (next === state) return;
  if (next.orders !== state.orders) orders = sortedOrders(next);
  if (next.reservations !== state.reservations) reservations = sortedReservations(next);
  state = next;
  listeners.forEach((listener) => listener());
}

export const toLiveOrder = (order: OrderOut): LiveOrder => ({
  id: order.id,
  orderNumber: order.orderNumber,
  orderType: order.orderType,
  source: order.source,
  status: order.status,
  table: order.table ?? null,
  waiter: order.waiter ?? null,
  customerName: order.customerName ?? null,
  notes: order.notes ?? null,
  items: order.items.map(({ foodName, quantity, notes }) => ({
    foodName,
    quantity,
    notes: notes ?? null,
  })),
  itemCount: order.itemCount,
  total: order.total,
  balanceDue: order.balanceDue,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

export const toLiveReservation = (booking: ReservationOut): LiveReservation => ({
  id: booking.id,
  source: booking.source,
  status: booking.status,
  table: booking.table,
  partySize: booking.partySize,
  startsAt: booking.startsAt,
  endsAt: booking.endsAt,
  customerName: booking.customerName,
  customerPhone: booking.customerPhone,
  notes: booking.notes,
  updatedAt: booking.updatedAt,
});

async function fetchOrder(id: number) {
  try {
    const order = await unwrap(
      api.GET("/api/v1/orders/{order_id}", { params: { path: { order_id: id } } }),
    );
    receive({
      event: "order.updated",
      topic: "orders",
      at: order.updatedAt,
      data: toLiveOrder(order),
    });
  } catch {
    // The next event or snapshot carries it.
  }
}

export function receive(message: LiveMessage, receivedAt = Date.now()) {
  const { state: next, fetchOrder: id } = applyMessage(state, message, receivedAt);
  commit(next);
  if (id !== undefined) void fetchOrder(id);
}

// Listens for the whole page life; the socket only emits while someone is signed in.
if (typeof window !== "undefined") {
  onLiveEvent((message) => receive(message));
  subscribeLiveStatus(() => {
    const status = getLiveStatus();
    // Stopped or signed out: forget everything. Dropped: keep showing it, marked stale
    // until the next snapshot.
    if (status === "idle") commit(EMPTY);
    else if (status !== "live" && state.synced) commit({ ...state, synced: false });
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const NONE: never[] = [];

export const useLiveOrders = () =>
  useSyncExternalStore(
    subscribe,
    () => orders,
    () => NONE,
  );

export const useLiveReservations = () =>
  useSyncExternalStore(
    subscribe,
    () => reservations,
    () => NONE,
  );

/** False until the first snapshot, and again while reconnecting. */
export const useLiveSynced = () =>
  useSyncExternalStore(
    subscribe,
    () => state.synced,
    () => false,
  );

/** Date.now() on the server's clock, so ticket ages agree across tablets. */
export const serverNow = () => Date.now() + state.skew;

/** A ticking clock on the server's time, for timers that render. */
export function useServerNow(interval = 1000) {
  const now = useNow(interval);
  const skew = useSyncExternalStore(
    subscribe,
    () => state.skew,
    () => 0,
  );
  return now + skew;
}
