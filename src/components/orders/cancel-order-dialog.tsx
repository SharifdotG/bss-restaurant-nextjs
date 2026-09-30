"use client";

import { useState } from "react";
import { ArrowUUpLeftIcon, ProhibitIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import type { OrderOut, UserRole } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";
import { shortOrderNumber } from "@/lib/format";
import { can, cancelNeedsRefund, PAGE_PATHS, paidSoFar } from "@/lib/permissions";
import { useFormat } from "@/lib/use-format";
import { useOrderStatus } from "@/lib/use-order-actions";
import { cn } from "@/lib/utils";

const QUICK_REASONS = ["guestLeft", "mistake", "outOfStock", "duplicate"] as const;

type CancelOrderDialogProps = {
  order: OrderOut;
  role: UserRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Cancelling asks why, since the API keeps the reason. Money already taken has to go back
 * first, so then the dialog explains that and points to the refund instead.
 */
export function CancelOrderDialog({ order, role, open, onOpenChange }: CancelOrderDialogProps) {
  const t = useTranslations("orders.cancel");
  const format = useFormat();
  const errorText = useErrorText();
  const move = useOrderStatus({ toastErrors: false });
  const [reason, setReason] = useState("");
  const n = shortOrderNumber(order.orderNumber);
  const blocked = cancelNeedsRefund(order);
  const ready = reason.trim().length >= 3;

  const close = (next: boolean) => {
    if (move.isPending) return;
    if (!next) {
      setReason("");
      move.reset();
    }
    onOpenChange(next);
  };

  const confirm = () =>
    move.mutate({ order, status: "cancelled", note: reason }, { onSuccess: () => close(false) });

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-lg",
              blocked
                ? "bg-tone-amber-subtle text-tone-amber-text"
                : "bg-tone-red-subtle text-tone-red-text",
            )}
          >
            {blocked ? (
              <ArrowUUpLeftIcon weight="duotone" className="size-5" />
            ) : (
              <ProhibitIcon weight="duotone" className="size-5" />
            )}
          </span>
          <div className="min-w-0 pt-1.5 pr-8">
            <DialogTitle>{blocked ? t("refundFirstTitle") : t("title", { n })}</DialogTitle>
          </div>
        </DialogHeader>

        {blocked ? (
          <>
            <DialogBody>
              <DialogDescription>
                {t("refundFirstBody", { n, amount: format.money(paidSoFar(order)) })}
              </DialogDescription>
            </DialogBody>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>{t("close")}</DialogClose>
              {can(role, "order.refund") && (
                <Link
                  href={{ pathname: PAGE_PATHS.billing, query: { order: order.id } }}
                  className={buttonVariants()}
                >
                  <ArrowUUpLeftIcon />
                  {t("refund", { amount: format.money(paidSoFar(order)) })}
                </Link>
              )}
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogBody>
              <DialogDescription>
                {t("body", { total: format.money(order.total) })}
              </DialogDescription>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t("quickLabel")}>
                {QUICK_REASONS.map((key) => {
                  const text = t(`reasons.${key}`);
                  const picked = reason === text;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={picked}
                      onClick={() => setReason(picked ? "" : text)}
                      className={cn(
                        "h-8 rounded-full border px-3 text-sm font-medium transition-colors duration-(--duration-fast) outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                        picked
                          ? "border-primary/30 bg-primary-soft text-primary-soft-foreground"
                          : "border-border bg-card hover:bg-muted",
                      )}
                    >
                      {text}
                    </button>
                  );
                })}
              </div>
              <Field>
                <FieldLabel htmlFor="cancel-reason">{t("reasonLabel")}</FieldLabel>
                <Textarea
                  id="cancel-reason"
                  value={reason}
                  maxLength={255}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={t("reasonPlaceholder")}
                  className="min-h-20"
                />
              </Field>
              {move.isError && (
                <p role="alert" className="text-sm font-medium text-tone-red-text">
                  {errorText.message(move.error)}
                </p>
              )}
            </DialogBody>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" disabled={move.isPending} />}>
                {t("keep")}
              </DialogClose>
              <Button variant="destructive" onClick={confirm} disabled={!ready || move.isPending}>
                {move.isPending ? t("cancelling") : t("confirm")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
