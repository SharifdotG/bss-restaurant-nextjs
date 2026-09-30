import { useQuery } from "@tanstack/react-query";
import { activeOrdersQuery, tablesQuery } from "@/lib/api/queries";
import { useSession } from "@/lib/session/client";

/**
 * The signed-in person's staff record id, for "my orders". /auth/me doesn't return it, so it's
 * found by name: the API copies first and last name between a login and its staff record.
 * Their assigned tables are checked first, then the orders they're serving.
 */
export function useMyWaiterId(): number | null {
  const session = useSession();
  const name = session.status === "authenticated" ? session.user.fullName : null;
  const tables = useQuery({ ...tablesQuery, enabled: name !== null }).data;
  const orders = useQuery({ ...activeOrdersQuery, enabled: name !== null }).data;
  if (!name) return null;

  const fromTables = tables
    ?.flatMap((table) => table.employees)
    .find((employee) => employee.fullName === name);
  if (fromTables) return fromTables.id;

  return orders?.items.find((order) => order.waiter?.fullName === name)?.waiter?.id ?? null;
}
