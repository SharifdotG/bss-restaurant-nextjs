"use client";

import { useState } from "react";
import {
  ArrowUUpLeftIcon,
  CreditCardIcon,
  DeviceMobileIcon,
  MoneyIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ChoiceTiles } from "@/components/ui/choice-tiles";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { OrderDetailOut, PaymentMethod } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";
import { amountText, refundProblem } from "@/lib/billing";
import { parseMoney, toPaisa, toTaka } from "@/lib/money";
import { useRefund } from "@/lib/use-billing-actions";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

const REASONS = ["wrongItem", "complaint", "overcharged", "cancelling"] as const;

type RefundFormProps = {
  order: OrderDetailOut;
  onDone: () => void;
  /** Where the form sits: down the till, or inside a dialog on the order page. */
  layout?: "till" | "dialog";
  className?: string;
};

/**
 * Money back to the guest, managers only. It always asks once more before sending, because
 * a refund can't be taken back.
 */
export function RefundForm({ order, onDone, layout = "till", className }: RefundFormProps) {
  const t = useTranslations("billing.refund");
  const tMethods = useTranslations("billing.till.methods");
  const format = useFormat();
  const errorText = useErrorText();
  const refund = useRefund();
  const refundable = toPaisa(order.amountPaid);
  // Money usually goes back the way it came in.
  const lastMethod = order.payments.findLast((payment) => payment.kind === "payment")?.method;

  const [amount, setAmount] = useState(() => amountText(refundable));
  const [method, setMethod] = useState<PaymentMethod>(lastMethod ?? "cash");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);

  const paisa = parseMoney(amount);
  const problem = refundProblem(paisa, refundable, reason);
  const money = format.money(toTaka(paisa ?? 0));
  const n = format.orderNo(order.orderNumber);
  const picks = order.payments.filter(
    (payment) => payment.kind === "payment" && toPaisa(payment.amount) < refundable,
  );

  const send = () =>
    refund.mutate(
      { order, method, amount: paisa ?? 0, reason, reference },
      {
        onSuccess: () => {
          setConfirming(false);
          toast.success(t("done", { amount: money, n }));
          onDone();
        },
      },
    );

  return (
    <form
      className={cn("flex min-h-0 flex-1 flex-col", className)}
      onSubmit={(event) => {
        event.preventDefault();
        if (!problem) setConfirming(true);
      }}
    >
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto",
          layout === "till" ? "p-5 xl:p-6" : "px-6 pt-2 pb-4",
        )}
      >
        <Field>
          <FieldLabel htmlFor="refund-amount">{t("amount")}</FieldLabel>
          <Input
            id="refund-amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            autoComplete="off"
            aria-invalid={problem === "tooMuch" || undefined}
            className="h-14 text-right text-2xl font-bold tabular-nums"
          />
          <div className="flex flex-wrap gap-2">
            <Chip
              pressed={paisa === refundable}
              onClick={() => setAmount(amountText(refundable))}
              className="tabular-nums"
            >
              {t("all", { amount: format.money(order.amountPaid) })}
            </Chip>
            {picks.map((payment) => (
              <Chip
                key={payment.id}
                pressed={paisa === toPaisa(payment.amount) && method === payment.method}
                onClick={() => {
                  setAmount(amountText(toPaisa(payment.amount)));
                  setMethod(payment.method);
                }}
                className="tabular-nums"
              >
                {t("paidBy", {
                  method: tMethods(payment.method),
                  amount: format.money(payment.amount),
                })}
              </Chip>
            ))}
          </div>
        </Field>

        <Field>
          <FieldLabel>{t("method")}</FieldLabel>
          <ChoiceTiles<PaymentMethod>
            aria-label={t("method")}
            value={method}
            onValueChange={setMethod}
            options={[
              { value: "cash", label: tMethods("cash"), icon: MoneyIcon },
              { value: "card", label: tMethods("card"), icon: CreditCardIcon },
              { value: "mobile", label: tMethods("mobile"), icon: DeviceMobileIcon },
            ]}
          />
        </Field>

        {method !== "cash" && (
          <Field>
            <FieldLabel htmlFor="refund-reference">
              {t("reference")}
              <span className="font-normal text-muted-foreground">· {t("optional")}</span>
            </FieldLabel>
            <Input
              id="refund-reference"
              value={reference}
              maxLength={100}
              autoComplete="off"
              onChange={(event) => setReference(event.target.value)}
            />
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="refund-reason">{t("reason")}</FieldLabel>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("quickLabel")}>
            {REASONS.map((key) => {
              const text = t(`reasons.${key}`);
              const picked = reason === text;
              return (
                <Chip key={key} pressed={picked} onClick={() => setReason(picked ? "" : text)}>
                  {text}
                </Chip>
              );
            })}
          </div>
          <Textarea
            id="refund-reason"
            value={reason}
            maxLength={255}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t("reasonPlaceholder")}
            className="min-h-20"
          />
        </Field>
      </div>

      <div
        className={cn(
          "grid gap-3 border-t border-border",
          layout === "till" ? "bg-muted/60 p-5 xl:p-6" : "px-6 py-4",
        )}
      >
        <Button type="submit" size="lg" variant="destructive" disabled={!!problem}>
          <ArrowUUpLeftIcon weight="bold" />
          {t("submit", { amount: money })}
        </Button>
        {problem && problem !== "noAmount" && (
          <p role="status" className="-mt-1 text-center text-sm font-medium text-tone-amber-text">
            {t(`problems.${problem}`, { amount: format.money(order.amountPaid) })}
          </p>
        )}
      </div>

      <Dialog open={confirming} onOpenChange={(open) => !refund.isPending && setConfirming(open)}>
        <DialogContent>
          <DialogHeader>
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-tone-red-subtle text-tone-red-text">
              <ArrowUUpLeftIcon weight="duotone" className="size-5" />
            </span>
            <div className="min-w-0 pt-1.5 pr-8">
              <DialogTitle>
                {t("confirmTitle", { amount: money, method: tMethods(method).toLowerCase() })}
              </DialogTitle>
            </div>
          </DialogHeader>
          <DialogBody>
            <DialogDescription>{t("confirmBody", { n })}</DialogDescription>
            <p className="rounded-lg bg-muted px-3 py-2 text-sm">{reason.trim()}</p>
            {refund.isError && (
              <Alert tone="red" icon={WarningCircleIcon} title={t("failed")}>
                {errorText.message(refund.error)}
              </Alert>
            )}
          </DialogBody>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />} disabled={refund.isPending}>
              {t("back")}
            </DialogClose>
            <Button variant="destructive" onClick={send} disabled={refund.isPending}>
              {refund.isPending ? t("refunding") : t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

type RefundDialogProps = {
  order: OrderDetailOut;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** The same refund form, for the order page. */
export function RefundDialog({ order, open, onOpenChange }: RefundDialogProps) {
  const t = useTranslations("billing.refund");
  const format = useFormat();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-tone-red-subtle text-tone-red-text">
            <ArrowUUpLeftIcon weight="duotone" className="size-5" />
          </span>
          <div className="min-w-0 pr-8">
            <DialogTitle>{t("dialogTitle", { n: format.orderNo(order.orderNumber) })}</DialogTitle>
            <DialogDescription className="text-sm">
              {t("sub", { amount: format.money(order.amountPaid) })}
            </DialogDescription>
          </div>
        </DialogHeader>
        {open && <RefundForm order={order} layout="dialog" onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
