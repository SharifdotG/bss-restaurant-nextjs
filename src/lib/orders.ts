import type { Icon } from "@phosphor-icons/react";
import {
  BellRingingIcon,
  CheckCircleIcon,
  FireIcon,
  HourglassMediumIcon,
  ProhibitIcon,
  SealCheckIcon,
  WalletIcon,
} from "@phosphor-icons/react";
import type { OrderSource, OrderStatus, paths } from "@/lib/api/schema";
import { businessDate, shiftDay } from "@/lib/format";
import type { Tone } from "@/lib/tones";

export type OrdersQuery = NonNullable<paths["/api/v1/orders"]["get"]["parameters"]["query"]>;

// Status look

export const STATUS_LOOK: Record<OrderStatus, { tone: Tone; icon: Icon }> = {
  pending: { tone: "amber", icon: HourglassMediumIcon },
  // Confirmed is still waiting, now for the chef.
  confirmed: { tone: "amber", icon: SealCheckIcon },
  preparing: { tone: "orange", icon: FireIcon },
  ready: { tone: "green", icon: BellRingingIcon },
  served: { tone: "green", icon: CheckCircleIcon },
  paid: { tone: "slate", icon: WalletIcon },
  cancelled: { tone: "red", icon: ProhibitIcon },
};

// List tabs and filters

export const ORDER_TABS = ["open", "all", "billsDue", "paid", "cancelled"] as const;
export type OrderTab = (typeof ORDER_TABS)[number];

export const DATE_RANGES = ["today", "yesterday", "week", "month", "any"] as const;
export type DateRange = (typeof DATE_RANGES)[number];

export const ORDER_SOURCES = ["staff", "qr", "online"] as const satisfies OrderSource[];

export const ORDER_SORTS = ["-createdAt", "createdAt", "-total", "total"] as const;
export type OrderSort = (typeof ORDER_SORTS)[number];

export type OrderFilters = {
  tab: OrderTab;
  search: string;
  sources: OrderSource[];
  tableId: number | null;
  range: DateRange;
  waiterId: number | null;
  sort: OrderSort;
  page: number;
  size: number;
};

/** Open orders and bills due need attention whatever day they were placed on. */
export const tabIgnoresDate = (tab: OrderTab) => tab === "open" || tab === "billsDue";

/** The API's dateFrom/dateTo for a range, in Dhaka business days, both ends included. */
export function rangeDates(range: DateRange, now: Date | number = Date.now()) {
  const today = businessDate(now);
  switch (range) {
    case "today":
      return { dateFrom: today, dateTo: today };
    case "yesterday": {
      const day = shiftDay(today, -1);
      return { dateFrom: day, dateTo: day };
    }
    case "week":
      return { dateFrom: shiftDay(today, -6), dateTo: today };
    case "month":
      return { dateFrom: `${today.slice(0, 8)}01`, dateTo: today };
    case "any":
      return {};
  }
}

const TAB_QUERY: Record<OrderTab, OrdersQuery> = {
  open: { active: true },
  all: {},
  billsDue: { status: ["served"] },
  paid: { status: ["paid"] },
  cancelled: { status: ["cancelled"] },
};

/** Turns what's in the URL into the API's list query. */
export function ordersQuery(filters: OrderFilters, now: Date | number = Date.now()): OrdersQuery {
  return {
    ...TAB_QUERY[filters.tab],
    ...(tabIgnoresDate(filters.tab) ? {} : rangeDates(filters.range, now)),
    search: filters.search.trim() || undefined,
    source: filters.sources.length ? filters.sources : undefined,
    tableId: filters.tableId ?? undefined,
    waiterId: filters.waiterId ?? undefined,
    sort: filters.sort,
    page: filters.page,
    size: filters.size,
  };
}

/** Same filters, one row: only the total is read, for the counts beside the tabs. */
export const countQuery = (tab: OrderTab, filters: OrderFilters, now?: Date | number) =>
  ordersQuery({ ...filters, tab, search: "", page: 1, size: 1 }, now);

// Items

type ItemLike = { foodName: string; quantity: number };

/** The first few dishes for a one-line summary, and how many lines didn't fit. */
export function summarizeItems(items: readonly ItemLike[], limit = 2) {
  return { shown: items.slice(0, limit), more: Math.max(0, items.length - limit) };
}

// Board

export const BOARD_COLUMNS = [
  { key: "waiting", statuses: ["pending", "confirmed"] },
  { key: "preparing", statuses: ["preparing"] },
  { key: "ready", statuses: ["ready"] },
  { key: "served", statuses: ["served"] },
] as const satisfies { key: string; statuses: OrderStatus[] }[];

export type BoardColumn = (typeof BOARD_COLUMNS)[number]["key"];

export function boardColumn(status: OrderStatus): BoardColumn | null {
  return (
    BOARD_COLUMNS.find((column) => (column.statuses as OrderStatus[]).includes(status))?.key ?? null
  );
}

// Time

/** Whole minutes since a timestamp, never negative. */
export const minutesSince = (value: string, now: number) =>
  Math.max(0, Math.floor((now - Date.parse(value)) / 60_000));

/** How long an order has been waiting before it's worth flagging. */
export function ageTone(minutes: number): Tone {
  if (minutes >= 30) return "red";
  if (minutes >= 15) return "amber";
  return "slate";
}

// Moves

/** Where staff can send an order by hand; paid only follows a payment. */
export type OrderMove = Exclude<OrderStatus, "pending" | "paid">;

/** The step forward from here, if there is one; cancel is never the main action. */
export const forwardMove = (moves: readonly OrderStatus[]) =>
  (moves.find((status) => status !== "cancelled") as OrderMove | undefined) ?? null;
