"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { LiveChip } from "@/components/live-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { restaurantQuery } from "@/lib/api/queries";
import { useShellLayout } from "@/lib/use-shell-layout";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./notification-bell";

type PageHeaderProps = {
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

/** Breadcrumb, title and the page's main actions, sitting on the ground above the cards. */
export function PageHeader({ title, meta, actions, className }: PageHeaderProps) {
  const t = useTranslations("shell");
  const restaurant = useQuery(restaurantQuery).data;
  const phone = useShellLayout() === "phone";

  return (
    <header
      className={cn(
        "flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1">
          <nav aria-label={t("breadcrumb")} className="mb-1.5 hidden md:block">
            <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <li className="truncate">
                {restaurant ? restaurant.name : <Skeleton className="h-3.5 w-24" />}
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="truncate font-medium text-foreground">
                {title}
              </li>
            </ol>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">{title}</h1>
          {meta && <p className="mt-1 text-sm text-muted-foreground">{meta}</p>}
        </div>
        {/* Phones have no top bar, so the live state and the bell sit beside the title. */}
        {phone && (
          <div className="-mr-2 flex shrink-0 items-center gap-1 pt-1">
            <LiveChip />
            <NotificationBell />
          </div>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  );
}
