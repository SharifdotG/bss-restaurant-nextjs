import type { OrderStatus } from "@/lib/api/schema";
import type { LiveOrder } from "@/lib/live/types";

export const PIPELINE = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "served",
] as const satisfies OrderStatus[];
export type PipelineStatus = (typeof PIPELINE)[number];

const oldest = (key: "createdAt" | "updatedAt") => (a: LiveOrder, b: LiveOrder) =>
  Date.parse(a[key]) - Date.parse(b[key]);

/** Open orders by where they are, oldest first in each. */
export function pipeline(orders: LiveOrder[]) {
  return Object.fromEntries(
    PIPELINE.map((status) => [
      status,
      orders.filter((order) => order.status === status).sort(oldest("createdAt")),
    ]),
  ) as Record<PipelineStatus, LiveOrder[]>;
}

export type AttentionReason = "guest" | "ready" | "kitchen";
export type AttentionPick = { order: LiveOrder; reason: AttentionReason };

/**
 * What a manager should look at first: guests waiting for someone to accept their order,
 * then food going cold at the pass, then whatever has been in the kitchen longest.
 */
export function attentionPicks(orders: LiveOrder[], count: number): AttentionPick[] {
  const guest = orders
    .filter((order) => order.status === "pending" && order.source !== "staff")
    .sort(oldest("createdAt"));
  // Ready food waits from the moment it was bumped, not from when it was ordered.
  const ready = orders.filter((order) => order.status === "ready").sort(oldest("updatedAt"));
  const kitchen = orders
    .filter((order) => order.status === "confirmed" || order.status === "preparing")
    .sort(oldest("createdAt"));

  return [
    ...guest.map((order) => ({ order, reason: "guest" as const })),
    ...ready.map((order) => ({ order, reason: "ready" as const })),
    ...kitchen.map((order) => ({ order, reason: "kitchen" as const })),
  ].slice(0, count);
}
