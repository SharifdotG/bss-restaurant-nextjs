import { useSyncExternalStore } from "react";
import type { LiveOrder } from "@/lib/live/types";
import { addedCount, lineQuantities, type Quantities } from "./kitchen";

// What only this screen knows about a ticket: what it held when cooking started (so later
// additions stand out) and which lines the cooks have ticked off. The API tracks neither,
// so it lives on the device and survives a reload.

export type Ticket = {
  started?: Quantities;
  ticked: string[];
  /** When more food last landed on it, to flash the ticket. */
  addedAt?: number;
};

type Tickets = Readonly<Record<number, Ticket>>;

const KEY = "bss-kitchen-tickets";
let tickets: Tickets | null = null;
const listeners = new Set<() => void>();
// Orders this screen has already announced; null until the first look at the board.
let known: Set<number> | null = null;
// Additions already counted, so a reload or a resync doesn't flash them again.
const lastAdded = new Map<number, number>();

function read(): Tickets {
  if (tickets) return tickets;
  try {
    tickets = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Tickets;
  } catch {
    tickets = {};
  }
  return tickets;
}

function write(next: Tickets) {
  tickets = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Kept for this visit only.
  }
  listeners.forEach((listener) => listener());
}

export function toggleLine(orderId: number, key: string) {
  const all = read();
  const ticket = all[orderId] ?? { ticked: [] };
  const ticked = ticket.ticked.includes(key)
    ? ticket.ticked.filter((k) => k !== key)
    : [...ticket.ticked, key];
  write({ ...all, [orderId]: { ...ticket, ticked } });
}

export type BoardNews = { fresh: number[]; added: number[] };

/**
 * Brings the device's notes in line with the live board and says what's new: tickets that
 * just arrived, and cooking tickets that just got more food. Ready tickets are done with.
 */
export function syncTickets(orders: readonly LiveOrder[], now = Date.now()): BoardNews {
  const all = read();
  const next: Record<number, Ticket> = {};
  const news: BoardNews = { fresh: [], added: [] };
  const first = known === null;
  known ??= new Set();

  for (const order of orders) {
    if (order.status === "confirmed" && !known.has(order.id) && !first) news.fresh.push(order.id);
    known.add(order.id);

    if (order.status !== "confirmed" && order.status !== "preparing") continue;
    const ticket = all[order.id] ?? { ticked: [] };
    if (order.status === "confirmed") {
      // Items can still be swapped before cooking, so there's nothing to compare yet.
      next[order.id] = { ticked: ticket.ticked };
      continue;
    }
    if (!ticket.started) {
      next[order.id] = { ...ticket, started: lineQuantities(order.items) };
      lastAdded.set(order.id, 0);
      continue;
    }
    // The first look after a reload only takes note; it doesn't flash old news.
    const seen = lastAdded.get(order.id);
    const added = addedCount(order.items, ticket.started);
    lastAdded.set(order.id, added);
    const grew = seen !== undefined && added > seen;
    if (grew) news.added.push(order.id);
    next[order.id] = grew ? { ...ticket, addedAt: now } : ticket;
  }

  const changed =
    Object.keys(next).length !== Object.keys(all).length ||
    Object.entries(next).some(([id, ticket]) => all[Number(id)] !== ticket);
  if (changed) write(next);
  return news;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const useTicket = (orderId: number) =>
  useSyncExternalStore(
    subscribe,
    () => read()[orderId],
    () => undefined,
  );

/** Forgets everything, for sign-out. */
export function forgetTickets() {
  known = null;
  lastAdded.clear();
  tickets = {};
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
