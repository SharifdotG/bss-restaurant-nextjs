"use client";

import { useTranslations } from "next-intl";
import { useLiveStatus, type LiveStatus } from "@/lib/live/socket";
import { cn } from "@/lib/utils";

const tone: Record<LiveStatus, string> = {
  live: "bg-tone-green-subtle text-tone-green-text [--dot:var(--tone-green)]",
  // A first connect is routine; only a dropped connection earns amber.
  connecting: "bg-tone-slate-subtle text-tone-slate-text [--dot:var(--tone-slate)]",
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
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold transition-colors duration-(--duration-base)",
        tone[status],
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-(--dot)" />
      {t(status)}
    </span>
  );
}
