import type { UserRole as Role } from "@/lib/api/schema";
import type { LiveOrder, LiveReservation } from "@/lib/live/types";
import { can, orderMoves } from "@/lib/permissions";

// The bell has no API of its own: it lists what in the live feed is waiting on this person.

export type Notice =
  | { kind: "incoming"; key: string; at: string; order: LiveOrder }
  | { kind: "toCook"; key: string; at: string; order: LiveOrder }
  | { kind: "ready"; key: string; at: string; order: LiveOrder }
  | { kind: "request"; key: string; at: string; reservation: LiveReservation };

export function notices(
  role: Role,
  orders: readonly LiveOrder[],
  reservations: readonly LiveReservation[],
): Notice[] {
  const list: Notice[] = [];

  for (const order of orders) {
    const moves = orderMoves(role, order);
    // Guests ordering from a QR code or online need someone to say yes.
    if (order.status === "pending" && order.source !== "staff" && moves.includes("confirmed")) {
      list.push({ kind: "incoming", key: `incoming:${order.id}`, at: order.createdAt, order });
    }
    // Confirmed tickets are the kitchen's queue; managers see those on the board instead.
    if (order.status === "confirmed" && role === "chef" && moves.includes("preparing")) {
      list.push({ kind: "toCook", key: `toCook:${order.id}`, at: order.updatedAt, order });
    }
    if (order.status === "ready" && moves.includes("served")) {
      list.push({ kind: "ready", key: `ready:${order.id}`, at: order.updatedAt, order });
    }
  }

  if (can(role, "reservation.manage")) {
    for (const reservation of reservations) {
      if (reservation.status !== "requested") continue;
      list.push({
        kind: "request",
        key: `request:${reservation.id}`,
        at: reservation.updatedAt,
        reservation,
      });
    }
  }

  // Newest first.
  return list.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
