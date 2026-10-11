"use client";

import { BackspaceIcon } from "@phosphor-icons/react";
import { useFormatter, useTranslations } from "next-intl";
import type { PadKey } from "@/lib/billing";
import { cn } from "@/lib/utils";

const KEYS: PadKey[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];

/** A number pad for the till's money fields. Keys don't take focus from the field. */
export function Keypad({ onKey, className }: { onKey: (key: PadKey) => void; className?: string }) {
  const t = useTranslations("billing.till");
  const format = useFormatter();

  return (
    <div role="group" aria-label={t("keypad")} className={cn("grid grid-cols-3 gap-2", className)}>
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          // Keep the caret in the field the cashier picked.
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => onKey(key)}
          aria-label={key === "back" ? t("delete") : undefined}
          className="grid h-12 place-items-center rounded-md bg-muted text-xl font-bold tabular-nums transition-[background-color,scale] duration-(--duration-fast) ease-standard outline-none select-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/40 active:scale-[0.98] active:bg-brand-track"
        >
          {key === "back" ? (
            <BackspaceIcon weight="duotone" className="size-6" />
          ) : key === "." ? (
            "."
          ) : (
            format.number(Number(key))
          )}
        </button>
      ))}
    </div>
  );
}
