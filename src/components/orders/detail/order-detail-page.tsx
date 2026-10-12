"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowsClockwiseIcon,
  CloudSlashIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ProhibitIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { PageFrame } from "@/components/shell/page-frame";
import { StateCard } from "@/components/state-card";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { orderQuery } from "@/lib/api/queries";
import type { OrderDetailOut, UserRole } from "@/lib/api/schema";
import { isApiError } from "@/lib/api/errors";
import { useErrorText } from "@/lib/api/use-error-text";
import { stepEvents } from "@/lib/order-detail";
import { forwardMove, STATUS_LOOK } from "@/lib/orders";
import {
  canAddItems,
  canReplaceItems,
  canRefund,
  canTakePayment,
  can,
  orderMoves,
  PAGE_PATHS,
} from "@/lib/permissions";
import { useSession } from "@/lib/session/client";
import { useFormat } from "@/lib/use-format";
import { useNow } from "@/lib/use-now";
import { useOrderStatus } from "@/lib/use-order-actions";
import { useShellLayout } from "@/lib/use-shell-layout";
import { CancelOrderDialog } from "../cancel-order-dialog";
import { useOrderWhere } from "../order-bits";
import { OrderFacts } from "./order-facts";
import { OrderHistory } from "./order-history";
import { OrderItems } from "./order-items";
import { OrderPayments } from "./order-payments";
import { OrderProgressCompact, OrderStepper } from "./order-progress";

export function OrderDetailPage() {
  const t = useTranslations("orders");
  const errorText = useErrorText();
  const session = useSession();
  const id = Number(useParams<{ id: string }>().id);
  const valid = Number.isInteger(id) && id > 0;
  const query = useQuery({ ...orderQuery(id), enabled: valid });
  if (session.status !== "authenticated") return null;
  const parent = { label: t("title"), href: PAGE_PATHS.orders };

  const missing =
    !valid || (query.isError && isApiError(query.error) && query.error.status === 404);
  if (missing) {
    return (
      <PageFrame page="orders" parent={parent}>
        <div className="grid flex-1 place-items-start pt-2 md:place-items-center md:pb-24">
          <StateCard
            heading="h2"
            icon={MagnifyingGlassIcon}
            title={t("detail.missingTitle")}
            actions={
              <Link href={PAGE_PATHS.orders} className={buttonVariants({ variant: "secondary" })}>
                <ArrowLeftIcon />
                {t("detail.backToOrders")}
              </Link>
            }
          >
            {t("detail.missingBody")}
          </StateCard>
        </div>
      </PageFrame>
    );
  }

  if (!query.data) {
    return (
      <PageFrame page="orders" title={t("orderN", { n: "…" })} parent={parent}>
        {query.isError ? (
          <div className="grid flex-1 place-items-start pt-2 md:place-items-center md:pb-24">
            <StateCard
              heading="h2"
              icon={CloudSlashIcon}
              title={t("detail.failed")}
              actions={
                <Button variant="secondary" onClick={() => void query.refetch()}>
                  <ArrowsClockwiseIcon />
                  {t("failed.retry")}
                </Button>
              }
            >
              {errorText.message(query.error)}
            </StateCard>
          </div>
        ) : (
          <DetailSkeleton />
        )}
      </PageFrame>
    );
  }

  return <OrderDetail order={query.data} role={session.user.role} parent={parent} />;
}

type OrderDetailProps = {
  order: OrderDetailOut;
  role: UserRole;
  parent: { label: string; href: string };
};

