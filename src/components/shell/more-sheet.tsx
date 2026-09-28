"use client";

import { CaretRightIcon, SignOutIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, initials } from "@/components/ui/avatar";
import { Count } from "@/components/ui/count";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import type { UserRole } from "@/lib/api/schema";
import { useLiveOrders } from "@/lib/live/store";
import { morePages, navCounts } from "@/lib/navigation";
import { PAGE_PATHS, type Page } from "@/lib/permissions";
import { useSession } from "@/lib/session/client";
import { cn } from "@/lib/utils";
import { PageTile } from "./page-icon";
import { useSignOut } from "./user-card";

type MoreSheetProps = {
  role: UserRole;
  current: Page | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const rowClass =
  "flex h-14 items-center gap-3 rounded-lg px-2 text-md font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/40 active:bg-muted";

/** Phone only: the pages that didn't fit in the tabs, and the account. */
export function MoreSheet({ role, current, open, onOpenChange }: MoreSheetProps) {
  const t = useTranslations("shell");
  const nav = useTranslations("nav");
  const roles = useTranslations("session.roles");
  const session = useSession();
  const counts = navCounts(useLiveOrders());
  const { leave, leaving } = useSignOut();
  const close = () => onOpenChange(false);
  const user = session.status === "authenticated" ? session.user : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showCloseButton={false}>
        <SheetTitle className="sr-only">{t("more")}</SheetTitle>
        <SheetDescription className="sr-only">{t("moreHint")}</SheetDescription>
        <div className="flex flex-col gap-1 overflow-y-auto px-4 pt-3 pb-4">
          {user && (
            <Link href={PAGE_PATHS.profile} onClick={close} className={cn(rowClass, "mb-2")}>
              <Avatar>
                <AvatarFallback>{initials(user.fullName)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold">{user.fullName}</span>
                <span className="block truncate text-sm font-normal text-muted-foreground">
                  {roles(user.role)} · {nav("profile")}
                </span>
              </span>
              <CaretRightIcon className="size-4 text-muted-foreground" />
            </Link>
          )}
          {morePages(role).map((page) => (
            <Link
              key={page}
              href={PAGE_PATHS[page]}
              onClick={close}
              aria-current={page === current ? "page" : undefined}
              className={rowClass}
            >
              <PageTile page={page} active={page === current} />
              <span className="flex-1">{nav(page)}</span>
              <Count value={counts[page] ?? 0} />
            </Link>
          ))}
          <span aria-hidden className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={leave}
            disabled={leaving}
            className={cn(rowClass, "text-left disabled:opacity-60")}
          >
            <span className="grid size-8 place-items-center text-muted-foreground">
              <SignOutIcon weight="duotone" className="size-5" />
            </span>
            {leaving ? t("user.signingOut") : t("user.signOut")}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
