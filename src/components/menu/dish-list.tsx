"use client";

import {
  DotsThreeIcon,
  PencilSimpleIcon,
  ProhibitIcon,
  StarIcon,
  TimerIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { FoodThumb } from "@/components/food-thumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pill } from "@/components/ui/pill";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FoodOut } from "@/lib/api/schema";
import { useSetAvailability } from "@/lib/use-menu-actions";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

export type DishAction = "edit" | "feature" | "delete";

type DishListProps = {
  foods: FoodOut[];
  /** Hides the category column once one category is picked. */
  showCategory: boolean;
  /** Beside the category rail the table is narrow, so the category column waits for more room. */
  besideRail?: boolean;
  /** Managers edit; chefs and managers flip sold out; everyone else reads. */
  editable: boolean;
  canSellOut: boolean;
  onAction: (food: FoodOut, action: DishAction) => void;
};

/** "-15%" or "-৳50", the way the dish's discount is set up. */
function useDiscountLabel() {
  const format = useFormat();
  return (food: Pick<FoodOut, "discountType" | "discountValue">) =>
    food.discountType === "percentage"
      ? `-${format.number(food.discountValue)}%`
      : `-${Number.isInteger(food.discountValue) ? format.moneyWhole(food.discountValue) : format.money(food.discountValue)}`;
}

/** What guests pay, with the offer and the old price under it when there's a discount. */
export function DishPrice({ food, className }: { food: FoodOut; className?: string }) {
  const format = useFormat();
  const label = useDiscountLabel();
  return (
    <span className={cn("grid justify-items-start gap-0.5", className)}>
      <span className="flex items-center gap-2">
        <span className="font-bold tabular-nums">{format.money(food.finalPrice)}</span>
        {food.hasDiscount && (
          <Pill tone="green" className="h-5 px-2 tabular-nums">
            {label(food)}
          </Pill>
        )}
      </span>
      {food.hasDiscount && (
        <span className="text-xs text-muted-foreground tabular-nums line-through">
          {format.money(food.price)}
        </span>
      )}
    </span>
  );
}

function SoldOutSwitch({ food }: { food: FoodOut }) {
  const t = useTranslations("menu.dishes");
  const toggle = useSetAvailability();
  return (
    <Switch
      checked={food.isAvailable}
      onCheckedChange={(available) => toggle.mutate({ food, available })}
      aria-label={t("available", { name: food.name })}
      className="relative z-10"
    />
  );
}

function SoldOutPill() {
  const t = useTranslations("menu.dishes");
  return (
    <Pill tone="red" icon={ProhibitIcon}>
      {t("soldOut")}
    </Pill>
  );
}

function RowMenu({ food, onAction }: { food: FoodOut; onAction: (action: DishAction) => void }) {
  const t = useTranslations("menu.dishes");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative z-10 text-muted-foreground"
            aria-label={t("menu", { name: food.name })}
          />
        }
      >
        <DotsThreeIcon weight="bold" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem onClick={() => onAction("edit")}>
          <PencilSimpleIcon />
          {t("edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction("feature")}>
          <StarIcon weight={food.isFeatured ? "fill" : "regular"} />
          {food.isFeatured ? t("unfeature") : t("feature")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => onAction("delete")}>
          <TrashIcon />
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DishName({ food, onOpen }: { food: FoodOut; onOpen?: () => void }) {
  const t = useTranslations("menu.dishes");
  const name = (
    <span className="flex items-center gap-1.5">
      <span className="truncate font-bold">{food.name}</span>
      {food.isFeatured && (
        <StarIcon
          weight="fill"
          className="size-3.5 shrink-0 text-brand"
          aria-label={t("featured")}
        />
      )}
    </span>
  );
  return onOpen ? (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full min-w-0 text-left outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/40 focus-visible:after:ring-inset"
    >
      {name}
    </button>
  ) : (
    name
  );
}

// The prep time drops first, then the category, as the table narrows.
const wide = "hidden xl:table-cell";

export function DishTable(props: DishListProps) {
  const { foods, showCategory, besideRail, editable, canSellOut, onAction } = props;
  const t = useTranslations("menu.dishes");
  const categoryCell = besideRail ? "hidden min-[1360px]:table-cell" : "";

  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead>{t("columns.dish")}</TableHead>
          {showCategory && (
            <TableHead className={cn(categoryCell, "w-[140px]")}>{t("columns.category")}</TableHead>
          )}
          <TableHead className="w-[150px]">{t("columns.price")}</TableHead>
          <TableHead className={cn(wide, "w-[90px]")}>{t("columns.prep")}</TableHead>
          <TableHead className="w-[110px]">{t("columns.available")}</TableHead>
          {editable && (
            <TableHead className="w-14">
              <span className="sr-only">{t("columns.actions")}</span>
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {foods.map((food) => (
          <TableRow key={food.id} className={cn("relative", !food.isAvailable && "bg-muted/40")}>
            <TableCell>
              <div className="flex min-w-0 items-center gap-3">
                <FoodThumb
                  src={food.imageUrl}
                  category={food.category?.name}
                  className={cn("size-11", !food.isAvailable && "opacity-60")}
                />
                <div className="min-w-0 flex-1">
                  <DishName
                    food={food}
                    onOpen={editable ? () => onAction(food, "edit") : undefined}
                  />
                  {food.description && (
                    <p className="truncate text-xs text-muted-foreground">{food.description}</p>
                  )}
                </div>
              </div>
            </TableCell>
            {showCategory && (
              <TableCell className={cn(categoryCell, "truncate text-muted-foreground")}>
                {food.category?.name ?? t("noCategory")}
              </TableCell>
            )}
            <TableCell>
              <DishPrice food={food} />
            </TableCell>
            <TableCell className={cn(wide, "text-muted-foreground tabular-nums")}>
              {food.preparationMinutes ? t("minutes", { n: food.preparationMinutes }) : "–"}
            </TableCell>
            <TableCell>
              {canSellOut ? (
                <span className="flex items-center gap-2">
                  <SoldOutSwitch food={food} />
                  {!food.isAvailable && (
                    <span className="text-xs font-bold text-tone-red-text">{t("soldOut")}</span>
                  )}
                </span>
              ) : food.isAvailable ? (
                <span className="text-sm text-muted-foreground">{t("onMenu")}</span>
              ) : (
                <SoldOutPill />
              )}
            </TableCell>
            {editable && (
              <TableCell className="text-right">
                <RowMenu food={food} onAction={(action) => onAction(food, action)} />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Phones: one row per dish with the sold-out switch under the thumb's reach. */
export function DishRows({ foods, showCategory, editable, canSellOut, onAction }: DishListProps) {
  const t = useTranslations("menu.dishes");

  return (
    <ul className="divide-y divide-border">
      {foods.map((food) => (
        <li key={food.id} className="relative flex items-center gap-3 px-4 py-3">
          <FoodThumb
            src={food.imageUrl}
            category={food.category?.name}
            className={cn(!food.isAvailable && "opacity-60")}
          />
          <div className="min-w-0 flex-1">
            <DishName food={food} onOpen={editable ? () => onAction(food, "edit") : undefined} />
            <DishPrice food={food} className="text-sm" />
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              {showCategory && (food.category?.name ?? t("noCategory"))}
              {showCategory && food.preparationMinutes ? " · " : null}
              {food.preparationMinutes ? (
                <>
                  <TimerIcon className="size-3.5" aria-hidden />
                  {t("minutes", { n: food.preparationMinutes })}
                </>
              ) : null}
            </p>
          </div>
          {canSellOut ? <SoldOutSwitch food={food} /> : !food.isAvailable && <SoldOutPill />}
          {editable && <RowMenu food={food} onAction={(action) => onAction(food, action)} />}
        </li>
      ))}
    </ul>
  );
}
