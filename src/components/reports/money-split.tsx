"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Panel } from "@/components/panel";
import { ShareBar } from "@/components/stats/share-bar";
import { Skeleton } from "@/components/ui/skeleton";
import type { SalesSummary } from "@/lib/api/schema";
import { perHundred } from "@/lib/reports";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

const PARTS = ["vat", "refunds", "expenses", "profit"] as const;

/** Of every ৳100 that came in, what went to VAT, refunds and expenses, and what was left. */
export function MoneySplit({
  totals,
  rangeLabel,
  className,
}: {
  totals: SalesSummary | undefined;
  rangeLabel: string;
  className?: string;
}) {
  const t = useTranslations("reports.split");
  const format = useFormat();
  const split = totals && perHundred(totals);

  return (
    <Panel
      className={className}
      title={t("title")}
      subtitle={t("sub", { amount: format.money(100), range: rangeLabel })}
    >
      {!totals ? (
        <div className="grid gap-5">
          {PARTS.map((part) => (
            <Skeleton key={part} className="h-10 rounded-md" />
          ))}
        </div>
      ) : (
        <>
          <ul className="grid gap-5">
            {PARTS.map((part) => {
              const share = split?.[part] ?? 0;
              const loss = part === "profit" && totals.profit < 0;
              return (
                <li key={part} className="grid gap-2">
                  <div className="flex items-baseline gap-3">
                    <span className="flex-1 text-sm font-bold">{t(part)}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {format.money(totals[part])}
                    </span>
                    <span
                      className={cn(
                        "w-20 text-right text-sm font-bold tabular-nums",
                        loss && "text-tone-red-text",
                      )}
                    >
                      {split ? format.money(share) : "—"}
                    </span>
                  </div>
                  <ShareBar value={share} muted={part !== "profit"} />
                </li>
              );
            })}
          </ul>
          <p
            className={cn(
              "mt-auto flex gap-2 rounded-lg px-3 py-2.5 text-xs",
              totals.profit < 0
                ? "bg-tone-amber-subtle text-tone-amber-text"
                : "bg-muted text-muted-foreground",
            )}
          >
            {totals.profit < 0 && (
              <WarningCircleIcon weight="duotone" className="size-4 shrink-0" />
            )}
            {totals.profit < 0 ? t("loss") : t("note")}
          </p>
        </>
      )}
    </Panel>
  );
}
