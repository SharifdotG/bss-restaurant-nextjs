"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useLiveOrders, useLiveSynced } from "@/lib/live/store";
import { incomingOrders } from "@/lib/notifications";
import { openOverlay } from "@/lib/overlays";
import { useSession } from "@/lib/session/client";
import { playChime, primeSound } from "@/lib/sound";
import { useFormat } from "@/lib/use-format";

// Unanswered guest orders chime again this often, so a busy floor doesn't forget them.
const REMIND_MS = 2 * 60_000;

/** Chimes and toasts when a QR or online order arrives. Renders nothing. */
export function IncomingWatcher() {
  const t = useTranslations("incoming");
  const tOrders = useTranslations("orders");
  const format = useFormat();
  const session = useSession();
  const orders = useLiveOrders();
  const synced = useLiveSynced();
  const role = session.status === "authenticated" ? session.user.role : null;
  // Orders already waiting when the page loaded aren't news; null until then.
  const known = useRef<Set<number> | null>(null);

  useEffect(() => primeSound(), []);

  useEffect(() => {
    if (!synced || !role) return;
    const waiting = incomingOrders(role, orders);
    const seen = known.current;
    known.current = new Set(waiting.map((order) => order.id));
    if (!seen) return;

    const fresh = waiting.filter((order) => !seen.has(order.id));
    if (fresh.length === 0) return;
    playChime("guest");
    for (const order of fresh) {
      toast(
        t("arrived", {
          n: format.orderNo(order.orderNumber),
          where: order.table ? order.table.number : tOrders("takeaway"),
        }),
        {
          id: `incoming-${order.id}`,
          description: t(`from.${order.source === "online" ? "online" : "qr"}`, {
            items: order.itemCount,
          }),
          duration: 8000,
          action: { label: t("review"), onClick: () => openOverlay("incoming") },
        },
      );
    }
  }, [orders, synced, role, t, tOrders, format]);

  const anyWaiting = role !== null && incomingOrders(role, orders).length > 0;
  useEffect(() => {
    if (!anyWaiting) return;
    const timer = setInterval(() => playChime("guest"), REMIND_MS);
    return () => clearInterval(timer);
  }, [anyWaiting]);

  return null;
}
