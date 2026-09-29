import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { OrdersQuery } from "@/lib/orders";
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
