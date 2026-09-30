"use client";

import { CheckIcon, TimerIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Pill } from "@/components/ui/pill";
import type { OrderDetailOut } from "@/lib/api/schema";
import { stepEvents, stepStates, STEPS, type StepState } from "@/lib/order-detail";
import { ageTone, minutesSince, STATUS_LOOK } from "@/lib/orders";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";
import { OrderStatusPill } from "../order-status";
import { useWaitText } from "../order-bits";

type ProgressProps = { order: OrderDetailOut; now: number };

/** How long the order has been at its current step. */
function currentSince(order: OrderDetailOut) {
  return stepEvents(order.history)[order.status]?.createdAt ?? order.updatedAt;
}

/** Six steps across a card, each with the time it was reached. */
export function OrderStepper({ order, now }: ProgressProps) {
  const t = useTranslations("status.order");
  const d = useTranslations("orders.detail");
  const format = useFormat();
  const wait = useWaitText();
  const events = stepEvents(order.history);
  const states = stepStates(order.status, order.history);

  return (
    <ol className="flex items-start rounded-xl bg-card px-4 py-5 shadow-md sm:px-6">
      {STEPS.map((step, i) => {
        const state = states[step];
        const Icon = STATUS_LOOK[step].icon;
        const at = events[step]?.createdAt;
        return (
          <li key={step} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-4 right-[calc(50%+22px)] left-[calc(-50%+22px)] h-0.5 rounded-full",
                  state === "todo" ? "bg-border" : "bg-tone-green",
                )}
              />
            )}
            <StepDot state={state} index={i}>
              <Icon weight="duotone" className="size-[18px]" />
            </StepDot>
            <p
              className={cn(
                "mt-2 text-sm",
                state === "todo" ? "text-muted-foreground" : "font-bold",
              )}
            >
              {step === "pending" ? d("placed") : t(step)}
            </p>
            <p
              className={cn(
                "mt-0.5 text-xs tabular-nums",
                state === "current" ? "font-bold text-tone-orange-text" : "text-muted-foreground",
              )}
            >
              {state === "current" && step !== "paid"
                ? d("soFar", { time: wait(minutesSince(currentSince(order), now)) })
                : at
                  ? format.time(at)
                  : "–"}
            </p>
            <span className="sr-only">{d(`stepState.${state}`)}</span>
          </li>
        );
      })}
    </ol>
  );
}

function StepDot({
  state,
  index,
  children,
}: {
  state: StepState;
  index: number;
  children: React.ReactNode;
}) {
  const format = useFormat();
  if (state === "done") {
    return (
      <span className="relative grid size-9 place-items-center rounded-full bg-tone-green-subtle text-tone-green-text">
        <CheckIcon weight="bold" className="size-4" />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="relative grid size-9 place-items-center rounded-full bg-tone-orange-subtle text-tone-orange-text ring-2 ring-primary">
        {children}
      </span>
    );
  }
  return (
    <span className="relative grid size-9 place-items-center rounded-full bg-muted text-sm font-bold text-muted-foreground tabular-nums">
      {format.number(index + 1)}
    </span>
  );
}

/** Phones: the status, how long, a segmented bar and one plain sentence. */
export function OrderProgressCompact({ order, now }: ProgressProps) {
  const wait = useWaitText();
  const states = stepStates(order.status, order.history);
  const minutes = minutesSince(currentSince(order), now);
  const open = order.status !== "paid" && order.status !== "cancelled";

  return (
    <section className="rounded-xl bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <OrderStatusPill status={order.status} />
        {open && (
          <Pill tone={ageTone(minutes)} icon={TimerIcon}>
            {wait(minutes)}
          </Pill>
        )}
      </div>
      <div className="mt-3.5 flex gap-1.5" aria-hidden>
        {STEPS.map((step) => (
          <span
            key={step}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              order.status === "cancelled" && states[step] === "done"
                ? "bg-tone-red/40"
                : states[step] === "done"
                  ? "bg-tone-green"
                  : states[step] === "current"
                    ? "bg-primary"
                    : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="mt-3 text-sm text-pretty text-muted-foreground">
        <ProgressSentence order={order} />
      </p>
    </section>
  );
}

/** "Kamal started cooking at 8:41 pm." */
export function ProgressSentence({ order }: { order: OrderDetailOut }) {
  const d = useTranslations("orders.detail.sentence");
  const format = useFormat();
  const event = stepEvents(order.history)[order.status];
  const time = format.time(event?.createdAt ?? order.updatedAt);
  const name = event?.changedBy?.fullName.split(" ")[0];

  switch (order.status) {
    case "pending":
      return <>{d(order.source === "staff" ? "pendingStaff" : "pendingGuest", { time })}</>;
    case "preparing":
      return <>{name ? d("preparingBy", { name, time }) : d("preparing", { time })}</>;
    case "ready":
      return <>{d(order.orderType === "takeaway" ? "readyTakeaway" : "ready", { time })}</>;
    case "cancelled":
      return <>{d("cancelled", { time, reason: order.cancelReason ?? "" })}</>;
    default:
      return <>{d(order.status, { time })}</>;
  }
}
