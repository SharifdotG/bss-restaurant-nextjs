import type {
  OrderSource,
  OrderStatus,
  OrderType,
  PersonRef,
  ReservationSource,
  ReservationStatus,
  TableRef,
} from "@/lib/api/schema";

// The socket isn't in the OpenAPI document; these follow app/schemas/live.py in the API.
// They're slimmer than OrderOut and ReservationOut so an event fits in a Postgres NOTIFY.

export type LiveOrder = {
  id: number;
  orderNumber: string;
  orderType: OrderType;
  source: OrderSource;
  status: OrderStatus;
  table: TableRef | null;
  waiter: PersonRef | null;
  customerName: string | null;
  notes: string | null;
  items: { foodName: string; quantity: number; notes: string | null }[];
  itemCount: number;
  total: number;
  balanceDue: number;
  createdAt: string;
  updatedAt: string;
};

export type LiveReservation = {
  id: number;
  source: ReservationSource;
  status: ReservationStatus;
  table: TableRef | null;
  partySize: number;
  startsAt: string;
  endsAt: string;
  customerName: string;
  customerPhone: string;
  notes: string | null;
  updatedAt: string;
};

export type LiveMessage =
  | { event: "authenticated"; user: PersonRef & { role: string }; expiresIn: number }
  | { event: "snapshot"; at: string; orders?: LiveOrder[]; reservations?: LiveReservation[] }
  | {
      event: "order.created" | "order.updated";
      topic: "orders";
      at: string;
      // A relayed event too big for NOTIFY carries only the id; fetch the rest.
      data: LiveOrder | { id: number };
      partial?: true;
    }
  | {
      event: "reservation.created" | "reservation.updated";
      topic: "reservations";
      at: string;
      data: LiveReservation;
    }
  | { event: "pong" | "ping" }
  | { event: "error"; detail: string };
