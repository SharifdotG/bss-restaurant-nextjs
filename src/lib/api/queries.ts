import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { OrdersQuery } from "@/lib/orders";
import type { GroupBy, OrderSource, ReservationStatus, paths } from "./schema";
import { api, unwrap } from "./client";

// Keys start with the resource: ["orders", filters], ["order", id], ["reservations", …],
// ["dashboard"]. The live feed invalidates by those prefixes (lib/live/query-sync.ts).

export const restaurantQuery = queryOptions({
  queryKey: ["restaurant"],
  queryFn: () => unwrap(api.GET("/api/v1/restaurant")),
  staleTime: 10 * 60_000,
});

export const dashboardQuery = queryOptions({
  queryKey: ["dashboard"],
  queryFn: () => unwrap(api.GET("/api/v1/dashboard")),
});

// No sign-in needed; the login page also uses it to wake the database on a cold start.
export const publicRestaurantQuery = queryOptions({
  queryKey: ["public", "restaurant"],
  queryFn: () => unwrap(api.GET("/api/v1/public/restaurant")),
  staleTime: 10 * 60_000,
});

/** The table a guest's QR code belongs to; a 404 means the code was replaced or switched off. */
export const publicTableQuery = (token: string) =>
  queryOptions({
    queryKey: ["public", "table", token],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/api/v1/public/tables/{qr_token}", {
          params: { path: { qr_token: token } },
          signal,
        }),
      ),
    retry: false,
    staleTime: 10 * 60_000,
  });

// Orders

export const ordersQuery = (query: OrdersQuery) =>
  queryOptions({
    queryKey: ["orders", query],
    queryFn: ({ signal }) => unwrap(api.GET("/api/v1/orders", { params: { query }, signal })),
    // Paging and filtering keep the old rows on screen until the new ones land.
    placeholderData: keepPreviousData,
  });

/**
 * Everything still open, oldest first. The board, the floor and the tab counts share it;
 * a busy night stays well under the API's page limit of 100.
 */
export const activeOrdersQuery = ordersQuery({ active: true, sort: "createdAt", size: 100 });

export const orderQuery = (id: number) =>
  queryOptions({
    queryKey: ["order", id],
    queryFn: ({ signal }) =>
      unwrap(api.GET("/api/v1/orders/{order_id}", { params: { path: { order_id: id } }, signal })),
  });

// The menu and the room change rarely during service; sold-out is the exception, so foods
// go stale faster.

export const tablesQuery = queryOptions({
  queryKey: ["tables"],
  queryFn: ({ signal }) =>
    unwrap(api.GET("/api/v1/tables", { params: { query: { isActive: true, size: 100 } }, signal })),
  select: (page) =>
    page.items.toSorted((a, b) => a.number.localeCompare(b.number, "en", { numeric: true })),
  staleTime: 5 * 60_000,
});

export const foodsQuery = queryOptions({
  queryKey: ["foods"],
  queryFn: ({ signal }) =>
    unwrap(api.GET("/api/v1/foods", { params: { query: { size: 100, sort: "name" } }, signal })),
  select: (page) => page.items,
  staleTime: 30_000,
});

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: ({ signal }) => unwrap(api.GET("/api/v1/categories", { signal })),
  select: (categories) => categories.toSorted((a, b) => a.sortOrder - b.sortOrder),
  staleTime: 5 * 60_000,
});

/** Staff who can take a table. Managers only: the API keeps the staff list to them. */
export const waitersQuery = queryOptions({
  queryKey: ["employees", "waiters"],
  queryFn: ({ signal }) =>
    unwrap(
      api.GET("/api/v1/employees", {
        params: { query: { isActive: true, hasAccount: true, size: 100, sort: "firstName" } },
        signal,
      }),
    ),
  select: (page) =>
    page.items.filter(
      (employee) =>
        employee.account?.isActive &&
        (employee.account.role === "waiter" || employee.account.role === "manager"),
    ),
  staleTime: 5 * 60_000,
});

// Bookings

/** One day's bookings that still matter on the floor: asked for, confirmed or seated. */
export const dayBookingsQuery = (day: string) =>
  queryOptions({
    queryKey: ["reservations", { day, open: true }],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/api/v1/reservations", {
          params: {
            query: {
              dateFrom: day,
              dateTo: day,
              status: ["requested", "confirmed", "seated"],
              sort: "startsAt",
              size: 100,
            },
          },
          signal,
        }),
      ),
    select: (page) => page.items,
  });

/** Everything booked for one day, whatever happened to it; the reservations grid draws it. */
export const dayReservationsQuery = (day: string) =>
  queryOptions({
    queryKey: ["reservations", { day }],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/api/v1/reservations", {
          params: { query: { dateFrom: day, dateTo: day, sort: "startsAt", size: 100 } },
          signal,
        }),
      ),
    select: (page) => page.items,
    placeholderData: keepPreviousData,
  });