function OrderDetail({ order, role, parent }: OrderDetailProps) {
  const t = useTranslations("orders");
  const format = useFormat();
  const phone = useShellLayout() === "phone";
  const now = useNow(30_000);
  const where = useOrderWhere()(order);
  const move = useOrderStatus();
  const [cancelling, setCancelling] = useState(false);

  const n = format.orderNo(order.orderNumber);
  const moves = orderMoves(role, order);
  const next = forwardMove(moves);
  const NextIcon = next ? STATUS_LOOK[next].icon : null;
  const canCancel = moves.includes("cancelled");
  const addable = canAddItems(role, order);
  const placedBy = order.createdBy?.fullName;
  const cancelEvent = stepEvents(order.history).cancelled;

  const meta = [
    order.orderNumber,
    order.orderType === "takeaway"
      ? [t("takeaway"), where.detail].filter(Boolean).join(" · ")
      : t("detail.dineInAt", { table: where.title }),
    placedBy
      ? t("detail.placedBy", { time: format.time(order.createdAt), name: placedBy })
      : t("detail.placedAt", { time: format.time(order.createdAt) }),
  ].join(" · ");

  const addLink = addable && (
    <Link
      href={{ pathname: PAGE_PATHS.newOrder, query: { add: order.id } }}
      className={buttonVariants({
        variant: phone && !next ? "default" : "outline",
        size: phone ? "lg" : "default",
      })}
    >
      <PlusIcon weight="bold" />
      {t("detail.addItems")}
    </Link>
  );

  const nextButton = next && NextIcon && (
    <Button
      size={phone ? "lg" : "default"}
      className={phone ? "flex-1" : undefined}
      disabled={move.isPending}
      onClick={() => move.mutate({ order, status: next })}
    >
      <NextIcon weight="duotone" />
      {t(`moves.${next}`)}
    </Button>
  );

  const cancelBlock = canCancel && (
    <div className="px-1">
      <Button
        variant="ghost"
        className="-ml-3 text-tone-red-text hover:bg-tone-red-subtle"
        onClick={() => setCancelling(true)}
      >
        <ProhibitIcon weight="duotone" />
        {t("moves.cancelled")}
      </Button>
      <p className="mt-1 text-xs text-pretty text-muted-foreground">
        {order.status === "preparing" ? t("detail.cancelCooking") : t("detail.cancelHint")}
      </p>
    </div>
  );

  const cooking = order.status === "preparing" && !canCancel && can(role, "order.edit");

  return (
    <PageFrame
      page="orders"
      title={t("orderN", { n })}
      crumb={n}
      parent={parent}
      meta={meta}
      actions={
        !phone && (
          <>
            {addLink}
            {nextButton}
          </>
        )
      }
    >
      {order.status === "cancelled" && (
        <Alert
          tone="red"
          icon={ProhibitIcon}
          title={t("detail.cancelledTitle", {
            time: format.time(order.closedAt ?? order.updatedAt),
            name: cancelEvent?.changedBy?.fullName ?? "",
          })}
          className="mb-5"
        >
          {order.cancelReason}
        </Alert>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid grid-cols-1 gap-5">
          {phone ? (
            <OrderProgressCompact order={order} now={now} />
          ) : (
            <OrderStepper order={order} now={now} />
          )}
          <OrderItems order={order} editable={canReplaceItems(role, order)} />
          {!phone && (
            <OrderPayments
              order={order}
              canTakePayment={canTakePayment(role, order)}
              canRefund={canRefund(role, order)}
            />
          )}
        </div>
        <div className="grid grid-cols-1 gap-5">
          {!phone && <OrderHistory order={order} />}
          <OrderFacts order={order} canReassign={role === "manager" || role === "admin"} />
          {phone && <OrderHistory order={order} />}
          {phone && (
            <OrderPayments
              order={order}
              canTakePayment={canTakePayment(role, order)}
              canRefund={canRefund(role, order)}
            />
          )}
          {cancelBlock}
          {cooking && (
            <p className="px-1 text-xs text-pretty text-muted-foreground">
              {t("detail.managerCancels")}
            </p>
          )}
        </div>
      </div>

      {phone && (nextButton || addLink) && (
        <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 -mx-4 mt-5 flex gap-2.5 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
          {nextButton ? (
            <>
              {addLink}
              {nextButton}
            </>
          ) : (
            <div className="flex-1 [&>a]:w-full">{addLink}</div>
          )}
        </div>
      )}

      <CancelOrderDialog order={order} role={role} open={cancelling} onOpenChange={setCancelling} />
    </PageFrame>
  );
}

function DetailSkeleton() {
  return (
    <div
      aria-busy
      className="grid animate-appear grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]"
    >
      <div className="grid grid-cols-1 gap-5">
        <Skeleton className="h-28 rounded-xl bg-card" />
        <Skeleton className="h-96 rounded-xl bg-card" />
      </div>
      <div className="grid grid-cols-1 gap-5">
        <Skeleton className="h-64 rounded-xl bg-card" />
        <Skeleton className="h-72 rounded-xl bg-card" />
      </div>
    </div>
  );
}
