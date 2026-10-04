"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ConnectionBanner } from "@/components/shell/connection-banner";
import { foodsQuery } from "@/lib/api/queries";
import { kitchenBoard, prepByName, type KitchenColumn } from "@/lib/kitchen";
import { syncTickets } from "@/lib/kitchen-tickets";
import { useLiveOrders, useLiveSynced, useServerNow } from "@/lib/live/store";
import type { LiveOrder } from "@/lib/live/types";
import { useSession } from "@/lib/session/client";
import { playChime, primeSound, unlockSound } from "@/lib/sound";
import { useFullscreen, useWakeLock } from "@/lib/use-screen";
import { useShellLayout } from "@/lib/use-shell-layout";
import { KitchenBoard } from "./kitchen-board";
import { KitchenHeader } from "./kitchen-header";
import { StartService } from "./start-service";
import { useBump, useHeldMoves } from "./use-bump";

type Service = "ask" | "on" | "skipped";
// Asked once per visit; coming back from the profile page doesn't ask again.
let answered: Service | null = null;

/** The live kitchen: tickets in from the socket, bumped along with a tap. */
export function KitchenPage() {
  const t = useTranslations("kitchen");
  const session = useSession();
  const orders = useLiveOrders();
  const synced = useLiveSynced();
  const held = useHeldMoves();
  const now = useServerNow(15_000);
  const phone = useShellLayout() === "phone";
  const foods = useQuery(foodsQuery);
  const bump = useBump();
  const screen = useFullscreen();
  const [service, setService] = useState<Service>(() => answered ?? "ask");
  useWakeLock(service === "on");

  // Waved off the start screen? Sound still unlocks on the next tap anywhere.
  useEffect(() => primeSound(), []);

  // New tickets and additions to ones already cooking get a chime.
  useEffect(() => {
    if (!synced) return;
    const news = syncTickets(orders);
    if (news.fresh.length || news.added.length) playChime("ticket");
  }, [orders, synced]);

  if (session.status !== "authenticated") return null;
  const { user } = session;
  const board = kitchenBoard(orders, held);
  const waiting = board.toCook.length;

  return (
    <div className="flex h-dvh flex-col">
      <KitchenHeader role={user.role} name={user.fullName} />
      <ConnectionBanner kitchen />
      {/* Read out when a ticket lands, for anyone not watching the screen. */}
      <p aria-live="polite" className="sr-only">
        {synced ? t("toCookCount", { n: waiting }) : null}
      </p>
      <KitchenBoard
        board={board}
        loading={!synced && orders.length === 0}
        role={user.role}
        held={held}
        prep={prepByName(foods.data ?? [])}
        now={now}
        phone={phone}
        onBump={(order: LiveOrder, column: KitchenColumn) => bump(order, column.next)}
      />
      <StartService
        open={service === "ask"}
        onDone={(tapped) => {
          if (tapped) {
            unlockSound();
            screen.enter();
          }
          answered = tapped ? "on" : "skipped";
          setService(answered);
        }}
      />
    </div>
  );
}
