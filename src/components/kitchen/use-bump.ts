import { useSyncExternalStore } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api, unwrap } from "@/lib/api/client";
import { useErrorText } from "@/lib/api/use-error-text";
import type { HeldMoves, KitchenColumn } from "@/lib/kitchen";
import type { LiveOrder } from "@/lib/live/types";
import type { OrderMove } from "@/lib/orders";
import { useFormat } from "@/lib/use-format";
import { applyOrder } from "@/lib/use-order-actions";

// The API can't move an order back, so a bump waits out a short undo window before it's
// sent. Meanwhile the ticket already sits in its new column.
const UNDO_MS = 5000;

let held: HeldMoves = new Map();
const listeners = new Set<() => void>();

function setHeld(orderId: number, to: OrderMove | null) {
  const next = new Map(held);
  if (to) next.set(orderId, to);
  else next.delete(orderId);
  held = next;
  listeners.forEach((listener) => listener());
}

export const useHeldMoves = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => held,
    () => held,
  );

async function send(client: QueryClient, order: LiveOrder, to: OrderMove) {
  const saved = await unwrap(
    api.POST("/api/v1/orders/{order_id}/status", {
      params: { path: { order_id: order.id } },
      body: { status: to, note: null },
    }),
  );
  applyOrder(client, saved);
}

/** Moves a ticket on with an Undo toast; the request goes out when the toast does. */
export function useBump() {
  const client = useQueryClient();
  const t = useTranslations("kitchen");
  const format = useFormat();
  const errorText = useErrorText();

  return (order: LiveOrder, to: KitchenColumn["next"]) => {
    if (held.has(order.id)) return;
    const n = format.orderNo(order.orderNumber);
    let settled = false;
    setHeld(order.id, to);

    // Runs once, whichever way the toast leaves: timed out, swiped or closed.
    const commit = async () => {
      if (settled) return;
      settled = true;
      try {
        await send(client, order, to);
      } catch (error) {
        toast.error(t("bumpFailed", { n }), { description: errorText.message(error) });
      } finally {
        setHeld(order.id, null);
      }
    };

    toast(t(`bumped.${to}`, { n }), {
      duration: UNDO_MS,
      action: {
        label: t("undo"),
        onClick: () => {
          settled = true;
          setHeld(order.id, null);
        },
      },
      onAutoClose: commit,
      onDismiss: commit,
    });
  };
}
