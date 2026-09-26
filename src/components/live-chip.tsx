"use client";

import { useTranslations } from "next-intl";
import { useLiveStatus, type LiveStatus } from "@/lib/live/socket";
import { cn } from "@/lib/utils";

const tone: Record<LiveStatus, string> = {
  live: "bg-tone-green-subtle text-tone-green-text [--dot:var(--tone-green)]",
  connecting: "bg-tone-amber-subtle text-tone-amber-text [--dot:var(--tone-amber)]",
  reconnecting: "bg-tone-amber-subtle text-tone-amber-text [--dot:var(--tone-amber)]",
  offline: "bg-tone-red-subtle text-tone-red-text [--dot:var(--tone-red)]",
  idle: "bg-tone-slate-subtle text-tone-slate-text [--dot:var(--tone-slate)]",
};

export function LiveChip() {
  const t = useTranslations("session.live");
  const status = useLiveStatus();

  return (
    <span
      role="status"
      className={cn(
        "inline-flex h-7 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors duration-(--duration-base)",
        tone[status],
      )}
    >
      <span aria-hidden className="size-2 rounded-full bg-(--dot)" />
      {t(status)}
    </span>
  );
}
