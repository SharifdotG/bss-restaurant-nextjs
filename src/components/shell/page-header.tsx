"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { IncomingButton } from "@/components/incoming/incoming-button";
import { LiveChip } from "@/components/live-chip";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { restaurantQuery } from "@/lib/api/queries";
import { useShellLayout } from "@/lib/use-shell-layout";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./notification-bell";

type PageHeaderProps = {
  title: string;
  /** For pages under another: the breadcrumb links back, and phones get a back arrow. */
  parent?: { label: string; href: string };
  /** The last breadcrumb, when it's shorter than the title ("22" for "Order 22"). */
  crumb?: string;
  meta?: React.ReactNode;
  /** Beside the title, e.g. a state pill. */
  badge?: React.ReactNode;
  /** Before the title block, e.g. a person's photo. */
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

/** Breadcrumb, title and the page's main actions, sitting on the ground above the cards. */
export function PageHeader({
  title,
  parent,
  crumb,
  meta,
  badge,
  leading,
  actions,
  className,
}: PageHeaderProps) {
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
      <div className="flex min-w-0 items-start gap-3 md:items-center md:gap-4">
        {parent && phone && (
          <Link
            href={parent.href}
            aria-label={t("backTo", { page: parent.label })}
            className={buttonVariants({ variant: "ghost", size: "icon", className: "-ml-2.5" })}
          >
            <ArrowLeftIcon className="size-5" />
          </Link>
        )}
        {leading}
        <div className="min-w-0 flex-1">
          <nav aria-label={t("breadcrumb")} className="mb-1.5 hidden md:block">
            <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <li className="truncate">
                {restaurant ? restaurant.name : <Skeleton className="h-3.5 w-24" />}
              </li>
              <li aria-hidden>/</li>
              {parent && (
                <>
                  <li className="truncate">
                    <Link href={parent.href} className="hover:text-foreground">
                      {parent.label}
                    </Link>
                  </li>
                  <li aria-hidden>/</li>
                </>
              )}
              <li aria-current="page" className="truncate font-medium text-foreground">
                {crumb ?? title}
              </li>
            </ol>
          </nav>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">{title}</h1>
            {badge}
          </div>
          {meta && <p className="mt-1 text-sm text-muted-foreground">{meta}</p>}
        </div>
        {/* Phones have no top bar, so the live state and the bell sit beside the title. */}
        {phone && (
          <div className="-mr-2 flex shrink-0 items-center gap-1 pt-1">
            <LiveChip />
            <IncomingButton compact />
            <NotificationBell />
          </div>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  );
}
