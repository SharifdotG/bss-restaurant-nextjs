import type { PaymentMethod } from "@/lib/api/schema";
import type { LiveOrder } from "@/lib/live/types";
import { splitEvenly, toPaisa } from "@/lib/money";

// Queue

export type BillGroup = "waiting" | "kitchen" | "prepaid";

/**
 * Where an open order sits on the billing desk. Served or part-paid bills are waiting;
 * anything still cooking can be paid early (a takeaway at the counter); fully paid orders
 * that haven't been served yet stay visible until the API closes them. Orders that nobody
 * has accepted yet belong to the incoming panel, not here.
 */
export function billGroup(order: Pick<LiveOrder, "status" | "total" | "balanceDue">) {
  if (order.status === "pending" || order.status === "paid" || order.status === "cancelled") {
    return null;
  }
  if (order.balanceDue <= 0) return "prepaid";
  if (order.status === "served" || order.balanceDue < order.total) return "waiting";
  return "kitchen";
}

export type BillQueue = Record<BillGroup, LiveOrder[]>;

/** The live feed's open orders split into the desk's groups, oldest first. */
export function billQueue(orders: Iterable<LiveOrder>): BillQueue {
  const queue: BillQueue = { waiting: [], kitchen: [], prepaid: [] };
  for (const order of orders) {
    const group = billGroup(order);
    if (group) queue[group].push(order);
  }
  for (const list of Object.values(queue)) {
    list.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  }
  return queue;
}

// Cash

// Taka notes in everyday use; quick amounts round up to them.
const NOTES = [100, 500, 1000] as const;

/**
 * Amounts a guest is likely to hand over for this bill, in paisa: the exact amount, then the
 * next round hundred, five hundred and thousand. ৳580.25 gives 580.25 · 600 · 1000.
 */
export function quickCash(duePaisa: number, limit = 4): number[] {
  if (duePaisa <= 0) return [];
  const amounts = [duePaisa];
  for (const note of NOTES) {
    const step = note * 100;
    const next = Math.ceil(duePaisa / step) * step;
    if (!amounts.includes(next)) amounts.push(next);
    // A bill already on a round number also gets the note above it.
    if (next === duePaisa && !amounts.includes(next + step)) amounts.push(next + step);
  }
  return amounts.sort((a, b) => a - b).slice(0, limit);
}

// Split

/** Even shares of what's left; any odd paisa go to the first payers. */
export const shares = (balancePaisa: number, parts: number) => splitEvenly(balancePaisa, parts);

// Till

export const WALLETS = ["bkash", "nagad", "rocket"] as const;
export type Wallet = (typeof WALLETS)[number];

/** How the wallet's name is kept, since a payment only has a free-text note. */
export const WALLET_NAMES: Record<Wallet, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
};

export type TillInput = {
  method: PaymentMethod;
  amount: number | null;
  tendered: number | null;
  reference: string;
};

export type TillProblem = "noAmount" | "tooMuch" | "notEnoughCash" | "needsReference";

/**
 * What stops this payment from going through, if anything. Amounts are in paisa and match
 * the API's own checks, so the button can say why before the request is sent.
 */
export function tillProblem(input: TillInput, duePaisa: number): TillProblem | null {
  const { method, amount, tendered, reference } = input;
  if (!amount || amount <= 0) return "noAmount";
  if (amount > duePaisa) return "tooMuch";
  if (method === "cash" && tendered !== null && tendered < amount) return "notEnoughCash";
  if (method === "mobile" && !reference.trim()) return "needsReference";
  return null;
}

/** Change to hand back on cash; nothing for card or mobile. */
export const tillChange = (input: TillInput) =>
  input.method === "cash" && input.tendered !== null && input.amount
    ? Math.max(0, input.tendered - input.amount)
    : 0;

/** Due on a bill in paisa, from the API's taka. */
export const duePaisa = (order: Pick<LiveOrder, "balanceDue">) => toPaisa(order.balanceDue);
