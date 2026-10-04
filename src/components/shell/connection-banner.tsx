"use client";

import { ArrowsClockwiseIcon, WifiSlashIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { retryLiveNow, useLiveStatus, useLiveTiming } from "@/lib/live/socket";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

// Short blips are covered by the chip alone; the banner waits this long before speaking up.
const GRACE_MS = 10_000;

/**
 * Says so when live updates have been down for a while, without blocking the page. The
 * kitchen gets a red bar across the top: there, a quiet screen could mean missed tickets.
 */
export function ConnectionBanner({ kitchen = false }: { kitchen?: boolean }) {
  const status = useLiveStatus();
  if (status !== "reconnecting" && status !== "offline") return null;
  return <Banner offline={status === "offline"} kitchen={kitchen} />;
}

function Banner({ offline, kitchen }: { offline: boolean; kitchen: boolean }) {
  const t = useTranslations("shell.connection");
  const { downSince, retryAt } = useLiveTiming();
  const now = useNow(1000);
  if (downSince === null || now - downSince < GRACE_MS) return null;

  const seconds = Math.round((now - downSince) / 1000);
  const retryIn = retryAt === null ? 0 : Math.max(0, Math.ceil((retryAt - now) / 1000));

  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-sm",
        kitchen
          ? "bg-tone-red-subtle text-tone-red-text md:px-6"
          : "mx-4 mt-3 mb-2 rounded-lg bg-tone-amber-subtle text-tone-amber-text md:mx-6 md:mt-0 xl:mx-8",
      )}
    >
      <WifiSlashIcon weight="duotone" className="size-5 shrink-0" />
      {kitchen ? (
        <p className="min-w-0 flex-1 font-medium">{t("kitchen", { seconds })}</p>
      ) : (
        <p className="min-w-0 flex-1">
          <span className="font-bold">{t(offline ? "offline" : "paused")}</span>{" "}
          {offline ? t("offlineHint") : t("stale", { seconds })}
        </p>
      )}
      {!offline && (
        <div className="flex items-center gap-3">
          {retryIn > 0 && <span className="text-xs">{t("retryIn", { seconds: retryIn })}</span>}
          <Button
            variant={kitchen ? "outline" : "ghost"}
            size="sm"
            className={kitchen ? undefined : "text-tone-amber-text hover:bg-tone-amber/15"}
            onClick={retryLiveNow}
          >
            <ArrowsClockwiseIcon />
            {t("retry")}
          </Button>
        </div>
      )}
    </div>
  );
}
