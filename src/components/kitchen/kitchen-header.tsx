"use client";

import {
  ArrowLeftIcon,
  ArrowsInIcon,
  ArrowsOutIcon,
  ChefHatIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { LiveChip } from "@/components/live-chip";
import { UserCard } from "@/components/shell/user-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "@/i18n/navigation";
import { restaurantQuery } from "@/lib/api/queries";
import type { UserRole } from "@/lib/api/schema";
import { landingPath } from "@/lib/permissions";
import { setMuted, useMuted } from "@/lib/sound";
import { useFormat } from "@/lib/use-format";
import { useNow } from "@/lib/use-now";
import { useFullscreen } from "@/lib/use-screen";
import { cn } from "@/lib/utils";

type KitchenHeaderProps = {
  role: UserRole;
  name: string;
  /** Sold-out chip and the dishes button. */
  children?: React.ReactNode;
};

/** The board's own top bar: who's on, whether it's live, the time, and the screen controls. */
export function KitchenHeader({ role, name, children }: KitchenHeaderProps) {
  const t = useTranslations("kitchen");
  const format = useFormat();
  const now = useNow(10_000);
  const restaurant = useQuery(restaurantQuery).data;
  const muted = useMuted();
  const screen = useFullscreen();

  return (
    <header className="flex h-[72px] shrink-0 items-center gap-3 border-b border-border px-4 md:px-6">
      {role !== "chef" && (
        <Link
          href={landingPath(role)}
          aria-label={t("back")}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "-ml-2")}
        >
          <ArrowLeftIcon />
        </Link>
      )}
      <span
        aria-hidden
        className="hidden size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground sm:grid"
      >
        <ChefHatIcon weight="duotone" className="size-[22px]" />
      </span>
      <div className="min-w-0">
        <h1 className="truncate text-xl leading-tight font-bold">{t("title")}</h1>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">
          {[restaurant?.name, name].filter(Boolean).join(" · ")}
        </p>
      </div>
      <LiveChip />

      <div className="flex-1" />
      {children}

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-pressed={!muted}
              aria-label={t(muted ? "soundOff" : "soundOn")}
              onClick={() => setMuted(!muted)}
            />
          }
        >
          {muted ? <SpeakerSlashIcon /> : <SpeakerHighIcon />}
        </TooltipTrigger>
        <TooltipContent>{t(muted ? "soundOff" : "soundOn")}</TooltipContent>
      </Tooltip>

      <time
        dateTime={new Date(now).toISOString()}
        className="hidden text-3xl font-bold whitespace-nowrap tabular-nums md:block"
      >
        {format.time(now)}
      </time>

      {screen.supported && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="hidden md:inline-flex"
                aria-label={t(screen.active ? "exitFullscreen" : "fullscreen")}
                onClick={screen.toggle}
              />
            }
          >
            {screen.active ? <ArrowsInIcon /> : <ArrowsOutIcon />}
          </TooltipTrigger>
          <TooltipContent>{t(screen.active ? "exitFullscreen" : "fullscreen")}</TooltipContent>
        </Tooltip>
      )}
      <UserCard compact side="bottom" />
    </header>
  );
}
