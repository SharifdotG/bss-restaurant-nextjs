import type { OrderStatus, ReservationStatus, UserRole as Role } from "@/lib/api/schema";

// Mirrors the API's role checks so the app only offers what will succeed. The API stays the
// judge: these tables decide what to show, never what is safe. Like the API, admin always passes.

const MANAGERS = ["manager"] as const satisfies Role[];
const FRONT = ["manager", "cashier", "waiter"] as const satisfies Role[];

const allows = (roles: readonly Role[], role: Role) => role === "admin" || roles.includes(role);

// Pages

export type Page =
  | "overview"
  | "orders"
  | "newOrder"
  | "floor"
  | "kitchen"
  | "billing"
  | "reservations"
  | "menu"
  | "tables"
  | "staff"
  | "expenses"
  | "reports"
  | "settings"
  | "profile";

/** In the order the sidebar lists them. */
export const PAGES: readonly Page[] = [
  "overview",
  "orders",
  "newOrder",
  "floor",
  "kitchen",
  "billing",
  "reservations",
  "menu",
  "tables",
  "staff",
  "expenses",
  "reports",
  "settings",
  "profile",
];

const PAGE_ROLES: Record<Page, readonly Role[]> = {
  overview: [...MANAGERS, "cashier"],
  orders: FRONT,
  newOrder: FRONT,
  floor: FRONT,
  kitchen: [...MANAGERS, "chef"],
  billing: [...MANAGERS, "cashier"],
  reservations: FRONT,
  menu: [...FRONT, "chef"],
  tables: MANAGERS,
  staff: MANAGERS,
  expenses: [...MANAGERS, "cashier"],
  reports: MANAGERS,
  settings: MANAGERS,
  profile: [...FRONT, "chef"],
};

// Ordered so the longest match wins in pageForPath.
export const PAGE_PATHS = {
  newOrder: "/orders/new",
  overview: "/overview",
  orders: "/orders",
  floor: "/floor",
  kitchen: "/kitchen",
  billing: "/billing",
  reservations: "/reservations",
  menu: "/menu",
  tables: "/tables",
  staff: "/staff",
  expenses: "/expenses",
  reports: "/reports",
  settings: "/settings",
  profile: "/profile",
} as const satisfies Record<Page, string>;

const LANDING: Record<Role, Page> = {
  admin: "overview",
  manager: "overview",
  cashier: "billing",
  waiter: "floor",
  chef: "kitchen",
};

export const canOpen = (role: Role, page: Page) => allows(PAGE_ROLES[page], role);

export const landingPage = (role: Role) => LANDING[role];

export const landingPath = (role: Role) => PAGE_PATHS[LANDING[role]];

/** Which page a locale-less path belongs to: "/orders/42" is "orders". */
export function pageForPath(pathname: string): Page | null {
  for (const [page, path] of Object.entries(PAGE_PATHS) as [Page, string][]) {
    if (pathname === path || pathname.startsWith(`${path}/`)) return page;
  }
  return null;
}

// Actions

export type Action =
  | "order.create"
  | "order.edit"
  | "order.pay"
  | "order.refund"
  | "menu.edit"
  | "menu.soldOut"
  | "reservation.manage"
  | "expense.write"
  | "expense.delete"
  | "table.manage"
  | "staff.manage"
  | "settings.edit"
  | "dashboard.view"
  | "reports.view";

const ACTION_ROLES: Record<Action, readonly Role[]> = {
  "order.create": FRONT,
  "order.edit": FRONT,
  "order.pay": [...MANAGERS, "cashier"],
  "order.refund": MANAGERS,
  "menu.edit": MANAGERS,
  "menu.soldOut": [...MANAGERS, "chef"],
  "reservation.manage": FRONT,
  "expense.write": [...MANAGERS, "cashier"],
  "expense.delete": MANAGERS,
  "table.manage": MANAGERS,
  "staff.manage": MANAGERS,
  "settings.edit": MANAGERS,
  "dashboard.view": [...MANAGERS, "cashier"],
  "reports.view": MANAGERS,
};

export const can = (role: Role, action: Action) => allows(ACTION_ROLES[action], role);

/** Managers run the floor staff's logins; only an admin touches admin and manager accounts. */
export const canManageAccount = (actor: Role, target: Role) =>
  actor === "admin" || (actor === "manager" && target !== "admin" && target !== "manager");

