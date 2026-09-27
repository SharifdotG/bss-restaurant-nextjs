"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/api/query-client";
import { getSession, subscribeSession } from "@/lib/session/client";

const Devtools =
  process.env.NODE_ENV === "development"
    ? lazy(() =>
        import("@tanstack/react-query-devtools").then((module) => ({
          default: module.ReactQueryDevtools,
        })),
      )
    : null;

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(makeQueryClient);

  // Nothing cached for one person should be seen by the next one at this till.
  useEffect(
    () =>
      subscribeSession(() => {
        if (getSession().status === "anonymous") client.clear();
      }),
    [client],
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      {Devtools && (
        <Suspense>
          <Devtools buttonPosition="bottom-right" />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}
