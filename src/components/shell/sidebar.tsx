"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import * as m from "motion/react-m";
import { useTranslations } from "next-intl";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Count } from "@/components/ui/count";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "@/i18n/navigation";
import { restaurantQuery } from "@/lib/api/queries";
import type { UserRole } from "@/lib/api/schema";
import { useLiveOrders } from "@/lib/live/store";
import { navCounts, navGroups } from "@/lib/navigation";
import { PAGE_PATHS, type Page } from "@/lib/permissions";
import { setSidebarCollapsed, useCollapsedByChoice } from "@/lib/use-shell-layout";
import { cn } from "@/lib/utils";
import { PageTile } from "./page-icon";
import { UserCard } from "./user-card";

type Variant = "full" | "rail" | "drawer";

type SidebarProps = {
  variant: Variant;
  role: UserRole;
  current: Page | null;
  onNavigate?: () => void;
  /** The page asked for the rail, so there's nothing to expand. */
  pinned?: boolean;
};

/** The sidebar's contents: the drawer reuses them, so it holds no layout of its own. */
export function SidebarContent({ variant, role, current, onNavigate, pinned }: SidebarProps) {
  const t = useTranslations("shell");
  const nav = useTranslations("nav");
  const counts = navCounts(useLiveOrders());
  const restaurant = useQuery(restaurantQuery).data;
  const collapsedByChoice = useCollapsedByChoice();
  const rail = variant === "rail";
  // New order lives under Orders in the sidebar.
  const active = current === "newOrder" ? "orders" : current;

  return (
    <div
      className={cn(
        "flex h-full flex-col",
        rail ? "items-center gap-5 px-3 py-5" : "gap-6 px-4 py-6",
      )}
    >
      <div className={cn("flex items-center", rail ? "flex-col gap-3" : "gap-2.5")}>
        <BrandMark />
        {!rail && (
          <div className="min-w-0 flex-1">
            {restaurant ? (
              <p className="truncate text-md leading-tight font-bold">{restaurant.name}</p>
            ) : (
              <Skeleton className="my-0.5 h-4 w-28" />
            )}
            <p className="truncate text-xs text-muted-foreground">{t("staffArea")}</p>
          </div>
        )}
        {variant === "full" && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="-mr-1 size-7 text-muted-foreground"
            aria-label={t("collapse")}
            onClick={() => setSidebarCollapsed(true)}
          >
            <CaretLeftIcon />
          </Button>
        )}
        {rail && collapsedByChoice && !pinned && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label={t("expand")}
            onClick={() => setSidebarCollapsed(false)}
          >
            <CaretRightIcon />
          </Button>
        )}
      </div>

      <nav
        aria-label={t("mainNav")}
        className={cn(
          // Short screens scroll the list; the bar itself stays out of the way.
          "-mx-1 flex min-h-0 flex-1 [scrollbar-width:none] flex-col overflow-y-auto px-1",
          rail ? "gap-3" : "gap-6",
        )}
      >
        {navGroups(role).map((group, index) => (
          <div key={group.id} role="group" aria-labelledby={rail ? undefined : `nav-${group.id}`}>
            {rail ? (
              index > 0 && (
                <span aria-hidden className="mx-auto mb-3 block h-px w-8 bg-sidebar-border" />
              )
            ) : (
              <p
                id={`nav-${group.id}`}
                className="px-3 pb-1.5 text-2xs font-bold tracking-wide text-muted-foreground uppercase"
              >
                {t(`groups.${group.id}`)}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.pages.map((page) => (
                <li key={page}>
                  <NavLink
                    page={page}
                    label={nav(page)}
                    count={counts[page] ?? 0}
                    active={page === active}
                    rail={rail}
                    layoutId={`nav-active-${variant}`}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <UserCard compact={rail} />
    </div>
  );
}

type NavLinkProps = {
  page: Page;
  label: string;
  count: number;
  active: boolean;
  rail: boolean;
  layoutId: string;
  onNavigate?: () => void;
};

function NavLink({ page, label, count, active, rail, layoutId, onNavigate }: NavLinkProps) {
  const link = (
    <Link
      href={PAGE_PATHS[page]}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={rail ? label : undefined}
      className={cn(
        "group/nav relative flex h-12 items-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        rail ? "w-12 justify-center" : "gap-3 px-2",
      )}
    >
      {/* The white card slides from the old page to the new one. */}
      {active && (
        <m.span
          layoutId={layoutId}
          transition={{ type: "spring", duration: 0.35, bounce: 0.12 }}
          className="absolute inset-0 rounded-lg bg-sidebar-accent shadow-sm"
        />
      )}
      <PageTile page={page} active={active} className="relative" />
      {!rail && (
        <>
          <span
            className={cn(
              "relative min-w-0 flex-1 truncate text-base transition-colors duration-(--duration-fast)",
              active
                ? "font-bold text-sidebar-accent-foreground"
                : "font-semibold text-sidebar-foreground group-hover/nav:text-sidebar-accent-foreground",
            )}
          >
            {label}
          </span>
          <Count value={count} className="relative" />
        </>
      )}
    </Link>
  );

  if (!rail) return link;
  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

/** The fixed column on wide screens: 260 px in full, 84 px as a rail. */
export function Sidebar(props: SidebarProps & { variant: "full" | "rail" }) {
  return (
    <aside
      className={cn(
        "sticky top-0 h-dvh shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-(--duration-slow) ease-standard",
        props.variant === "full" ? "w-[260px]" : "w-[84px]",
      )}
    >
      <SidebarContent {...props} />
    </aside>
  );
}
