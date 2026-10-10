import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api, unwrap } from "@/lib/api/client";
import type { TableCreate, TableOut, TableUpdate } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";

type TableRef = Pick<TableOut, "id" | "number">;

// Floor, POS, bookings and the Tables page all read ["tables", …], so one prefix refreshes them.
const useRefreshTables = () => {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ["tables"] });
};

type SaveInput = ({ id?: undefined; body: TableCreate } | { id: number; body: TableUpdate }) & {
  /** The table's staff, when they changed; saved right after the table. */
  employeeIds?: number[];
};

/** A table and its staff in one go. Errors stay with the sheet so it can point at the field. */
export function useSaveTable() {
  const refresh = useRefreshTables();
  const t = useTranslations("tables.toasts");

  return useMutation({
    mutationFn: async ({ id, body, employeeIds }: SaveInput) => {
      const table =
        id === undefined
          ? await unwrap(api.POST("/api/v1/tables", { body }))
          : await unwrap(
              api.PATCH("/api/v1/tables/{table_id}", {
                params: { path: { table_id: id } },
                body,
              }),
            );
      if (!employeeIds) return table;
      return unwrap(
        api.PUT("/api/v1/tables/{table_id}/employees", {
          params: { path: { table_id: table.id } },
          body: { employeeIds },
        }),
      );
    },
    onSuccess: (table, { id }) =>
      toast.success(t(id === undefined ? "created" : "saved", { table: table.number })),
    // A new table may exist even if its staff failed to save.
    onSettled: () => refresh(),
  });
}

/** The full list of staff for each table; several tables at once for "Assign staff". */
export function useSetTableStaff() {
  const refresh = useRefreshTables();
  const t = useTranslations("tables.toasts");
  const errorText = useErrorText();

  return useMutation({
    mutationFn: ({ tables, employeeIds }: { tables: TableRef[]; employeeIds: number[] }) =>
      Promise.all(
        tables.map((table) =>
          unwrap(
            api.PUT("/api/v1/tables/{table_id}/employees", {
              params: { path: { table_id: table.id } },
              body: { employeeIds },
            }),
          ),
        ),
      ),
    onSuccess: (saved) => toast.success(t("staffSaved", { n: saved.length })),
    onError: (error) => toast.error(t("staffFailed"), { description: errorText.message(error) }),
    // Some of a batch may have saved before one failed.
    onSettled: () => refresh(),
  });
}

/** A fresh QR token. Printed cards for the old one stop working at once. */
export function useNewQrCode() {
  const refresh = useRefreshTables();
  const t = useTranslations("tables.toasts");
  const errorText = useErrorText();

  return useMutation({
    mutationFn: (table: TableRef) =>
      unwrap(
        api.POST("/api/v1/tables/{table_id}/qr-token", {
          params: { path: { table_id: table.id } },
        }),
      ),
    onSuccess: (table) => {
      void refresh();
      toast.success(t("newCode", { table: table.number }));
    },
    onError: (error, table) =>
      toast.error(t("newCodeFailed", { table: table.number }), {
        description: errorText.message(error),
      }),
  });
}

/** Only works for a table that has never had an order or booking; otherwise it's switched off. */
export function useDeleteTable() {
  const refresh = useRefreshTables();
  const t = useTranslations("tables.toasts");

  return useMutation({
    mutationFn: (table: TableRef) =>
      unwrap(api.DELETE("/api/v1/tables/{table_id}", { params: { path: { table_id: table.id } } })),
    onSuccess: (_, table) => {
      void refresh();
      toast.success(t("deleted", { table: table.number }));
    },
  });
}
