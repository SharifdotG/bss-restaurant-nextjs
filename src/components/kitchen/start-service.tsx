"use client";

import { ArrowsOutIcon, ChefHatIcon, SpeakerHighIcon, SunIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const PERKS = [
  { key: "chime", icon: SpeakerHighIcon },
  { key: "awake", icon: SunIcon },
  { key: "fullscreen", icon: ArrowsOutIcon },
] as const;

type StartServiceProps = {
  open: boolean;
  /** `true` when started with a tap, `false` when waved off with Esc. */
  onDone: (tapped: boolean) => void;
};

/**
 * Browsers only play sound and go full screen after a tap, so the board asks for one at the
 * start of service. The tickets behind keep updating either way.
 */
export function StartService({ open, onDone }: StartServiceProps) {
  const t = useTranslations("kitchen.start");

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onDone(false)} disablePointerDismissal>
      <DialogContent showCloseButton={false} className="max-w-[440px] p-8">
        <span className="grid size-12 place-items-center rounded-lg bg-primary text-primary-foreground">
          <ChefHatIcon weight="duotone" className="size-6" />
        </span>
        <DialogTitle className="mt-5 text-2xl font-bold">{t("title")}</DialogTitle>
        <DialogDescription className="mt-2 text-pretty">{t("body")}</DialogDescription>

        <ul className="mt-6 flex flex-col gap-3.5">
          {PERKS.map(({ key, icon: Icon }) => (
            <li key={key} className="flex items-center gap-3 text-base">
              <Icon weight="duotone" className="size-5 shrink-0 text-muted-foreground" />
              {t(`perks.${key}`)}
            </li>
          ))}
        </ul>

        <Button
          autoFocus
          onClick={() => onDone(true)}
          className="mt-8 h-14 w-full text-lg font-bold"
        >
          {t("action")}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">{t("note")}</p>
      </DialogContent>
    </Dialog>
  );
}
