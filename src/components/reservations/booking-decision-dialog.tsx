"use client";

import { useState } from "react";
import { InfoIcon, ProhibitIcon, XCircleIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { ReservationOut } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";
import { minutesSince } from "@/lib/orders";
import { useFormat } from "@/lib/use-format";
import { useReservationStatus } from "@/lib/use-reservation-actions";
import { useWaitText } from "@/components/orders/order-bits";

export type Decision = "declined" | "cancelled" | "no_show";

const QUICK_REASONS = {
  declined: ["fullyBooked", "closed", "tooLarge", "noAnswer"],
  cancelled: ["guestCalled", "plansChanged", "duplicate", "closed"],
} as const;

type BookingDecisionDialogProps = {
  booking: ReservationOut | null;
  decision: Decision;
  now: number;
  onOpenChange: (open: boolean) => void;
};

/**
 * Turning a request down or cancelling asks why: the API shows the reason to the guest. A
 * no-show asks nothing but says what happens to the table, since it can't be undone.
 */
export function BookingDecisionDialog({
  booking,
  decision,
  now,
  onOpenChange,
}: BookingDecisionDialogProps) {
  const t = useTranslations("reservations.decide");
  const format = useFormat();
  const wait = useWaitText();
  const errorText = useErrorText();
  const move = useReservationStatus({ toastErrors: false });
  const [reason, setReason] = useState("");
  const needsReason = decision !== "no_show";
  const ready = !needsReason || reason.trim().length >= 3;

  const close = (next: boolean) => {
    if (move.isPending) return;
    if (!next) {
      setReason("");
      move.reset();
    }
    onOpenChange(next);
  };

  if (!booking) return null;
  const name = booking.customerName;
  const facts = [
    booking.table?.number,
    format.dateTime(booking.startsAt),
    t("guests", { n: booking.partySize }),
    decision === "no_show"
      ? t("lateBy", { time: wait(minutesSince(booking.startsAt, now)) })
      : booking.source === "online"
        ? t("online")
        : null,
  ].filter(Boolean);

  const confirm = () =>
    move.mutate(
      { booking, status: decision, note: needsReason ? reason : undefined },
      { onSuccess: () => close(false) },
    );

  return (
    <Dialog open onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-tone-red-subtle text-tone-red-text">
            {decision === "no_show" ? (
              <ProhibitIcon weight="duotone" className="size-5" />
            ) : (
              <XCircleIcon weight="duotone" className="size-5" />
            )}
          </span>
          <div className="min-w-0 pt-1.5 pr-8">
            <DialogTitle>{t(`${decision}.title`, { name })}</DialogTitle>
            <DialogDescription className="mt-1 tabular-nums">{facts.join(" · ")}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody>
          {needsReason ? (
            <>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t("quickLabel")}>
                {QUICK_REASONS[decision].map((key) => {
                  const text = t(`reasons.${key}`);
                  const picked = reason === text;
                  return (
                    <Chip key={key} pressed={picked} onClick={() => setReason(picked ? "" : text)}>
                      {text}
                    </Chip>
                  );
                })}
              </div>
              <Field>
                <FieldLabel htmlFor="booking-reason">{t("reasonLabel")}</FieldLabel>
                <Textarea
                  id="booking-reason"
                  value={reason}
                  maxLength={255}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={t("reasonPlaceholder")}
                  className="min-h-20"
                />
                <FieldDescription>{t("guestSees")}</FieldDescription>
              </Field>
            </>
          ) : (
            <p className="flex gap-2.5 rounded-lg bg-muted px-3.5 py-3 text-sm text-muted-foreground">
              <InfoIcon weight="duotone" className="mt-0.5 size-4 shrink-0" />
              {t("no_show.body", { table: booking.table?.number ?? "" })}
            </p>
          )}
          {move.isError && (
            <p role="alert" className="text-sm font-medium text-tone-red-text">
              {errorText.message(move.error)}
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={move.isPending} />}>
            {t(`${decision}.keep`)}
          </DialogClose>
          <Button variant="destructive" onClick={confirm} disabled={!ready || move.isPending}>
            {move.isPending ? t("saving") : t(`${decision}.confirm`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
