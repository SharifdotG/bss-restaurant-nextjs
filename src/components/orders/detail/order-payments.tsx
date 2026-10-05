"use client";

import { useState } from "react";
import {
  ArrowUUpLeftIcon,
  CashRegisterIcon,
  CreditCardIcon,
  DeviceMobileIcon,
  MoneyIcon,
  WalletIcon,
  type Icon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { RefundDialog } from "@/components/billing/refund-form";
import { PrintReceiptButton } from "@/components/orders/receipt-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { OrderDetailOut, PaymentMethod, PaymentOut } from "@/lib/api/schema";
import { PAGE_PATHS } from "@/lib/permissions";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

const METHOD_ICONS: Record<PaymentMethod, Icon> = {
  cash: MoneyIcon,
  card: CreditCardIcon,
  mobile: DeviceMobileIcon,
};

type OrderPaymentsProps = {
  order: OrderDetailOut;
  canTakePayment: boolean;
  canRefund: boolean;
};

/** Money in and out so far. Taking payment itself happens at the till. */
export function OrderPayments({ order, canTakePayment, canRefund }: OrderPaymentsProps) {
  const t = useTranslations("orders.detail");
  const tBill = useTranslations("billing.bill");
  const [refunding, setRefunding] = useState(false);
  const tillLink = canTakePayment && (
    <Link
      href={{ pathname: PAGE_PATHS.billing, query: { order: order.id } }}
      className={buttonVariants({ variant: "outline" })}
    >
      <CashRegisterIcon />
      {t("openTill")}
    </Link>
  );

  return (
    <section className="rounded-xl bg-card p-5 shadow-md sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{t("payments")}</h2>
        <PrintReceiptButton order={order} variant="ghost" size="sm" className="-mr-2" />
      </header>
      {order.payments.length === 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-3.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <WalletIcon weight="duotone" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">{t("nothingPaid")}</p>
            <p className="text-sm text-pretty text-muted-foreground">
              {order.status === "cancelled" ? t("nothingPaidCancelled") : t("nothingPaidHint")}
            </p>
          </div>
          {tillLink}
        </div>
      ) : (
        <>
          <PaymentList payments={order.payments} className="mt-2" />
          {(tillLink || canRefund) && (
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              {canRefund && (
                <Button
                  variant="ghost"
                  className="text-tone-red-text hover:bg-tone-red-subtle"
                  onClick={() => setRefunding(true)}
                >
                  <ArrowUUpLeftIcon />
                  {tBill("refund")}
                </Button>
              )}
              {tillLink}
            </div>
          )}
          {canRefund && <RefundDialog order={order} open={refunding} onOpenChange={setRefunding} />}
        </>
      )}
    </section>
  );
}

/** Payments and refunds on an order, newest last, as the API lists them. */
export function PaymentList({
  payments,
  className,
}: {
  payments: PaymentOut[];
  className?: string;
}) {
  const t = useTranslations("orders.detail");
  const format = useFormat();
  return (
    <ul className={cn("divide-y divide-border", className)}>
      {payments.map((payment) => {
        const refund = payment.kind === "refund";
        const MethodIcon = refund ? ArrowUUpLeftIcon : METHOD_ICONS[payment.method];
        return (
          <li key={payment.id} className="flex items-center gap-3.5 py-3">
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-lg",
                refund
                  ? "bg-tone-red-subtle text-tone-red-text"
                  : "bg-tone-green-subtle text-tone-green-text",
              )}
            >
              <MethodIcon weight="duotone" className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">
                {t(refund ? "refundBy" : "paidBy", {
                  method: t(`methods.${payment.method}`),
                })}
                {payment.reference && (
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    · {payment.reference}
                  </span>
                )}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {[payment.receivedBy?.fullName, format.time(payment.createdAt), payment.note]
                  .filter(Boolean)
                  .join(" · ")}
                {payment.change > 0 &&
                  ` · ${t("change", { amount: format.money(payment.change) })}`}
              </p>
            </div>
            <span className={cn("font-bold tabular-nums", refund && "text-tone-red-text")}>
              {refund ? "−" : ""}
              {format.money(payment.amount)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
