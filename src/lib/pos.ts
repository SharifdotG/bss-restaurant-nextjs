import type { OrderType } from "@/lib/api/schema";
import { toPaisa } from "@/lib/money";

// The cart before it becomes an order. Prices on screen are a preview worked out the way the
// API does it; the API prices the order again from the menu when it's sent.

export type CartLine = { foodId: number; quantity: number; notes: string | null };

export type Draft = {
  orderType: OrderType;
  tableId: number | null;
  waiterId: number | null;
  customerName: string;
  customerPhone: string;
  lines: CartLine[];
};

export const EMPTY_DRAFT: Draft = {
  orderType: "dine_in",
  tableId: null,
  waiterId: null,
  customerName: "",
  customerPhone: "",
  lines: [],
};

export const MAX_QUANTITY = 100;

const sameLine = (line: CartLine, foodId: number, notes: string | null) =>
  line.foodId === foodId && (line.notes ?? null) === (notes?.trim() || null);

/** One more of a dish. The same dish with the same note stays one line, as the API keeps it. */
export function addToCart(lines: readonly CartLine[], foodId: number, notes: string | null = null) {
  const existing = lines.find((line) => sameLine(line, foodId, notes));
  if (!existing) return [...lines, { foodId, quantity: 1, notes: notes?.trim() || null }];
  return lines.map((line) =>
    line === existing ? { ...line, quantity: Math.min(MAX_QUANTITY, line.quantity + 1) } : line,
  );
}

/** Sets a line's quantity; zero takes it out. */
export function setLineQuantity(lines: readonly CartLine[], index: number, quantity: number) {
  if (quantity <= 0) return lines.filter((_, i) => i !== index);
  return lines.map((line, i) =>
    i === index ? { ...line, quantity: Math.min(MAX_QUANTITY, quantity) } : line,
  );
}

/** Changes a line's note, folding it into a matching line if one already has that note. */
export function setLineNote(lines: readonly CartLine[], index: number, notes: string) {
  const target = lines[index];
  if (!target) return [...lines];
  const note = notes.trim() || null;
  const twin = lines.findIndex((line, i) => i !== index && sameLine(line, target.foodId, note));
  if (twin === -1) return lines.map((line, i) => (i === index ? { ...line, notes: note } : line));
  return lines
    .map((line, i) =>
      i === twin
        ? { ...line, quantity: Math.min(MAX_QUANTITY, line.quantity + target.quantity) }
        : line,
    )
    .filter((_, i) => i !== index);
}

/** How many of each dish, across lines with different notes. */
export function quantities(lines: readonly CartLine[]) {
  const counts = new Map<number, number>();
  for (const line of lines) counts.set(line.foodId, (counts.get(line.foodId) ?? 0) + line.quantity);
  return counts;
}

/** A percentage of an amount in paisa, rounded half up as the API rounds it. */
export function percentOf(paisa: number, rate: number) {
  const basisPoints = Math.round(rate * 100);
  return Math.floor((2 * paisa * basisPoints + 10_000) / 20_000);
}

type Rates = { serviceChargePercent: number; vatPercent: number };

/** Food, service charge (dine-in only), VAT on both, and the total, all in paisa. */
export function cartTotals(
  lines: readonly CartLine[],
  prices: ReadonlyMap<number, number>,
  orderType: OrderType,
  rates: Rates,
) {
  const food = lines.reduce(
    (sum, line) => sum + toPaisa(prices.get(line.foodId) ?? 0) * line.quantity,
    0,
  );
  const service = orderType === "dine_in" ? percentOf(food, rates.serviceChargePercent) : 0;
  const vat = percentOf(food + service, rates.vatPercent);
  return {
    items: lines.reduce((sum, line) => sum + line.quantity, 0),
    food,
    service,
    vat,
    total: food + service + vat,
  };
}

/** What's missing before the order can go. */
export function draftProblem(draft: Draft): "empty" | "table" | null {
  if (draft.lines.length === 0) return "empty";
  if (draft.orderType === "dine_in" && draft.tableId === null) return "table";
  return null;
}
