import { QueryClient } from "@tanstack/react-query";
import type { ApiError } from "./errors";

declare module "@tanstack/react-query" {
  interface Register {
    defaultError: ApiError;
  }
}

// Only a dropped connection or a server hiccup is worth asking again; a 4xx won't change.
const shouldRetry = (failures: number, error: ApiError) =>
  failures < 2 && (error.status === 0 || error.status >= 500);

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: shouldRetry },
      // Never resend a mutation: the API has no idempotency keys, so a retried payment
      // could be taken twice.
      mutations: { retry: false },
    },
  });
}
