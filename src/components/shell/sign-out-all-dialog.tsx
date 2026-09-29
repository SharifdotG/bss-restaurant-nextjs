"use client";

import { useState } from "react";
import { DevicesIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";
import { api, unwrap } from "@/lib/api/client";
import { useErrorText } from "@/lib/api/use-error-text";
import { stopLive } from "@/lib/live/socket";
import { useOverlay } from "@/lib/overlays";
import { signOut } from "@/lib/session/client";

/** For a lost phone: ends every session this account has, this one included. */
export function SignOutAllDialog() {
  const t = useTranslations("shell.signOutAll");
  const errorText = useErrorText();
  const router = useRouter();
  const { open, onOpenChange } = useOverlay("signOutAll");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      await unwrap(api.POST("/api/v1/auth/logout-all"));
    } catch (caught) {
      setPending(false);
      return setError(caught);
    }
    stopLive();
    await signOut();
    router.replace("/login");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-tone-red-subtle text-tone-red-text">
            <DevicesIcon weight="duotone" className="size-5" />
          </span>
          <div className="min-w-0 pt-1.5 pr-8">
            <DialogTitle>{t("title")}</DialogTitle>
          </div>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>{t("body")}</DialogDescription>
          {error !== null && (
            <p role="alert" className="text-sm font-medium text-tone-red-text">
              {errorText.message(error)}
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={pending} />}>
            {t("cancel")}
          </DialogClose>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            {pending ? t("pending") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