/** Bookings still to come on any day: requests waiting for a yes and confirmed tables. */
export const upcomingReservationsQuery = (
  range: { dateFrom: string; dateTo: string },
  status: ReservationStatus[],
) =>
  queryOptions({
    queryKey: ["reservations", { ...range, status }],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/api/v1/reservations", {
          params: { query: { ...range, status, sort: "startsAt", size: 100 } },
          signal,
        }),
      ),
    select: (page) => page.items,
  });

/** Name, phone or booking code across every date, latest first. */
export const reservationSearchQuery = (search: string) =>
  queryOptions({
    queryKey: ["reservations", { search }],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/api/v1/reservations", {
          params: { query: { search, sort: "-startsAt", size: 50 } },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
    enabled: search.trim().length > 1,
  });

type AvailabilityQuery = NonNullable<
  paths["/api/v1/reservations/availability"]["get"]["parameters"]["query"]
>;

/** Tables free for a party at a time, smallest first. */
export const availabilityQuery = (query: AvailabilityQuery, enabled = true) =>
  queryOptions({
    queryKey: ["reservations", "availability", query],
    queryFn: ({ signal }) =>
      unwrap(api.GET("/api/v1/reservations/availability", { params: { query }, signal })),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled,
  });

/** Every table including switched-off ones, for the Tables page. */
export const allTablesQuery = queryOptions({
  queryKey: ["tables", "all"],
  queryFn: ({ signal }) =>
    unwrap(api.GET("/api/v1/tables", { params: { query: { size: 100 } }, signal })),
  select: (page) => page.items,
});

// Billing

/** Bills settled today, newest first, for the bottom of the billing queue. */
export const paidTodayQuery = (day: string) =>
  ordersQuery({ status: ["paid"], dateFrom: day, dateTo: day, sort: "-createdAt", size: 30 });

/**
 * The API's printable bill or receipt. It needs the bearer token, so it's fetched as text
 * and shown in a sandboxed frame instead of opening the URL.
 */
export const receiptQuery = (id: number, status: string) =>
  queryOptions({
    // The status is in the key because a bill turns into a receipt once it's paid.
    queryKey: ["order", id, "receipt", status],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/api/v1/orders/{order_id}/receipt", {
          params: { path: { order_id: id } },
          parseAs: "text",
          signal,
        }),
      ),
    staleTime: 30_000,
  });

// Reports (managers only). Past days don't change, so they stay fresh for a while; ranges
// that reach today get refetched when the tab comes back into focus.

type ReportRange = { from: string; to: string };
const REPORT_STALE = 60_000;

export const salesReportQuery = ({ from, to, groupBy }: ReportRange & { groupBy: GroupBy }) =>
  queryOptions({
    queryKey: ["reports", "sales", { from, to, groupBy }],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/api/v1/reports/sales", {
          params: { query: { dateFrom: from, dateTo: to, groupBy } },
          signal,
        }),
      ),
    staleTime: REPORT_STALE,
    placeholderData: keepPreviousData,
  });

export const topFoodsQuery = ({ from, to, limit = 10 }: ReportRange & { limit?: number }) =>
  queryOptions({
    queryKey: ["reports", "top-foods", { from, to, limit }],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/api/v1/reports/top-foods", {
          params: { query: { dateFrom: from, dateTo: to, limit } },
          signal,
        }),
      ),
    staleTime: REPORT_STALE,
    placeholderData: keepPreviousData,
  });

export const expenseReportQuery = ({ from, to }: ReportRange) =>
  queryOptions({
    queryKey: ["reports", "expenses", { from, to }],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/api/v1/reports/expenses", {
          params: { query: { dateFrom: from, dateTo: to } },
          signal,
        }),
      ),
    staleTime: REPORT_STALE,
    placeholderData: keepPreviousData,
  });

export const staffReportQuery = ({ from, to }: ReportRange) =>
  queryOptions({
    queryKey: ["reports", "staff", { from, to }],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/api/v1/reports/staff", {
          params: { query: { dateFrom: from, dateTo: to } },
          signal,
        }),
      ),
    staleTime: REPORT_STALE,
    placeholderData: keepPreviousData,
  });

/** How many of today's orders came in one way; only the page total is read. */
export const sourceCountQuery = (day: string, source: OrderSource) =>
  queryOptions({
    ...ordersQuery({
      source: [source],
      dateFrom: day,
      dateTo: day,
      status: ["pending", "confirmed", "preparing", "ready", "served", "paid"],
      size: 1,
    }),
    select: (page) => page.total,
  });
