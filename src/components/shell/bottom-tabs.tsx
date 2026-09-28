"use client";

import { useState } from "react";
import { DotsThreeIcon, PlusIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Count } from "@/components/ui/count";
import { Link } from "@/i18n/navigation";
import type { UserRole } from "@/lib/api/schema";
import { useLiveOrders } from "@/lib/live/store";
import { bottomTabs, navCounts } from "@/lib/navigation";
import { PAGE_PATHS, type Page } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { MoreSheet } from "./more-sheet";
import { PAGE_ICONS } from "./page-icon";

const tabClass =
  "relative flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md text-2xs font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/40";

/** Phone navigation: the role's main pages, with everything else behind More. */
export function BottomTabs({ role, current }: { role: UserRole; current: Page | null }) {
  const t = useTranslations("shell");
  const nav = useTranslations("nav");
  const counts = navCounts(useLiveOrders());
  const [moreOpen, setMoreOpen] = useState(false);
  const tabs = bottomTabs(role);
  const onTab = current !== null && tabs.includes(current);

  return (
    <>
      <nav
        aria-label={t("mainNav")}
        className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-border bg-card px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),10px)]"
      >
        {tabs.map((page) => {
          const active = page === current;
          if (page === "newOrder") {
            return (
              <Link
                key={page}
                href={PAGE_PATHS[page]}
                aria-current={active ? "page" : undefined}
                className={cn(tabClass, "text-foreground")}
              >
                <span className="grid h-9 w-11 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                  <PlusIcon weight="bold" className="size-5" />
                </span>
                {t("newShort")}
              </Link>
            );
          }
          const Icon = PAGE_ICONS[page];
          return (
            <Link
              key={page}
              href={PAGE_PATHS[page]}
              aria-current={active ? "page" : undefined}
              className={cn(
                tabClass,
                active ? "text-primary-soft-foreground" : "text-muted-foreground",
              )}
            >
              <span className="relative">
                <Icon weight={active ? "duotone" : "regular"} className="size-6" />
                <Count
                  value={counts[page] ?? 0}
                  className="absolute -top-1.5 left-4 h-4 min-w-4 px-1 ring-2 ring-card"
                />
              </span>
              <span className="max-w-full truncate px-1">
                {page === "reservations" ? t("bookings") : nav(page)}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          className={cn(
            tabClass,
            !onTab && current !== null ? "text-primary-soft-foreground" : "text-muted-foreground",
          )}
        >
          <DotsThreeIcon weight="bold" className="size-6" />
          {t("more")}
        </button>
      </nav>
      <MoreSheet role={role} current={current} open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
