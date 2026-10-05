"use client";

import { ArrowUUpLeftIcon, ReceiptIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { parseAsInteger, parseAsStringLiteral, useQueryState } from "nuqs";
import { EmptyState } from "@/components/empty-state";
import { PageFrame } from "@/components/shell/page-frame";
import { ShellAside } from "@/components/shell/shell-aside";
import { isTyping } from "@/components/shell/use-shortcuts";
import { StepBar, StepHeader } from "@/components/step-bits";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { orderQuery, paidTodayQuery } from "@/lib/api/queries";
import type { OrderDetailOut, UserRole } from "@/lib/api/schema";
import { billQueue } from "@/lib/billing";
import { businessDate } from "@/lib/format";
import { useLiveOrders } from "@/lib/live/store";
import { canOpen, canRefund, canTakePayment } from "@/lib/permissions";
import { useSession } from "@/lib/session/client";
import { useFormat } from "@/lib/use-format";
import { useNow } from "@/lib/use-now";
import { useShellLayout } from "@/lib/use-shell-layout";
import { BillPanel, BillSkeleton } from "./bill-panel";
import { BillQueueList } from "./bill-queue";
import { TakingsStrip } from "./takings-strip";
import type { Settled } from "./till";
import { TillPanel } from "./till-panel";

const STEPS = ["pay", "refund"] as const;

/**
 * The cashier's desk: bills on the left, the selected bill in the middle, the till down the
 * right edge. Phones and small tablets go one screen at a time instead.
 */
export function BillingPage() {
  const session = useSession();
  const layout = useShellLayout();
  const wide = layout === "full" || layout === "rail";
  // On the desk, picking bills shouldn't pile up history; on a phone each screen is a step back.
  const [orderId, setOrderId] = useQueryState(
    "order",
    parseAsInteger.withOptions({ history: wide ? "replace" : "push" }),
  );
  const [step, setStep] = useQueryState(
    "step",
    parseAsStringLiteral(STEPS).withOptions({ history: "push" }),
  );
  const [settled, setSettled] = useState<Settled | null>(null);
  const now = useNow(30_000);
  const queue = billQueue(useLiveOrders());
  const paid = useQuery(paidTodayQuery(businessDate(now))).data?.items;
  const bill = useQuery({ ...orderQuery(orderId ?? 0), enabled: orderId !== null });

  // Top to bottom as the queue shows them, for the arrow keys.
  const order = [...queue.waiting, ...queue.kitchen, ...queue.prepaid, ...(paid ?? [])].map(
    (entry) => entry.id,
  );
  const nextWaiting = queue.waiting.find((entry) => entry.id !== orderId)?.id;

  const select = (id: number | null) => {
    setSettled(null);
    // A refund is for the bill it was opened on.
    if (step === "refund") void setStep(null);
    void setOrderId(id);
  };

  useEffect(() => {
    if (!wide) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target) || document.querySelector("[role=dialog]")) return;
      if (order.length === 0) return;
      event.preventDefault();
      const at = orderId === null ? -1 : order.indexOf(orderId);
      const next = event.key === "ArrowDown" ? at + 1 : at - 1;
      select(order[Math.min(Math.max(next, 0), order.length - 1)]);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (session.status !== "authenticated") return null;
  const { role } = session.user;

  const list = (
    <BillQueueList queue={queue} paid={paid} selected={orderId} onSelect={select} now={now} />
  );

  if (!wide) {
    if (orderId === null || !canOpen(role, "billing")) {
      return (
        <BillingFrame>
          <div className="flex flex-col gap-5">
            <TakingsStrip />
            {list}
          </div>
        </BillingFrame>
      );
    }
    return (
      <BillSteps
        bill={bill}
        role={role}
        step={step}
        settled={settled}
        onSettled={setSettled}
        onBack={() => void (step ? setStep(null) : select(null))}
        onPay={() => void setStep("pay")}
        onRefund={() => void setStep("refund")}
        onNext={
          nextWaiting === undefined
            ? undefined
            : () => {
                select(nextWaiting);
                void setStep(null);
              }
        }
        onDone={() => {
          select(null);
          void setStep(null);
        }}
      />
    );
  }

  return (
    <BillingFrame>
      <div className="grid flex-1 grid-cols-[minmax(0,16rem)_minmax(0,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <TakingsStrip />
          {list}
        </div>
        <BillArea
          bill={bill}
          selected={orderId !== null}
          onRefund={
            bill.data && canRefund(role, bill.data) ? () => void setStep("refund") : undefined
          }
        />
      </div>
      <ShellAside>
        <aside className="sticky top-0 flex h-dvh w-[340px] shrink-0 flex-col border-l border-border bg-card xl:w-[380px]">
          <TillPanel
            order={bill.data}
            selected={orderId !== null}
            role={role}
            keypad
            settled={settled}
            onSettled={setSettled}
            onNext={nextWaiting === undefined ? undefined : () => select(nextWaiting)}
            onDone={() => setSettled(null)}
            refunding={step === "refund"}
            onRefundDone={() => void setStep(null)}
          />
        </aside>
      </ShellAside>
    </BillingFrame>
  );
}

function BillingFrame({ children }: { children: React.ReactNode }) {
  const pages = useTranslations("pages");
  return (
    <PageFrame page="billing" meta={pages("billing")}>
      {children}
    </PageFrame>
  );
}

type BillQueryState = {
  data?: OrderDetailOut;
  isPending: boolean;
  isError: boolean;
};

type BillAreaProps = { bill: BillQueryState; selected: boolean; onRefund?: () => void };

function BillArea({ bill, selected, onRefund }: BillAreaProps) {
  const t = useTranslations("billing");
  if (!selected) {
    return (
      <div className="rounded-xl bg-card shadow-md">
        <EmptyState icon={ReceiptIcon} title={t("pickTitle")}>
          {t("pick")}
        </EmptyState>
      </div>
    );
  }
  if (bill.data) {
    return (
      <BillPanel
        order={bill.data}
        actions={
          onRefund && (
            <Button variant="outline" className="text-tone-red-text" onClick={onRefund}>
              <ArrowUUpLeftIcon />
              {t("bill.refund")}
            </Button>
          )
        }
      />
    );
  }
  if (bill.isError) {
    return <Alert tone="red" icon={WarningCircleIcon} title={t("bill.failed")} />;
  }
  return <BillSkeleton />;
}

type BillStepsProps = {
  bill: BillQueryState;
  role: UserRole;
  step: (typeof STEPS)[number] | null;
  settled: Settled | null;
  onSettled: (settled: Settled) => void;
  onBack: () => void;
  onPay: () => void;
  onRefund: () => void;
  onNext?: () => void;
  onDone: () => void;
};

/** Phone flow: the bill, then the till. */
function BillSteps(props: BillStepsProps) {
  const { bill, role, step, onBack, onPay, onRefund } = props;
  const t = useTranslations("billing");
  const tOrders = useTranslations("orders");
  const format = useFormat();
  const order = bill.data;
  const title = order
    ? tOrders("orderN", { n: format.orderNo(order.orderNumber) })
    : t("phone.back");

  if (step && order) {
    const refunding = step === "refund";
    return (
      <div className="flex flex-1 flex-col">
        <StepHeader
          title={refunding ? t("refund.title") : t("phone.pay")}
          subtitle={title}
          onBack={onBack}
        />
        <div className="-mx-4 -mb-5 flex flex-1 flex-col bg-card md:-mx-6">
          <TillPanel
            {...props}
            order={order}
            selected
            keypad={false}
            refunding={refunding}
            onRefundDone={onBack}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <StepHeader title={title} onBack={onBack} />
      <BillArea
        bill={bill}
        selected
        onRefund={order && canRefund(role, order) ? onRefund : undefined}
      />
      {order && canTakePayment(role, order) && (
        <StepBar>
          <Button size="lg" className="w-full" onClick={onPay}>
            {t("phone.pay")}
            <span className="ml-auto tabular-nums">{format.money(order.balanceDue)}</span>
          </Button>
        </StepBar>
      )}
    </div>
  );
}
