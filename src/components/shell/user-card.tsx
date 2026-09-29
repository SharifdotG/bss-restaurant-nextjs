"use client";

import { useState } from "react";
import {
  CaretUpDownIcon,
  DevicesIcon,
  KeyboardIcon,
  SignOutIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useChangeLocale, useMounted } from "@/components/preferences";
import { Avatar, AvatarFallback, initials } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { stopLive } from "@/lib/live/socket";
import { openOverlay } from "@/lib/overlays";
import { PAGE_PATHS } from "@/lib/permissions";
import { signOut, useSession } from "@/lib/session/client";
import { cn } from "@/lib/utils";

export function useSignOut() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function leave() {
    setLeaving(true);
    stopLive();
    await signOut();
    router.replace("/login");
  }

  return { leave, leaving };
}

const THEMES = ["light", "dark", "system"] as const;

/** The signed-in person at the foot of the sidebar, opening their menu. */
export function UserCard({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("shell.user");
  const common = useTranslations("common");
  const roles = useTranslations("session.roles");
  const session = useSession();
  const router = useRouter();
  const locale = useLocale();
  const changeLocale = useChangeLocale();
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const { leave, leaving } = useSignOut();
  if (session.status !== "authenticated") return null;
  const { user } = session;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("menu")}
        className={cn(
          "flex shrink-0 items-center text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
          compact
            ? "rounded-full"
            : "w-full gap-2.5 rounded-lg bg-card p-2.5 shadow-sm transition-shadow duration-(--duration-fast) hover:shadow-md data-popup-open:shadow-md",
        )}
      >
        <Avatar>
          <AvatarFallback>{initials(user.fullName)}</AvatarFallback>
        </Avatar>
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">{user.fullName}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {roles(user.role)}
              </span>
            </span>
            <CaretUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent side={compact ? "right" : "top"} align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => router.push(PAGE_PATHS.profile)}>
            <UserCircleIcon weight="duotone" />
            {t("profile")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openOverlay("shortcuts")}>
            <KeyboardIcon weight="duotone" />
            {t("shortcuts")}
            <DropdownMenuShortcut>?</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{common("theme")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={mounted ? (theme ?? "system") : "system"}
            onValueChange={(value) => setTheme(value as string)}
          >
            {THEMES.map((value) => (
              <DropdownMenuRadioItem key={value} value={value} closeOnClick={false}>
                {common(`themes.${value}`)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{common("language")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={locale}
            onValueChange={(value) => changeLocale(value as Locale)}
          >
            {routing.locales.map((value) => (
              <DropdownMenuRadioItem key={value} value={value}>
                {common(`locales.${value}`)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={leaving} onClick={leave}>
          <SignOutIcon weight="duotone" />
          {leaving ? t("signingOut") : t("signOut")}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => openOverlay("signOutAll")}>
          <DevicesIcon weight="duotone" />
          {t("signOutAll")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
