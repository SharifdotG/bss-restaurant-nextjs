"use client";

import { QrCodeIcon } from "@phosphor-icons/react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { INCOMING_LATE_MINUTES } from "@/lib/notifications";
import { minutesSince } from "@/lib/orders";
import { openOverlay } from "@/lib/overlays";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { useIncoming } from "./use-incoming";

/** Shows up only while guest orders wait, and turns amber once one has waited too long. */
export function IncomingButton({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("incoming");
  const format = useFormatter();
  const waiting = useIncoming();
  const now = useNow(30_000);
  if (waiting.length === 0) return null;

  const late = waiting.some((order) => minutesSince(order.createdAt, now) >= INCOMING_LATE_MINUTES);

  return (
    <Button
      variant="outline"
      size={compact ? "sm" : "default"}
      onClick={() => openOverlay("incoming")}
      aria-label={t("buttonLabel", { n: waiting.length })}
      className={cn(
        "shrink-0 animate-in fade-in-0 zoom-in-95 motion-reduce:zoom-in-100",
        late &&
          "border-transparent bg-tone-amber-subtle text-tone-amber-text hover:bg-tone-amber/20",
      )}
    >
      <QrCodeIcon weight="duotone" />
      {!compact && <span className="hidden xl:inline">{t("button")}</span>}
      <span
        className={cn(
          "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-2xs font-bold tabular-nums",
          late ? "bg-tone-amber-text text-tone-amber-subtle" : "bg-primary text-primary-foreground",
        )}
      >
        {format.number(waiting.length)}
      </span>
    </Button>
  );
}
