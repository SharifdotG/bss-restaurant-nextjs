"use client";

import { ArrowRightIcon, CheckCircleIcon, ShoppingBagIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { OrderTotals } from "@/components/orders/detail/order-items";
import { PaymentList } from "@/components/orders/detail/order-payments";
import { PrintReceiptButton } from "@/components/orders/receipt-dialog";
import { useOrderWhere } from "@/components/orders/order-bits";
import { OrderStatusPill } from "@/components/orders/order-status";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import type { OrderDetailOut } from "@/lib/api/schema";
import { PAGE_PATHS } from "@/lib/permissions";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

type BillPanelProps = {
  order: OrderDetailOut;
  /** Print, refund and the like, at the foot of the bill. */
  actions?: React.ReactNode;
  className?: string;
};

/** The bill as the guest would read it, plus what's been paid and what's left. */
export function BillPanel({ order, actions, className }: BillPanelProps) {
  const t = useTranslations("billing.bill");
  const tBilling = useTranslations("billing");
  const tOrders = useTranslations("orders");
  const format = useFormat();
  const where = useOrderWhere()(order);
  const paid = order.status === "paid";
  const prepaid = !paid && order.status !== "cancelled" && order.balanceDue <= 0;

  return (
    <article className={cn("rounded-xl bg-card shadow-md", className)}>
      <header className="flex items-start gap-3.5 border-b border-border p-5 xl:p-6">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary-soft text-base font-bold text-primary-soft-foreground">
          {order.table ? (
            order.table.number
          ) : (
            <ShoppingBagIcon weight="duotone" className="size-6" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl leading-tight font-bold">
            {tOrders("orderN", { n: format.orderNo(order.orderNumber) })}
          </h2>
          <p className="truncate text-sm text-muted-foreground">
            {[where.title, where.detail, order.waiter?.fullName].filter(Boolean).join(" · ")}
          </p>
        </div>
        <OrderStatusPill status={order.status} />
      </header>

      <div className="p-5 xl:p-6">
        <p className="mb-1 text-sm font-bold text-muted-foreground">
          {t("items", { n: order.itemCount })}
        </p>
        <ul className="divide-y divide-border">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 py-2.5">
              <span className="w-6 shrink-0 font-bold tabular-nums">
                {format.number(item.quantity)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block">{item.foodName}</span>
                {item.notes && (
                  <span className="block text-sm text-tone-orange-text">{item.notes}</span>
                )}
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {format.money(item.finalUnitPrice * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <OrderTotals order={order} />

        {order.payments.length > 0 && (
          <PaymentList payments={order.payments} className="mt-4 border-t border-border" />
        )}

        <dl className="mt-4 grid gap-1 rounded-lg bg-muted px-4 py-3">
          <div className="flex justify-between gap-4 text-sm text-muted-foreground">
            <dt>{t("paidSoFar")}</dt>
            <dd className="tabular-nums">{format.money(order.amountPaid)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="font-bold">{t("leftToPay")}</dt>
            <dd className="text-xl font-bold tabular-nums">
              {order.balanceDue > 0 ? (
                format.money(order.balanceDue)
              ) : (
                <span className="inline-flex items-center gap-1.5 text-tone-green-text">
                  <CheckCircleIcon weight="duotone" className="size-5" />
                  {t("settled")}
                </span>
              )}
            </dd>
          </div>
        </dl>

        {prepaid && (
          <Alert tone="green" icon={CheckCircleIcon} title={tBilling("notServed")} className="mt-4">
            {t("prepaid")}
          </Alert>
        )}
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-4 xl:px-6">
        <PrintReceiptButton order={order} />
        {actions}
        <Link
          href={`${PAGE_PATHS.orders}/${order.id}`}
          className={buttonVariants({ variant: "ghost", className: "ml-auto" })}
        >
          {t("openOrder")}
          <ArrowRightIcon />
        </Link>
      </footer>
    </article>
  );
}

export function BillSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl bg-card p-6 shadow-md", className)}>
      <div className="flex items-center gap-3.5">
        <Skeleton className="size-12 rounded-lg" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="mt-6 grid gap-4">
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-5" />
        ))}
      </div>
    </div>
  );
}
