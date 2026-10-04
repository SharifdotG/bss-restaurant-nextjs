import { useLiveOrders } from "@/lib/live/store";
import { incomingOrders } from "@/lib/notifications";
import { useSession } from "@/lib/session/client";

const NONE: never[] = [];

/** Guest orders waiting on this person, oldest first. Empty for roles that can't accept them. */
export function useIncoming() {
  const session = useSession();
  const orders = useLiveOrders();
  if (session.status !== "authenticated") return NONE;
  return incomingOrders(session.user.role, orders);
}
