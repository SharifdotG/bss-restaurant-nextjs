import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import type { PaymentMethod } from "@/lib/api/schema";
import { toTaka } from "@/lib/money";
import { applyOrder } from "@/lib/use-order-actions";

type OrderRef = { id: number };

export type PaymentInput = {
  order: OrderRef;
  method: PaymentMethod;
  /** Paisa, like everything else at the till. */
  amount: number;
  tendered: number | null;
  reference?: string;
  note?: string;
};

/**
 * Takes money for an order. Never retried and never optimistic: a payment that may or may
 * not have landed is worse than one that visibly failed. The till shows errors itself.
 */
export function useTakePayment() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ order, method, amount, tendered, reference, note }: PaymentInput) =>
      unwrap(
        api.POST("/api/v1/orders/{order_id}/payments", {
          params: { path: { order_id: order.id } },
          body: {
            method,
            amount: toTaka(amount),
            tendered: method === "cash" && tendered ? toTaka(tendered) : null,
            reference: reference?.trim() || null,
            note: note?.trim() || null,
          },
        }),
      ),
    onSuccess: (order) => applyOrder(client, order),
    // Someone else may have taken it first; show what's true now.
    onError: (_, { order }) => void client.invalidateQueries({ queryKey: ["order", order.id] }),
  });
}

export type RefundInput = {
  order: OrderRef;
  method: PaymentMethod;
  amount: number;
  reason: string;
  reference?: string;
};

/** Gives money back. Managers only; the order keeps its status. */
export function useRefund() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ order, method, amount, reason, reference }: RefundInput) =>
      unwrap(
        api.POST("/api/v1/orders/{order_id}/refunds", {
          params: { path: { order_id: order.id } },
          body: {
            method,
            amount: toTaka(amount),
            reason: reason.trim(),
            reference: reference?.trim() || null,
          },
        }),
      ),
    onSuccess: (order) => applyOrder(client, order),
    onError: (_, { order }) => void client.invalidateQueries({ queryKey: ["order", order.id] }),
  });
}
