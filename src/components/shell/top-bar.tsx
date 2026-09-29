"use client";

import { ListIcon, MagnifyingGlassIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { LiveChip } from "@/components/live-chip";
import { LanguageSwitch, useMounted } from "@/components/preferences";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { restaurantQuery } from "@/lib/api/queries";
import { openingState } from "@/lib/hours";
import { openOverlay, useModKey, withMod } from "@/lib/overlays";
import { useFormat } from "@/lib/use-format";
import { useNow } from "@/lib/use-now";
import { NotificationBell } from "./notification-bell";

/** Day, live state and tools across the top of tablet and desktop screens. */
export function TopBar({ onOpenMenu }: { onOpenMenu?: () => void }) {
  const t = useTranslations("shell");

  return (
    <header className="flex h-[72px] shrink-0 items-center gap-3 px-4 md:px-6 xl:px-8">
      {onOpenMenu && (
        <Button
          variant="outline"
          size="icon"
          className="-ml-1 shrink-0"
          aria-label={t("openMenu")}
          onClick={onOpenMenu}
        >
          <ListIcon />
        </Button>
      )}
      <DayInfo />
      <LiveChip />
      <div className="flex-1" />
      <SearchButton />
      <LanguageSwitch short />
      <ThemeToggle />
      <NotificationBell />
    </header>
  );
}

function DayInfo() {
  const t = useTranslations("shell.day");
  const format = useFormat();
  const now = useNow(30_000);
  const restaurant = useQuery(restaurantQuery).data;
  const hours = restaurant && openingState(now, restaurant.opensAt, restaurant.closesAt);

  return (
    <div className="min-w-0">
      <p className="truncate text-base font-bold">{format.weekday(now)}</p>
      {hours ? (
        <p className="truncate text-xs text-muted-foreground">
          {t(hours.open ? "openUntil" : "closedUntil", { time: format.clock(hours.until) })}
          {" · "}
          {format.time(now)}
        </p>
      ) : (
        <Skeleton className="mt-1 h-3 w-36" />
      )}
    </div>
  );
}

function SearchButton() {
  const t = useTranslations("shell");
  const mod = useModKey();

  return (
    <>
      <button
        type="button"
        onClick={() => openOverlay("command")}
        className="hidden h-11 w-[320px] shrink items-center gap-2.5 rounded-full bg-card pr-1.5 pl-4 text-base text-muted-foreground shadow-sm transition-shadow duration-(--duration-fast) outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/40 lg:flex"
      >
        <MagnifyingGlassIcon className="size-[18px] shrink-0" />
        <span className="flex-1 truncate text-left">{t("searchPlaceholder")}</span>
        <Kbd>{withMod(mod, "K")}</Kbd>
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 lg:hidden"
        aria-label={t("search")}
        onClick={() => openOverlay("command")}
      >
        <MagnifyingGlassIcon />
      </Button>
    </>
  );
}

function ThemeToggle() {
  const t = useTranslations("common.themes");
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const dark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="shrink-0"
      aria-label={dark ? t("light") : t("dark")}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <SunIcon weight="duotone" /> : <MoonIcon weight="duotone" />}
    </Button>
  );
}
