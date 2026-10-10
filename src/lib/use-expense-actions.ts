import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api, unwrap } from "@/lib/api/client";
import type { ExpenseCreate, ExpenseOut, ExpenseUpdate } from "@/lib/api/schema";

// Expenses feed the reports' profit figures too.
const useRefreshExpenses = () => {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["expenses"] }),
      client.invalidateQueries({ queryKey: ["reports"] }),
    ]);
};

type SaveExpense = { id?: undefined; body: ExpenseCreate } | { id: number; body: ExpenseUpdate };

export function useSaveExpense() {
  const refresh = useRefreshExpenses();
  const t = useTranslations("expenses.toasts");

  return useMutation({
    mutationFn: ({ id, body }: SaveExpense) =>
      id === undefined
        ? unwrap(api.POST("/api/v1/expenses", { body }))
        : unwrap(
            api.PATCH("/api/v1/expenses/{expense_id}", {
              params: { path: { expense_id: id } },
              body,
            }),
          ),
    onSuccess: (expense, { id }) => {
      void refresh();
      toast.success(t(id === undefined ? "added" : "saved", { title: expense.title }));
    },
  });
}

/** Gone for good, receipt photo included. Managers only. */
export function useDeleteExpense() {
  const refresh = useRefreshExpenses();
  const t = useTranslations("expenses.toasts");

  return useMutation({
    mutationFn: (expense: Pick<ExpenseOut, "id" | "title">) =>
      unwrap(
        api.DELETE("/api/v1/expenses/{expense_id}", {
          params: { path: { expense_id: expense.id } },
        }),
      ),
    onSuccess: (_, expense) => {
      void refresh();
      toast.success(t("deleted", { title: expense.title }));
    },
  });
}
