"use client";

import { useState } from "react";
import { PencilSimpleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { FoodThumb } from "@/components/food-thumb";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { foodsQuery } from "@/lib/api/queries";
import type { OrderDetailOut } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";
import {
  draftChanged,
  draftPayload,
  stepEvents,
  toDraft,
  type DraftLine,
} from "@/lib/order-detail";
import { useFormat } from "@/lib/use-format";
import { useReplaceItems } from "@/lib/use-order-actions";
import { cn } from "@/lib/utils";

type OrderItemsProps = { order: OrderDetailOut; editable: boolean };

/** The dishes and the bill. Until the kitchen starts, quantities can change right here. */
export function OrderItems({ order, editable }: OrderItemsProps) {
  const t = useTranslations("orders.detail");
  const format = useFormat();
  const errorText = useErrorText();
  const { data: foods } = useQuery(foodsQuery);
  const dishes = new Map(foods?.map((food) => [food.id, food]));
  const replace = useReplaceItems();
  const [draft, setDraft] = useState<DraftLine[] | null>(null);
  const editing = draft !== null && editable;
  const sentAt = stepEvents(order.history).confirmed?.createdAt;

  const setQuantity = (key: number, quantity: number) =>
    setDraft(
      (lines) => lines?.map((line) => (line.key === key ? { ...line, quantity } : line)) ?? null,
    );

  const save = () => {
    if (!draft) return;
    replace.mutate({ order, items: draftPayload(draft) }, { onSuccess: () => setDraft(null) });
  };

  const kept = draft?.filter((line) => line.quantity > 0).length ?? 1;

  return (
    <section className="rounded-xl bg-card p-5 shadow-md sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-bold">{t("items")}</h2>
        {editable && !editing ? (
          <Button variant="ghost" size="sm" onClick={() => setDraft(toDraft(order.items))}>
            <PencilSimpleIcon />
            {t("editItems")}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("itemsMeta", { n: order.itemCount })}
            {sentAt && ` · ${t("sentAt", { time: format.time(sentAt) })}`}
          </p>
        )}
      </header>

      <ul className="mt-2 divide-y divide-border">
        {order.items.map((item) => {
          const quantity = editing
            ? (draft.find((line) => line.key === item.id)?.quantity ?? 0)
            : item.quantity;
          return (
            <li
              key={item.id}
              className={cn(
                "flex items-center gap-3.5 py-3.5 transition-opacity",
                editing && quantity === 0 && "opacity-45",
              )}
            >
              <FoodThumb
                src={dishes.get(item.foodId)?.imageUrl}
                category={dishes.get(item.foodId)?.category?.name}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn("truncate font-bold", editing && quantity === 0 && "line-through")}
                >
                  {item.foodName}
                </p>
                <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
                  <span className="tabular-nums">
                    {/* Narrow screens fold the quantity into this line. */}
                    {!editing && <span className="sm:hidden">{format.number(quantity)} × </span>}
                    {item.unitDiscount > 0
                      ? t("eachOff", {
                          price: format.money(item.unitPrice),
                          off: format.money(item.unitDiscount),
                        })
                      : t("each", { price: format.money(item.finalUnitPrice) })}
                  </span>
                  {item.notes && (
                    <span className="inline-flex items-center gap-1 font-medium text-tone-orange-text">
                      <PencilSimpleIcon weight="duotone" className="size-3.5" />
                      {item.notes}
                    </span>
                  )}
                </p>
              </div>
              {editing ? (
                <QtyStepper
                  size="sm"
                  value={quantity}
                  removable={kept > 1 || quantity === 0}
                  min={0}
                  onChange={(value) => setQuantity(item.id, value)}
                  label={t("quantityOf", { name: item.foodName })}
                />
              ) : (
                <span className="hidden w-10 text-right text-muted-foreground tabular-nums sm:block">
                  ×{format.number(quantity)}
                </span>
              )}
              <span className="text-right font-bold tabular-nums sm:w-24">
                {format.money(item.finalUnitPrice * quantity)}
              </span>
            </li>
          );
        })}
      </ul>

      {editing ? (
        <div className="mt-2 border-t border-border pt-4">
          {replace.isError && (
            <Alert tone="red" icon={WarningCircleIcon} title={t("saveFailed")} className="mb-4">
              {errorText.message(replace.error)}
            </Alert>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t("totalsOnSave")}</p>
            <div className="flex gap-2.5">
              <Button variant="outline" onClick={() => setDraft(null)} disabled={replace.isPending}>
                {t("discard")}
              </Button>
              <Button
                onClick={save}
                disabled={!draftChanged(draft, order.items) || replace.isPending}
              >
                {replace.isPending ? t("saving") : t("save")}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Totals order={order} />
      )}
    </section>
  );
}

function Totals({ order }: { order: OrderDetailOut }) {
  const t = useTranslations("orders.detail");
  const format = useFormat();
  const rows: [string, number][] = [[t("subtotal"), order.subtotal]];
  if (order.discountTotal > 0) rows.push([t("discount"), -order.discountTotal]);
  if (order.serviceCharge > 0) {
    rows.push([
      t("serviceCharge", { rate: format.number(order.serviceChargeRate) }),
      order.serviceCharge,
    ]);
  }
  rows.push([
    t(order.serviceCharge > 0 ? "vatOnBoth" : "vat", { rate: format.number(order.vatRate) }),
    order.vat,
  ]);

  return (
    <dl className="mt-2 border-t border-border pt-4 text-sm">
      {rows.map(([label, amount]) => (
        <div key={label} className="flex justify-between gap-4 py-1 text-muted-foreground">
          <dt>{label}</dt>
          <dd className="tabular-nums">{format.money(amount)}</dd>
        </div>
      ))}
      <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-border pt-3">
        <dt className="text-md font-bold">{t("total")}</dt>
        <dd className="text-2xl font-bold tabular-nums">{format.money(order.total)}</dd>
      </div>
    </dl>
  );
}
