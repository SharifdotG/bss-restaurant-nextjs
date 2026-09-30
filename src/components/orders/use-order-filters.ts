import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsNumberLiteral,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import {
  DATE_RANGES,
  ORDER_SORTS,
  ORDER_SOURCES,
  ORDER_TABS,
  type OrderFilters,
} from "@/lib/orders";

export const PAGE_SIZES = [10, 20, 50] as const;
export const ORDER_VIEWS = ["list", "board"] as const;

const parsers = {
  tab: parseAsStringLiteral(ORDER_TABS).withDefault("open"),
  view: parseAsStringLiteral(ORDER_VIEWS).withDefault("list"),
  q: parseAsString.withDefault(""),
  source: parseAsArrayOf(parseAsStringLiteral(ORDER_SOURCES)).withDefault([]),
  table: parseAsInteger,
  range: parseAsStringLiteral(DATE_RANGES).withDefault("today"),
  waiter: parseAsInteger,
  mine: parseAsBoolean.withDefault(false),
  sort: parseAsStringLiteral(ORDER_SORTS).withDefault("-createdAt"),
  page: parseAsInteger.withDefault(1),
  size: parseAsNumberLiteral(PAGE_SIZES).withDefault(20),
};

export type OrderUrlState = ReturnType<typeof useOrderUrl>[0];

/** A partial update; null puts a key back to its default. */
export type OrderUrlChange = { [K in keyof OrderUrlState]?: OrderUrlState[K] | null };

/** Everything about the orders view lives in the address, so links and back/forward keep it. */
export function useOrderUrl() {
  return useQueryStates(parsers);
}

/** The URL state as list filters; "mine" becomes the signed-in waiter's id once it's known. */
export function toFilters(url: OrderUrlState, myWaiterId: number | null): OrderFilters {
  return {
    tab: url.tab,
    search: url.q,
    sources: url.source,
    tableId: url.table,
    range: url.range,
    waiterId: url.mine ? myWaiterId : url.waiter,
    sort: url.sort,
    page: url.page,
    size: url.size,
  };
}

/** Filters a person set on purpose; the tab, view, sort and paging don't count. */
export const hasFilters = (url: OrderUrlState) =>
  Boolean(
    url.q || url.source.length || url.table || url.waiter || url.mine || url.range !== "today",
  );
