"use client";

import { useEffect } from "react";
import { ReceiptIcon, SealCheckIcon } from "@phosphor-icons/react";
import { animate, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/empty-state";
import { PrintReceiptButton } from "@/components/orders/receipt-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrderDetailOut, UserRole } from "@/lib/api/schema";
import { toTaka } from "@/lib/money";
import { EASE } from "@/lib/motion";
import { canTakePayment } from "@/lib/permissions";
import { useTakePayment } from "@/lib/use-billing-actions";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";
import { RefundForm } from "./refund-form";
import { Till, type Settled } from "./till";

type TillPanelProps = {
  order: OrderDetailOut | undefined;
  /** A bill is picked, even if it's still loading. */
  selected: boolean;
  role: UserRole;
  keypad: boolean;
  settled: Settled | null;
  onSettled: (settled: Settled) => void;
  /** Opens the next bill waiting, when there is one. */
  onNext?: () => void;
  onDone: () => void;
  /** A manager asked to give money back on this bill. */
  refunding?: boolean;
  onRefundDone?: () => void;
  /** Leaves out the panel's own heading when the page already has one (phones). */
  bare?: boolean;
  className?: string;
};

/** Whatever the till should show for the picked bill: the form, the paid moment, or why not. */
export function TillPanel(props: TillPanelProps) {
  const { order, selected, role, keypad, settled, onSettled, className } = props;
  const t = useTranslations("billing");
  const tOrders = useTranslations("orders");
  const format = useFormat();
  const pay = useTakePayment();

  if (!selected) {
    return (
      <div className={cn("grid flex-1 place-items-center", className)}>
        <EmptyState icon={ReceiptIcon} tone="slate" title={t("till.title")}>
          {t("pick")}
        </EmptyState>
      </div>
    );
  }
  if (!order) return <TillSkeleton />;
  // Checked before anything else: a full refund leaves nothing paid, and the form has to stay
  // up long enough to say it worked.
  if (props.refunding && props.onRefundDone) {
    return (
      <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
        <header
          className={cn(
            "flex items-start gap-3 border-b border-border px-5 py-4 xl:px-6",
            props.bare && "hidden",
          )}
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold">{t("refund.title")}</h2>
            <p className="text-sm text-muted-foreground">
              {tOrders("orderN", { n: format.orderNo(order.orderNumber) })} ·{" "}
              {t("refund.sub", { amount: format.money(order.amountPaid) })}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="-mr-2" onClick={props.onRefundDone}>
            {t("refund.back")}
          </Button>
        </header>
        <RefundForm key={order.id} order={order} onDone={props.onRefundDone} />
      </div>
    );
  }
  if (settled?.orderId === order.id)
    return <TillDone {...props} order={order} change={settled.change} />;
  if (!canTakePayment(role, order)) return <NothingToPay {...props} order={order} />;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <header className={cn("border-b border-border px-5 py-4 xl:px-6", props.bare && "hidden")}>
        <h2 className="text-lg font-bold">{t("till.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {tOrders("orderN", { n: format.orderNo(order.orderNumber) })} ·{" "}
          {t("left", { amount: format.money(order.balanceDue) })}
        </p>
      </header>
      <Till key={order.id} order={order} pay={pay} keypad={keypad} onSettled={onSettled} />
    </div>
  );
}

function TillDone({
  order,
  change,
  onNext,
  onDone,
}: TillPanelProps & { order: OrderDetailOut; change: number }) {
  const t = useTranslations("billing.done");
  const format = useFormat();

  return (
    <div className="flex flex-1 flex-col justify-center gap-6 p-6 text-center">
      <m.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 360, damping: 20 }}
        className="mx-auto grid size-16 place-items-center rounded-full bg-tone-green-subtle text-tone-green-text"
      >
        <svg viewBox="0 0 32 32" aria-hidden className="size-8">
          <m.path
            d="M8 16.5l5.5 5.5L24 10.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={3.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.15, duration: 0.35, ease: EASE.arrive }}
          />
        </svg>
      </m.span>
      <div className="animate-rise" style={{ animationDelay: "120ms" }}>
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground">
          {t("body", { n: format.orderNo(order.orderNumber) })}
        </p>
      </div>
      <div
        className="animate-rise rounded-xl bg-muted px-5 py-4"
        style={{ animationDelay: "180ms" }}
      >
        {change > 0 ? (
          <>
            <p className="text-sm font-bold text-muted-foreground">{t("giveBack")}</p>
            <ChangeFigure
              paisa={change}
              className="text-4xl font-bold tracking-tight text-tone-green-text tabular-nums"
            />
          </>
        ) : (
          <p className="font-bold text-muted-foreground">{t("noChange")}</p>
        )}
      </div>
      <div className="grid gap-2">
        {onNext && (
          <Button size="lg" onClick={onNext}>
            {t("next")}
          </Button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <PrintReceiptButton order={order} />
          <Button variant="outline" onClick={onDone}>
            {t("close")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** The change to hand back, counting up so the cashier's eye lands on it. */
function ChangeFigure({ paisa, className }: { paisa: number; className?: string }) {
  const format = useFormat();
  const reduced = useReducedMotion();
  const shown = useMotionValue(reduced ? paisa : 0);
  const text = useTransform(shown, (value) => format.money(toTaka(Math.round(value))));

  useEffect(() => {
    if (reduced) {
      shown.set(paisa);
      return;
    }
    const controls = animate(shown, paisa, { delay: 0.2, duration: 0.5, ease: EASE.arrive });
    return () => controls.stop();
  }, [paisa, reduced, shown]);

  return <m.p className={className}>{text}</m.p>;
}

function NothingToPay({ order }: TillPanelProps & { order: OrderDetailOut }) {
  const t = useTranslations("billing");
  const paid = order.status === "paid";
  const cancelled = order.status === "cancelled";

  return (
    <div className="grid flex-1 place-items-center">
      <EmptyState
        icon={SealCheckIcon}
        tone={cancelled ? "slate" : "brand"}
        title={cancelled ? t("cancelledTitle") : t("bill.settled")}
        action={<PrintReceiptButton order={order} />}
      >
        {cancelled ? t("cancelledBody") : paid ? t("paidBody") : t("bill.prepaid")}
      </EmptyState>
    </div>
  );
}

function TillSkeleton() {
  return (
    <div className="grid gap-5 p-6">
      <Skeleton className="h-6 w-40" />
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((tile) => (
          <Skeleton key={tile} className="h-16 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-14 rounded-md" />
      <Skeleton className="h-14 rounded-md" />
    </div>
  );
}
