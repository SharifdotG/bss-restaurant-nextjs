import { businessDate } from "@/lib/format";
import type { LiveMessage, LiveOrder, LiveReservation } from "./types";

// Pure state transitions for the live feed, kept apart from the socket so they're easy to test.

export type LiveState = {
  orders: ReadonlyMap<number, LiveOrder>;
  reservations: ReadonlyMap<number, LiveReservation>;
  // Server clock minus ours, from the last snapshot. Ticket timers add it to Date.now().
  skew: number;
  synced: boolean;
};

export const EMPTY: LiveState = {
  orders: new Map(),
  reservations: new Map(),
  skew: 0,
  synced: false,
};

export type Applied = { state: LiveState; fetchOrder?: number };

const newer = (incoming: { updatedAt: string }, current?: { updatedAt: string }) =>
  !current || Date.parse(incoming.updatedAt) > Date.parse(current.updatedAt);

// Once paid or cancelled an order leaves every live board.
const isActiveOrder = (order: LiveOrder) => order.status !== "paid" && order.status !== "cancelled";

/** The same rule the API uses for its snapshot: who's here, who's due today, who's asking. */
export function isLiveReservation(reservation: LiveReservation, now: number) {
  switch (reservation.status) {
    case "seated":
      return true;
    case "confirmed":
      return businessDate(reservation.startsAt) === businessDate(now);
    case "requested":
      return Date.parse(reservation.endsAt) > now;
    default:
      return false;
  }
}

function upsert<T extends { id: number; updatedAt: string }>(
  items: ReadonlyMap<number, T>,
  item: T,
  keep: boolean,
) {
  if (!newer(item, items.get(item.id))) return items;
  const next = new Map(items);
  if (keep) next.set(item.id, item);
  else next.delete(item.id);
  return next;
}

const byId = <T extends { id: number }>(items: T[]) =>
  new Map(items.map((item) => [item.id, item]));

export function applyMessage(state: LiveState, message: LiveMessage, receivedAt: number): Applied {
  switch (message.event) {
    case "snapshot": {
      const skew = Date.parse(message.at) - receivedAt;
      return {
        state: {
          // Topics the role doesn't follow are left out of the snapshot entirely.
          orders: message.orders ? byId(message.orders) : state.orders,
          reservations: message.reservations
            ? byId(message.reservations.filter((r) => isLiveReservation(r, receivedAt + skew)))
            : state.reservations,
          skew,
          synced: true,
        },
      };
    }
    case "order.created":
    case "order.updated": {
      if (message.partial || !("updatedAt" in message.data)) {
        return { state, fetchOrder: message.data.id };
      }
      const order = message.data;
      const orders = upsert(state.orders, order, isActiveOrder(order));
      return { state: orders === state.orders ? state : { ...state, orders } };
    }
    case "reservation.created":
    case "reservation.updated": {
      const reservation = message.data;
      const keep = isLiveReservation(reservation, receivedAt + state.skew);
      const reservations = upsert(state.reservations, reservation, keep);
      return { state: reservations === state.reservations ? state : { ...state, reservations } };
    }
    default:
      return { state };
  }
}

const byCreated = (a: LiveOrder, b: LiveOrder) =>
  Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id - b.id;
const byStart = (a: LiveReservation, b: LiveReservation) =>
  Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id - b.id;

export const sortedOrders = (state: LiveState) => [...state.orders.values()].sort(byCreated);
export const sortedReservations = (state: LiveState) =>
  [...state.reservations.values()].sort(byStart);
