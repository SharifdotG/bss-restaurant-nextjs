import type { OrderItemOut, OrderStatus, StatusEventOut } from "@/lib/api/schema";

/** The road an order travels; cancelled leaves it partway. */
export const STEPS = ["pending", "confirmed", "preparing", "ready", "served", "paid"] as const;
export type Step = (typeof STEPS)[number];
export type StepState = "done" | "current" | "todo";

/** When each step was reached and by whom, the latest event winning. */
export function stepEvents(history: readonly StatusEventOut[]) {
  const reached: Partial<Record<OrderStatus, StatusEventOut>> = {};
  for (const event of history) {
    const seen = reached[event.toStatus];
    if (!seen || Date.parse(event.createdAt) >= Date.parse(seen.createdAt)) {
      reached[event.toStatus] = event;
    }
  }
  return reached;
}

/**
 * Where each step stands. A cancelled order keeps the steps it got through and has no
 * current one; a paid order is done all the way.
 */
export function stepStates(status: OrderStatus, history: readonly StatusEventOut[]) {
  const states = {} as Record<Step, StepState>;
  if (status === "cancelled") {
    const cancel = history.find((event) => event.toStatus === "cancelled");
    const stoppedAt = cancel?.fromStatus ? STEPS.indexOf(cancel.fromStatus as Step) : 0;
    STEPS.forEach((step, i) => (states[step] = i <= stoppedAt ? "done" : "todo"));
    return states;
  }
  const at = STEPS.indexOf(status as Step);
  STEPS.forEach((step, i) => {
    states[step] = i < at || status === "paid" ? "done" : i === at ? "current" : "todo";
  });
  return states;
}

// Inline item edits

export type DraftLine = {
  key: number;
  foodId: number;
  foodName: string;
  quantity: number;
  notes: string | null;
};

export const toDraft = (items: readonly OrderItemOut[]): DraftLine[] =>
  items.map((item) => ({
    key: item.id,
    foodId: item.foodId,
    foodName: item.foodName,
    quantity: item.quantity,
    notes: item.notes,
  }));

/** True when the draft would change what the kitchen gets. */
export function draftChanged(draft: readonly DraftLine[], items: readonly OrderItemOut[]) {
  const kept = draft.filter((line) => line.quantity > 0);
  if (kept.length !== items.length) return true;
  return kept.some((line) => {
    const item = items.find((candidate) => candidate.id === line.key);
    return !item || item.quantity !== line.quantity;
  });
}

/** The PUT body: every line that's still wanted, in the same order. */
export const draftPayload = (draft: readonly DraftLine[]) =>
  draft
    .filter((line) => line.quantity > 0)
    .map(({ foodId, quantity, notes }) => ({ foodId, quantity, notes }));
