/* eslint-disable @next/next/no-img-element -- the API serves one resized WebP; next/image would only spend quota */
"use client";

import { useState } from "react";
import { CaretRightIcon, CheckIcon, PlusIcon, UsersIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { Segmented } from "@/components/ui/segmented";
import { useRouter } from "@/i18n/navigation";
import { imageUrl } from "@/lib/api/images";
import { restaurantQuery } from "@/lib/api/queries";
import type { FoodOut, OrderType } from "@/lib/api/schema";
import { byArea, type FloorTable } from "@/lib/floor";
import { toTaka } from "@/lib/money";
import { PAGE_PATHS } from "@/lib/permissions";
import { cartTotals } from "@/lib/pos";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";
import { CartFooter, CartLines, type CartProps } from "./cart-panel";
import { CategoryChips, MenuSearch } from "./menu-panel";
import { DishIcon } from "@/components/dish-icon";
import { StepBar, StepHeader } from "@/components/step-bits";
import type { Menu } from "./use-menu";

const STEPS = ["where", "menu", "review"] as const;
type Step = (typeof STEPS)[number];

type PosStepsProps = {
  menu: Menu;
  cart: CartProps;
  counts: ReadonlyMap<number, number>;
  onAdd: (foodId: number) => void;
  setterFor: (foodId: number) => ((quantity: number) => void) | undefined;
};

/**
 * Phones and tablets take an order in three steps: where, what, check and send. The step
 * lives in the address, so the back button steps back instead of leaving.
 */
export function PosSteps(props: PosStepsProps) {
  const { cart } = props;
  const [stepParam, setStep] = useQueryState(
    "step",
    parseAsStringLiteral(STEPS).withOptions({ history: "push" }),
  );
  // Where to start is decided once; picking a table shouldn't jump ahead on its own.
  const [start] = useState<Step>(() =>
    !cart.adding && cart.draft.orderType === "dine_in" && cart.draft.tableId === null
      ? "where"
      : "menu",
  );
  const step: Step = stepParam ?? start;
  const go = (next: Step) => void setStep(next);

  if (step === "where" && !cart.adding) return <WhereStep {...props} onNext={() => go("menu")} />;
  if (step === "review")
    return <ReviewStep {...props} onBack={() => go("menu")} onWhere={() => go("where")} />;
  return (
    <MenuStep
      {...props}
      onBack={cart.adding ? null : () => go("where")}
      onNext={() => go("review")}
    />
  );
}

// Leaving without sending keeps the draft; the orders list is where the POS was opened from.
function useLeave() {
  const router = useRouter();
  return () => router.push(PAGE_PATHS.orders);
}

// Step 1

function WhereStep({ cart, onNext }: PosStepsProps & { onNext: () => void }) {
  const t = useTranslations("pos");
  const leave = useLeave();
  const { draft, update, tables } = cart;
  const picked = tables.find((entry) => entry.table.id === draft.tableId);
  const ready = draft.orderType === "takeaway" || picked;

  return (
    <div className="flex flex-1 flex-col">
      <StepHeader
        title={t("newTitle")}
        subtitle={t("notSent")}
        step={1}
        total={3}
        onClose={leave}
      />
      <h2 className="mb-3 text-2xl font-bold tracking-tight">{t("whereTitle")}</h2>
      <Segmented<OrderType>
        aria-label={t("orderType")}
        value={draft.orderType}
        onValueChange={(orderType) =>
          update(orderType === "takeaway" ? { orderType, tableId: null } : { orderType })
        }
        options={[
          { value: "dine_in", label: t("dineIn") },
          { value: "takeaway", label: t("takeaway") },
        ]}
        className="mb-5 grid grid-cols-2 [&>button]:h-10 [&>button]:justify-center"
      />

      {draft.orderType === "dine_in" ? (
        <div className="grid gap-5">
          {byArea(tables).map(({ area, tables: group }) => (
            <section key={area}>
              <h3 className="mb-2 text-sm font-bold text-muted-foreground">
                {area || t("otherTables")}
              </h3>
              <ul className="grid grid-cols-3 gap-2.5 md:grid-cols-5">
                {group.map((entry) => (
                  <li key={entry.table.id}>
                    <TableChoice
                      entry={entry}
                      selected={entry.table.id === draft.tableId}
                      onPick={() => cart.onPickTable(entry.table.id)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          <Input
            value={draft.customerName}
            onChange={(event) => update({ customerName: event.target.value })}
            placeholder={t("customerName")}
            aria-label={t("customerName")}
            className="h-11"
            maxLength={100}
          />
          <Input
            value={draft.customerPhone}
            onChange={(event) => update({ customerPhone: event.target.value })}
            placeholder={t("customerPhone")}
            aria-label={t("customerPhone")}
            className="h-11"
            type="tel"
            inputMode="tel"
            maxLength={20}
          />
          <p className="text-sm text-muted-foreground">{t("takeawayHint")}</p>
        </div>
      )}

      <div className="flex-1" />
      <StepBar>
        <Button size="lg" className="h-13 w-full text-md" disabled={!ready} onClick={onNext}>
          {draft.orderType === "takeaway"
            ? t("continueTakeaway")
            : picked
              ? t("continueWith", { table: picked.table.number })
              : t("pickTable")}
        </Button>
      </StepBar>
    </div>
  );
}

function TableChoice({
  entry,
  selected,
  onPick,
}: {
  entry: FloorTable;
  selected: boolean;
  onPick: () => void;
}) {
  const t = useTranslations("pos");
  const format = useFormat();
  const { table, state } = entry;
  const busy = state.kind === "order";

  const [dot, label] = selected
    ? ["bg-primary", t("selected")]
    : state.kind === "order"
      ? [
          "bg-tone-slate",
          state.order.status === "served"
            ? t("billDue")
            : t("orderN", { n: format.orderNo(state.order.orderNumber) }),
        ]
      : state.kind === "booked"
        ? ["bg-tone-amber", t("bookedShort", { time: format.time(state.booking.startsAt) })]
        : [
            "bg-tone-green",
            state.laterBooking
              ? t("freeTill", { time: format.time(state.laterBooking.startsAt) })
              : t("tableFree"),
          ];

  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className={cn(
        "relative w-full rounded-xl p-3 text-left ring-2 transition-[box-shadow,background-color] duration-(--duration-fast) outline-none focus-visible:ring-ring/60",
        selected
          ? "bg-card ring-primary"
          : busy
            ? "bg-muted ring-transparent"
            : "bg-card shadow-sm ring-transparent",
      )}
    >
      <span className="flex items-center justify-between gap-1">
        <span className={cn("text-lg font-bold", busy && !selected && "text-muted-foreground")}>
          {table.number}
        </span>
        {selected ? (
          <span className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
            <CheckIcon weight="bold" className="size-3" />
          </span>
        ) : (
          <span className="flex items-center gap-0.5 text-xs font-bold text-muted-foreground tabular-nums">
            <UsersIcon weight="duotone" className="size-3.5" />
            {format.number(table.seats)}
          </span>
        )}
      </span>
      <span className="mt-1 flex items-center gap-1.5 text-xs">
        <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dot)} />
        <span
          className={cn("truncate", selected ? "font-bold text-primary" : "text-muted-foreground")}
        >
          {label}
        </span>
      </span>
    </button>
  );
}

// Step 2

function MenuStep({
  menu,
  cart,
  counts,
  onAdd,
  setterFor,
  onBack,
  onNext,
}: PosStepsProps & { onBack: (() => void) | null; onNext: () => void }) {
  const t = useTranslations("pos");
  const leave = useLeave();
  const format = useFormat();
  const { data: restaurant } = useQuery(restaurantQuery);
  const { draft, adding, tables } = cart;
  const picked = tables.find((entry) => entry.table.id === draft.tableId);
  const totals = cartTotals(draft.lines, menu.prices, draft.orderType, {
    serviceChargePercent: restaurant?.serviceChargePercent ?? 0,
    vatPercent: restaurant?.vatPercent ?? 0,
  });

  const title = adding
    ? t("addingTitle", { n: adding.n })
    : picked
      ? [picked.table.number, picked.table.location].filter(Boolean).join(" · ")
      : t("takeaway");
  const subtitle = adding
    ? adding.where
    : draft.orderType === "takeaway"
      ? draft.customerName || t("notSent")
      : t("dineIn");

  // Grouped by category while browsing everything; a search or a chip shows a flat list.
  const grouped = menu.category === "all" && !menu.search;
  const groups = grouped
    ? menu.chips
        .map((chip) => ({
          ...chip,
          foods: menu.shown.filter((food) => food.category?.id === chip.id),
        }))
        .concat([
          {
            id: -1,
            name: t("noCategory"),
            count: 0,
            foods: menu.shown.filter((food) => !food.category),
          },
        ])
        .filter((group) => group.foods.length > 0)
    : [{ id: 0, name: "", count: 0, foods: menu.shown }];

  return (
    <div className="flex flex-1 flex-col">
      <StepHeader
        title={title}
        subtitle={subtitle}
        step={adding ? 1 : 2}
        total={adding ? 2 : 3}
        onBack={onBack}
        onClose={leave}
      />
      <MenuSearch menu={menu} className="mb-3" />
      <CategoryChips menu={menu} className="-mx-4 mb-4 px-4" />

      {menu.loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("loadingMenu")}</p>
      ) : menu.shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {menu.search ? t("noDishesSearch", { term: menu.search }) : t("noDishesHint")}
        </p>
      ) : (
        <div className="grid gap-5">
          {groups.map((group) => (
            <section key={group.id}>
              {group.name && (
                <h3 className="mb-1 flex items-baseline justify-between text-sm font-bold">
                  {group.name}
                  <span className="text-xs font-normal text-muted-foreground">
                    {t("dishCount", { n: group.foods.length })}
                  </span>
                </h3>
              )}
              <ul className="divide-y divide-border md:grid md:grid-cols-2 md:gap-x-6 md:divide-y-0">
                {group.foods.map((food) => (
                  <DishRow
                    key={food.id}
                    food={food}
                    inCart={counts.get(food.id) ?? 0}
                    onAdd={() => onAdd(food.id)}
                    onSetQuantity={setterFor(food.id)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="flex-1" />
      {totals.items > 0 && (
        <StepBar>
          <Button size="lg" className="h-14 w-full justify-between px-4 text-md" onClick={onNext}>
            <span className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-full bg-primary-foreground/20 text-sm font-bold tabular-nums">
                {format.number(totals.items)}
              </span>
              {t("viewOrder")}
            </span>
            <span className="flex items-center gap-1.5 tabular-nums">
              {format.money(toTaka(totals.total))}
              <CaretRightIcon weight="bold" className="size-4" />
            </span>
          </Button>
        </StepBar>
      )}
    </div>
  );
}

type DishRowProps = {
  food: FoodOut;
  inCart: number;
  onAdd: () => void;
  onSetQuantity?: (quantity: number) => void;
};

function DishRow({ food, inCart, onAdd, onSetQuantity }: DishRowProps) {
  const t = useTranslations("pos");
  const format = useFormat();
  const soldOut = !food.isAvailable;
  const src = imageUrl(food.imageUrl);

  return (
    <li className={cn("flex items-center gap-3 py-3", soldOut && "opacity-60")}>
      <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary-soft text-primary-soft-foreground">
        {src ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          <DishIcon category={food.category?.name} className="size-6" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{food.name}</p>
        <p className="flex items-baseline gap-1.5 text-sm">
          {soldOut ? (
            <span className="font-medium text-tone-red-text">{t("soldOut")}</span>
          ) : (
            <>
              <span className="font-bold tabular-nums">{format.money(food.finalPrice)}</span>
              {food.hasDiscount && (
                <span className="text-xs text-muted-foreground tabular-nums line-through">
                  {format.money(food.price)}
                </span>
              )}
            </>
          )}
        </p>
      </div>
      {!soldOut &&
        (inCart > 0 && onSetQuantity ? (
          <QtyStepper
            value={inCart}
            removable
            onChange={onSetQuantity}
            label={t("quantityOf", { name: food.name })}
          />
        ) : (
          <Button
            variant="soft"
            size="icon"
            className="size-11 rounded-full"
            aria-label={t("addLabel", { name: food.name })}
            onClick={onAdd}
          >
            {inCart > 0 ? (
              <span className="font-bold tabular-nums">{format.number(inCart)}</span>
            ) : (
              <PlusIcon weight="bold" />
            )}
          </Button>
        ))}
    </li>
  );
}

// Step 3

function ReviewStep({
  cart,
  onBack,
  onWhere,
}: PosStepsProps & { onBack: () => void; onWhere: () => void }) {
  const t = useTranslations("pos");
  const { draft, adding, tables } = cart;
  const picked = tables.find((entry) => entry.table.id === draft.tableId);

  return (
    <div className="flex flex-1 flex-col">
      <StepHeader
        title={t("reviewTitle")}
        subtitle={adding ? adding.where : undefined}
        step={adding ? 2 : 3}
        total={adding ? 2 : 3}
        onBack={onBack}
      />

      {!adding && (
        <section className="mb-4 flex items-center gap-3 rounded-xl bg-card p-4 shadow-sm">
          <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary-soft text-lg font-bold text-primary-soft-foreground">
            {picked ? picked.table.number : t("takeawayShort")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">
              {picked
                ? [picked.table.location, t("seats", { n: picked.table.seats })]
                    .filter(Boolean)
                    .join(" · ")
                : draft.customerName || t("takeaway")}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {draft.orderType === "takeaway" ? t("takeaway") : t("dineIn")}
            </p>
          </div>
          <Button variant="ghost" className="text-primary" onClick={onWhere}>
            {t("change")}
          </Button>
        </section>
      )}

      <section className="rounded-xl bg-card px-4 shadow-sm">
        <CartLines {...cart} />
      </section>
      <Button variant="outline" size="lg" className="mt-3 w-full" onClick={onBack}>
        <PlusIcon weight="bold" />
        {t("addMore")}
      </Button>

      <div className="flex-1" />
      <StepBar>
        <CartFooter {...cart} />
      </StepBar>
    </div>
  );
}
