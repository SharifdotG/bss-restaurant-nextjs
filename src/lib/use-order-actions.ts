import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api, unwrap } from "@/lib/api/client";
import type { OrderCreate, OrderDetailOut, OrderItemIn, OrderUpdate } from "@/lib/api/schema";
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

type ItemsInput = { order: OrderRef; items: OrderItemIn[] };

/** Swaps the whole item list; the API only allows it before the kitchen starts. */
export function useReplaceItems() {
  const client = useQueryClient();
  const t = useTranslations("orders");

  return useMutation({
    mutationFn: ({ order, items }: ItemsInput) =>
      unwrap(
        api.PUT("/api/v1/orders/{order_id}/items", {
          params: { path: { order_id: order.id } },
          body: { items },
        }),
      ),
    onSuccess: (order) => {
      applyOrder(client, order);
      toast.success(t("itemsSaved", { n: shortOrderNumber(order.orderNumber) }));
    },
  });
}

type UpdateInput = { order: OrderRef; changes: OrderUpdate };

/** Table, waiter and customer details; the items and the status have their own calls. */
export function useUpdateOrder() {
  const client = useQueryClient();
  const t = useTranslations("orders");
  const errorText = useErrorText();

  return useMutation({
    mutationFn: ({ order, changes }: UpdateInput) =>
      unwrap(
        api.PATCH("/api/v1/orders/{order_id}", {
          params: { path: { order_id: order.id } },
          body: changes,
        }),
      ),
    onSuccess: (order) => {
      applyOrder(client, order);
      toast.success(t("updated", { n: shortOrderNumber(order.orderNumber) }));
    },
    onError: (error) => toast.error(t("updateFailed"), { description: errorText.message(error) }),
  });
}

/**
 * "Send to kitchen": create the order, then confirm it so the chef sees it straight away.
 * If the confirm doesn't go through, the order still exists as pending and says so.
 */
export function useSendOrder() {
  const client = useQueryClient();
  const t = useTranslations("pos");

  return useMutation({
    mutationFn: async (body: OrderCreate) => {
      const created = await unwrap(api.POST("/api/v1/orders", { body }));
      applyOrder(client, created);
      try {
        const confirmed = await unwrap(
          api.POST("/api/v1/orders/{order_id}/status", {
            params: { path: { order_id: created.id } },
            body: { status: "confirmed", note: null },
          }),
        );
        return { order: confirmed, confirmed: true };
      } catch {
        return { order: created, confirmed: false };
      }
    },
    onSuccess: ({ order, confirmed }) => {
      applyOrder(client, order);
      const n = shortOrderNumber(order.orderNumber);
      if (confirmed) toast.success(t("sent", { n }));
      else toast.warning(t("sentNotConfirmed", { n }));
    },
  });
}

/** New lines on an open order; the API keeps them separate so old prices stay as they were. */
export function useAddItems() {
  const client = useQueryClient();
  const t = useTranslations("pos");

  return useMutation({
    mutationFn: ({ order, items }: ItemsInput) =>
      unwrap(
        api.POST("/api/v1/orders/{order_id}/items", {
          params: { path: { order_id: order.id } },
          body: { items },
        }),
      ),
    onSuccess: (order) => {
      applyOrder(client, order);
      toast.success(t("added", { n: shortOrderNumber(order.orderNumber) }));
    },
  });
}
