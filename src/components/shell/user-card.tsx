"use client";

import { useState } from "react";
import { CaretUpDownIcon, SignOutIcon, UserCircleIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, initials } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "@/i18n/navigation";
import { stopLive } from "@/lib/live/socket";
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

/** The signed-in person at the foot of the sidebar, opening their menu. */
export function UserCard({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("shell.user");
  const roles = useTranslations("session.roles");
  const session = useSession();
  const router = useRouter();
  const { leave, leaving } = useSignOut();
  if (session.status !== "authenticated") return null;
  const { user } = session;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("menu")}
        className={cn(
          "flex shrink-0 items-center rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
          compact
            ? "rounded-full"
            : "w-full gap-2.5 bg-card p-2.5 shadow-sm transition-shadow duration-(--duration-fast) hover:shadow-md data-popup-open:shadow-md",
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
      <DropdownMenuContent side="top" align="start" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => router.push("/profile")}>
            <UserCircleIcon weight="duotone" />
            {t("profile")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={leaving} onClick={leave}>
          <SignOutIcon weight="duotone" />
          {leaving ? t("signingOut") : t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
