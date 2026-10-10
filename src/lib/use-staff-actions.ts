import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api, unwrap } from "@/lib/api/client";
import type {
  EmployeeAccountIn,
  EmployeeCreate,
  EmployeeOut,
  EmployeeUpdate,
  UserUpdate,
} from "@/lib/api/schema";

type Person = Pick<EmployeeOut, "id" | "fullName">;

// The staff list, a person's page, the waiter pickers and Tables all hang off these prefixes.
const useRefreshStaff = () => {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["employees"] }),
      client.invalidateQueries({ queryKey: ["users"] }),
      client.invalidateQueries({ queryKey: ["tables"] }),
    ]);
};

type SaveEmployee = { id?: undefined; body: EmployeeCreate } | { id: number; body: EmployeeUpdate };

/** Errors stay with the sheet so it can point at the field. */
export function useSaveEmployee() {
  const refresh = useRefreshStaff();
  const t = useTranslations("staff.toasts");

  return useMutation({
    mutationFn: ({ id, body }: SaveEmployee) =>
      id === undefined
        ? unwrap(api.POST("/api/v1/employees", { body }))
        : unwrap(
            api.PATCH("/api/v1/employees/{employee_id}", {
              params: { path: { employee_id: id } },
              body,
            }),
          ),
    onSuccess: (person, { id }) => {
      void refresh();
      toast.success(t(id === undefined ? "added" : "saved", { name: person.fullName }));
    },
  });
}

/** A sign-in for someone already on the books. */
export function useCreateAccount() {
  const refresh = useRefreshStaff();
  const t = useTranslations("staff.toasts");

  return useMutation({
    mutationFn: ({ person, body }: { person: Person; body: EmployeeAccountIn }) =>
      unwrap(
        api.POST("/api/v1/employees/{employee_id}/account", {
          params: { path: { employee_id: person.id } },
          body,
        }),
      ),
    onSuccess: (_, { person }) => {
      void refresh();
      toast.success(t("accountCreated", { name: person.fullName }));
    },
  });
}

/** Role changes and turning a sign-in off or back on. */
export function useUpdateAccount() {
  const refresh = useRefreshStaff();
  const t = useTranslations("staff.toasts");

  return useMutation({
    mutationFn: ({ userId, body }: { userId: number; name: string; body: UserUpdate }) =>
      unwrap(api.PATCH("/api/v1/users/{user_id}", { params: { path: { user_id: userId } }, body })),
    onSuccess: (_, { name, body }) => {
      void refresh();
      const key =
        body.isActive === false ? "signInOff" : body.isActive === true ? "signInOn" : "roleSaved";
      toast.success(t(key, { name }));
    },
  });
}

/** Their other devices stay signed in until their current access token runs out. */
export function useResetPassword() {
  return useMutation({
    mutationFn: ({ userId, password }: { userId: number; password: string }) =>
      unwrap(
        api.POST("/api/v1/users/{user_id}/reset-password", {
          params: { path: { user_id: userId } },
          body: { newPassword: password },
        }),
      ),
  });
}

/** Permanent in the API: also turns off their sign-in and takes them off their tables. */
export function useMarkLeft() {
  const refresh = useRefreshStaff();
  const t = useTranslations("staff.toasts");

  return useMutation({
    mutationFn: (person: Person) =>
      unwrap(
        api.DELETE("/api/v1/employees/{employee_id}", {
          params: { path: { employee_id: person.id } },
        }),
      ),
    onSuccess: (_, person) => {
      void refresh();
      toast.success(t("left", { name: person.fullName }));
    },
  });
}