// Orders

const ORDER_FLOW: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served"],
  // served → paid happens by itself once the bill is settled.
  served: [],
  paid: [],
  cancelled: [],
};

const ORDER_MOVE_ROLES: Partial<Record<OrderStatus, readonly Role[]>> = {
  confirmed: FRONT,
  preparing: [...MANAGERS, "chef"],
  ready: [...MANAGERS, "chef"],
  served: [...MANAGERS, "waiter"],
  cancelled: FRONT,
};

const CLOSED: readonly OrderStatus[] = ["paid", "cancelled"];

// Enough of an order to judge it by; both OrderOut and the live feed's orders fit.
type OrderLike = {
  status: OrderStatus;
  total: number;
  balanceDue: number;
  nextStatuses?: OrderStatus[];
  amountPaid?: number;
};

export const isClosed = (order: Pick<OrderLike, "status">) => CLOSED.includes(order.status);

/** The live feed leaves out amountPaid; on an open order it's what the balance doesn't cover. */
export const paidSoFar = (order: OrderLike) =>
  order.amountPaid ?? Math.max(0, order.total - order.balanceDue);

/**
 * Status moves this role can make. The API's nextStatuses ignores the role, so it's narrowed
 * here, including "only a manager cancels once the kitchen has started".
 */
export function orderMoves(role: Role, order: OrderLike): OrderStatus[] {
  const next = order.nextStatuses ?? ORDER_FLOW[order.status];
  return next.filter((target) => {
    const roles = ORDER_MOVE_ROLES[target];
    if (!roles || !allows(roles, role)) return false;
    if (target === "cancelled" && order.status === "preparing") return allows(MANAGERS, role);
    return true;
  });
}

/** Money taken has to be refunded before the order can be cancelled. */
export const cancelNeedsRefund = (order: OrderLike) => paidSoFar(order) > 0;

/** Swapping or removing items only works until the kitchen starts. */
export const canReplaceItems = (role: Role, order: Pick<OrderLike, "status">) =>
  can(role, "order.edit") && (order.status === "pending" || order.status === "confirmed");

/** New items can still go in while the kitchen is cooking. */
export const canAddItems = (role: Role, order: Pick<OrderLike, "status">) =>
  canReplaceItems(role, order) || (can(role, "order.edit") && order.status === "preparing");

export const canEditOrder = (role: Role, order: Pick<OrderLike, "status">) =>
  can(role, "order.edit") && !isClosed(order);

export const canTakePayment = (role: Role, order: OrderLike) =>
  can(role, "order.pay") && !isClosed(order) && order.balanceDue > 0;

export const canRefund = (role: Role, order: OrderLike) =>
  can(role, "order.refund") && paidSoFar(order) > 0;

// Bookings

const RESERVATION_FLOW: Record<ReservationStatus, readonly ReservationStatus[]> = {
  requested: ["confirmed", "declined", "cancelled"],
  confirmed: ["seated", "no_show", "cancelled"],
  seated: ["completed"],
  completed: [],
  cancelled: [],
  declined: [],
  no_show: [],
};

type ReservationLike = {
  status: ReservationStatus;
  startsAt: string;
  endsAt: string;
  nextStatuses?: ReservationStatus[];
};

/** Booking moves that make sense right now: no "no show" before the guests are due. */
export function reservationMoves(
  role: Role,
  reservation: ReservationLike,
  now = Date.now(),
): ReservationStatus[] {
  if (!can(role, "reservation.manage")) return [];
  const next = reservation.nextStatuses ?? RESERVATION_FLOW[reservation.status];
  return next.filter((target) => {
    if (target === "no_show") return Date.parse(reservation.startsAt) <= now;
    if (target === "confirmed") return Date.parse(reservation.endsAt) > now;
    return true;
  });
}

export const canEditReservation = (role: Role, reservation: Pick<ReservationLike, "status">) =>
  can(role, "reservation.manage") &&
  (reservation.status === "requested" || reservation.status === "confirmed");

/** Cancelling an order, or turning a guest away, needs a reason the API can store. */
export const needsReason = (target: OrderStatus | ReservationStatus) =>
  target === "cancelled" || target === "declined";
