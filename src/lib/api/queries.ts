import { queryOptions } from "@tanstack/react-query";
import { api, unwrap } from "./client";

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
