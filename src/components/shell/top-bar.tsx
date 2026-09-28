"use client";

import { ListIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/** Day, live state and tools across the top of tablet and desktop screens. */
export function TopBar({ onOpenMenu }: { onOpenMenu?: () => void }) {
  const t = useTranslations("shell");

  return (
    <header className="flex h-[72px] shrink-0 items-center gap-3 px-4 md:px-6 xl:px-8">
      {onOpenMenu && (
        <Button
          variant="outline"
          size="icon"
          className="-ml-1"
          aria-label={t("openMenu")}
          onClick={onOpenMenu}
        >
          <ListIcon />
        </Button>
      )}
    </header>
  );
}
