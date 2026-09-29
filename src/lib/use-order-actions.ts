import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api, unwrap } from "@/lib/api/client";
import type { OrderDetailOut } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";
import { shortOrderNumber } from "@/lib/format";
import { receive, toLiveOrder } from "@/lib/live/store";
import type { OrderMove } from "@/lib/orders";

type OrderRef = { id: number; orderNumber: string };

/**
 * Puts a saved order everywhere it shows: its own page at once, lists on their next fetch,
 * and the live store so the kitchen and the bell don't wait for the socket's echo.
 */
export function applyOrder(client: QueryClient, order: OrderDetailOut) {
  client.setQueryData(["order", order.id], order);
  void client.invalidateQueries({ queryKey: ["orders"] });
  void client.invalidateQueries({ queryKey: ["dashboard"] });
  receive({
    event: "order.updated",
    topic: "orders",
    at: order.updatedAt,
    data: toLiveOrder(order),
  });
}

type StatusInput = { order: OrderRef; status: OrderMove; note?: string };

/**
 * One tap moves an order on. Status changes can't be taken back, so they aren't
 * optimistic: the button waits for the API and the toast confirms what happened.
 */
export function useOrderStatus({ toastErrors = true } = {}) {
  const client = useQueryClient();
  const t = useTranslations("orders");
  const errorText = useErrorText();

  return useMutation({
    mutationFn: ({ order, status, note }: StatusInput) =>
      unwrap(
        api.POST("/api/v1/orders/{order_id}/status", {
          params: { path: { order_id: order.id } },
          body: { status, note: note?.trim() || null },
        }),
      ),
    onSuccess: (order, { status }) => {
      applyOrder(client, order);
      toast.success(t(`moved.${status}`, { n: shortOrderNumber(order.orderNumber) }));
    },
    onError: (error, { order }) => {
      // The status changed under us; fetch what's true now.
      void client.invalidateQueries({ queryKey: ["order", order.id] });
      void client.invalidateQueries({ queryKey: ["orders"] });
      if (toastErrors) {
        toast.error(t("moveFailed", { n: shortOrderNumber(order.orderNumber) }), {
          description: errorText.message(error),
        });
      }
    },
  });
}
