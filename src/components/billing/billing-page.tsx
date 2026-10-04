"use client";

import { ReceiptIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { parseAsInteger, parseAsStringLiteral, useQueryState } from "nuqs";
import { EmptyState } from "@/components/empty-state";
import { PageFrame } from "@/components/shell/page-frame";
import { ShellAside } from "@/components/shell/shell-aside";
import { StepBar, StepHeader } from "@/components/step-bits";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { orderQuery, paidTodayQuery } from "@/lib/api/queries";
import type { OrderDetailOut, UserRole } from "@/lib/api/schema";
import { billQueue } from "@/lib/billing";
import { businessDate } from "@/lib/format";
import { useLiveOrders } from "@/lib/live/store";
import { canOpen, canTakePayment } from "@/lib/permissions";
import { useSession } from "@/lib/session/client";
import { useFormat } from "@/lib/use-format";
import { useNow } from "@/lib/use-now";
import { useShellLayout } from "@/lib/use-shell-layout";
import { BillPanel, BillSkeleton } from "./bill-panel";
import { BillQueueList } from "./bill-queue";
import { TakingsStrip } from "./takings-strip";

const STEPS = ["pay"] as const;

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
  const now = useNow(30_000);
  const queue = billQueue(useLiveOrders());
  const paid = useQuery(paidTodayQuery(businessDate(now))).data?.items;
  const bill = useQuery({ ...orderQuery(orderId ?? 0), enabled: orderId !== null });
  if (session.status !== "authenticated") return null;
  const { role } = session.user;

  const list = (
    <BillQueueList
      queue={queue}
      paid={paid}
      selected={orderId}
      onSelect={(id) => void setOrderId(id)}
      now={now}
    />
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
        onBack={() => void (step ? setStep(null) : setOrderId(null))}
        onPay={() => void setStep("pay")}
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
        <BillArea bill={bill} selected={orderId !== null} />
      </div>
      <ShellAside>
        <aside className="sticky top-0 flex h-dvh w-[340px] shrink-0 flex-col border-l border-border bg-card xl:w-[380px]">
          <TillSlot />
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

function BillArea({ bill, selected }: { bill: BillQueryState; selected: boolean }) {
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
  if (bill.data) return <BillPanel order={bill.data} />;
  if (bill.isError) {
    return <Alert tone="red" icon={WarningCircleIcon} title={t("bill.failed")} />;
  }
  return <BillSkeleton />;
}

// Filled in by the till; until a bill is picked it says what to do.
function TillSlot() {
  const t = useTranslations("billing");
  return (
    <div className="grid flex-1 place-items-center">
      <EmptyState icon={ReceiptIcon} tone="slate" title={t("till.title")}>
        {t("pick")}
      </EmptyState>
    </div>
  );
}

type BillStepsProps = {
  bill: BillQueryState;
  role: UserRole;
  step: (typeof STEPS)[number] | null;
  onBack: () => void;
  onPay: () => void;
};

/** Phone flow: the bill, then the till. */
function BillSteps({ bill, role, step, onBack, onPay }: BillStepsProps) {
  const t = useTranslations("billing");
  const tOrders = useTranslations("orders");
  const format = useFormat();
  const order = bill.data;
  const title = order
    ? tOrders("orderN", { n: format.orderNo(order.orderNumber) })
    : t("phone.back");

  if (step === "pay" && order) {
    return (
      <div className="flex flex-1 flex-col">
        <StepHeader title={t("phone.pay")} subtitle={title} onBack={onBack} />
        <TillSlot />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <StepHeader title={title} onBack={onBack} />
      <BillArea bill={bill} selected />
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
