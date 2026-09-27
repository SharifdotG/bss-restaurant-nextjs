import type { QueryClient } from "@tanstack/react-query";
import { onLiveEvent } from "./socket";

// Lists and the dashboard don't need a refetch per event; a second's batching is plenty
// during a rush.
const FLUSH_MS = 1000;

/** Marks cached queries stale when the live feed says their data changed. */
export function syncQueriesWithLive(client: QueryClient) {
  const pending = new Map<string, readonly unknown[]>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let firstSnapshot = true;

  const flush = () => {
    timer = undefined;
    pending.forEach((queryKey) => void client.invalidateQueries({ queryKey }));
    pending.clear();
  };

  const queue = (...keys: (readonly unknown[])[]) => {
    keys.forEach((key) => pending.set(JSON.stringify(key), key));
    timer ??= setTimeout(flush, FLUSH_MS);
  };

  const stop = onLiveEvent((message) => {
    switch (message.event) {
      case "snapshot":
        // The first one only confirms what the page just loaded. Later ones follow a
        // reconnect, and events may have been missed in between.
        if (firstSnapshot) firstSnapshot = false;
        else queue(["orders"], ["order"], ["reservations"], ["reservation"], ["dashboard"]);
        break;
      case "order.created":
      case "order.updated":
        queue(["orders"], ["order", message.data.id], ["dashboard"]);
        break;
      case "reservation.created":
      case "reservation.updated":
        queue(["reservations"], ["reservation", message.data.id], ["dashboard"]);
        break;
    }
  });

  return () => {
    stop();
    clearTimeout(timer);
  };
}
