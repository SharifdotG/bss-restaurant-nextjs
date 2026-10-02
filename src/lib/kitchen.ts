import type { OrderStatus } from "@/lib/api/schema";
import type { LiveOrder } from "@/lib/live/types";
import { minutesSince, type OrderMove } from "@/lib/orders";
import type { Tone } from "@/lib/tones";

// The kitchen sees confirmed orders onwards. Pending ones still wait on front of house.

export const KITCHEN_COLUMNS = [
  { key: "toCook", status: "confirmed", next: "preparing", tone: "amber" },
  { key: "cooking", status: "preparing", next: "ready", tone: "orange" },
  { key: "ready", status: "ready", next: "served", tone: "green" },
] as const satisfies {
  key: string;
  status: OrderStatus;
  next: OrderMove;
  tone: Tone;
}[];

export type KitchenColumn = (typeof KITCHEN_COLUMNS)[number];
export type KitchenColumnKey = KitchenColumn["key"];

export const kitchenColumn = (status: OrderStatus) =>
  KITCHEN_COLUMNS.find((column) => column.status === status) ?? null;

/** Bumps waiting out their undo window, by order id. */
export type HeldMoves = ReadonlyMap<number, OrderMove>;

/**
 * Tickets per column, oldest first. A bump still in its undo window already shows in the
 * column it's heading for.
 */
export function kitchenBoard(orders: readonly LiveOrder[], held: HeldMoves) {
  const board: Record<KitchenColumnKey, LiveOrder[]> = { toCook: [], cooking: [], ready: [] };
  for (const order of orders) {
    const status = held.get(order.id) ?? order.status;
    const column = kitchenColumn(status);
    if (column) board[column.key].push(status === order.status ? order : { ...order, status });
  }
  // Ready food is queued by when it was plated, not when it was ordered.
  board.ready.sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt));
  return board;
}

// Timers

// Without prep times on the menu, the same marks the orders board uses.
const FALLBACK = { late: 15, veryLate: 30 };
// Plated food going cold.
const READY = { late: 5, veryLate: 10 };

/** The slowest dish on the ticket sets its pace. */
export function prepTarget(order: LiveOrder, prepMinutes: ReadonlyMap<string, number | null>) {
  let slowest = 0;
  for (const item of order.items) slowest = Math.max(slowest, prepMinutes.get(item.foodName) ?? 0);
  return slowest ? { late: slowest, veryLate: Math.ceil(slowest * 1.5) } : FALLBACK;
}

export type TicketClock = { minutes: number; tone: Tone };

/** Minutes since ordered (or since plated, once ready) and how worried to look about it. */
export function ticketClock(
  order: LiveOrder,
  prepMinutes: ReadonlyMap<string, number | null>,
  now: number,
): TicketClock {
  const ready = order.status === "ready";
  const minutes = minutesSince(ready ? order.updatedAt : order.createdAt, now);
  const marks = ready ? READY : prepTarget(order, prepMinutes);
  const tone = minutes >= marks.veryLate ? "red" : minutes >= marks.late ? "amber" : "slate";
  return { minutes, tone };
}

// Lines

/** Same dish with the same note counts as one line, however the API stored it. */
export const lineKey = (item: { foodName: string; notes: string | null }) =>
  `${item.foodName}\u0000${item.notes ?? ""}`;

export type Quantities = Record<string, number>;

export function lineQuantities(items: LiveOrder["items"]): Quantities {
  const quantities: Quantities = {};
  for (const item of items) {
    const key = lineKey(item);
    quantities[key] = (quantities[key] ?? 0) + item.quantity;
  }
  return quantities;
}

export type TicketLine = {
  key: string;
  foodName: string;
  notes: string | null;
  quantity: number;
  /** How many of these came in after cooking started. */
  added: number;
};

/** The ticket's lines, merged, with anything beyond what the kitchen started on marked added. */
export function ticketLines(items: LiveOrder["items"], started?: Quantities): TicketLine[] {
  const lines = new Map<string, TicketLine>();
  for (const item of items) {
    const key = lineKey(item);
    const line = lines.get(key);
    if (line) line.quantity += item.quantity;
    else
      lines.set(key, {
        key,
        foodName: item.foodName,
        notes: item.notes,
        quantity: item.quantity,
        added: 0,
      });
  }
  for (const line of lines.values()) {
    if (started) line.added = Math.max(0, line.quantity - (started[line.key] ?? 0));
  }
  return [...lines.values()];
}

export const addedCount = (items: LiveOrder["items"], started?: Quantities) =>
  started ? ticketLines(items, started).reduce((sum, line) => sum + line.added, 0) : 0;

/** Each dish's prep time by name; live tickets carry names, not ids. */
export const prepByName = (
  foods: readonly { name: string; preparationMinutes?: number | null }[],
) => new Map(foods.map((food) => [food.name, food.preparationMinutes ?? null]));
