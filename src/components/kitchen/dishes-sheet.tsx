"use client";

import { useState } from "react";
import {
  BowlFoodIcon,
  MagnifyingGlassIcon,
  ProhibitIcon,
  SealCheckIcon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/empty-state";
import { FoodThumb } from "@/components/food-thumb";
import { useMenu, type Menu } from "@/components/pos/use-menu";
import { Button } from "@/components/ui/button";
import { IconInput } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Segmented } from "@/components/ui/segmented";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { FoodOut } from "@/lib/api/schema";
import { useSetAvailability } from "@/lib/use-menu-actions";
import { useShellLayout } from "@/lib/use-shell-layout";
import { cn } from "@/lib/utils";

type Filter = "all" | "soldOut";

/** The sold-out chip and the Dishes button, both opening the same sheet. */
export function KitchenDishes() {
  const t = useTranslations("kitchen.dishes");
  const menu = useMenu();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const soldOut = menu.all.filter((food) => !food.isAvailable);

  const show = (next: Filter) => {
    setFilter(next);
    setOpen(true);
  };

  return (
    <>
      {soldOut.length > 0 && (
        <button
          type="button"
          onClick={() => show("soldOut")}
          className="hidden h-9 max-w-72 min-w-0 items-center gap-2 rounded-full bg-tone-red-subtle px-3.5 text-sm font-bold text-tone-red-text transition-colors duration-(--duration-fast) outline-none hover:bg-tone-red/20 focus-visible:ring-3 focus-visible:ring-ring/40 lg:inline-flex"
        >
          <ProhibitIcon weight="duotone" className="size-4 shrink-0" />
          <span className="truncate">
            {t("chip", { name: soldOut[0].name, more: soldOut.length - 1 })}
          </span>
        </button>
      )}
      <Button variant="outline" onClick={() => show("all")} className="relative">
        <BowlFoodIcon weight="duotone" />
        <span className="hidden sm:inline">{t("button")}</span>
        {soldOut.length > 0 && (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 size-2.5 rounded-full bg-tone-red ring-2 ring-background lg:hidden"
          />
        )}
      </Button>
      <DishesSheet
        menu={menu}
        open={open}
        onOpenChange={setOpen}
        filter={filter}
        onFilterChange={setFilter}
        soldOut={soldOut.length}
      />
    </>
  );
}

type DishesSheetProps = {
  menu: Menu;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter: Filter;
  onFilterChange: (filter: Filter) => void;
  soldOut: number;
};

function DishesSheet({
  menu,
  open,
  onOpenChange,
  filter,
  onFilterChange,
  soldOut,
}: DishesSheetProps) {
  const t = useTranslations("kitchen.dishes");
  const phone = useShellLayout() === "phone";
  const shown = menu.shown.filter((food) => filter === "all" || !food.isAvailable);

  // Grouped under their category, in menu order.
  const groups: { name: string; foods: FoodOut[] }[] = [];
  for (const food of shown) {
    const name = food.category?.name ?? t("uncategorised");
    const last = groups.at(-1);
    if (last?.name === name) last.foods.push(food);
    else groups.push({ name, foods: [food] });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={phone ? "bottom" : "right"}
        className={cn(phone ? "h-[85dvh]" : "w-[min(460px,100vw)]")}
      >
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription className="text-pretty">{t("description")}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 border-b border-border px-6 py-4">
          <IconInput
            icon={MagnifyingGlassIcon}
            type="search"
            value={menu.search}
            onChange={(event) => menu.setSearch(event.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
          />
          <Segmented
            aria-label={t("filter")}
            value={filter}
            onValueChange={onFilterChange}
            className="self-start"
            options={[
              { value: "all", label: t("all", { n: menu.all.length }) },
              { value: "soldOut", label: t("soldOutTab", { n: soldOut }) },
            ]}
          />
        </div>

        <SheetBody className="gap-6 px-4">
          {menu.loading ? (
            Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 shrink-0" />)
          ) : groups.length === 0 ? (
            <EmptyState
              icon={filter === "soldOut" ? SealCheckIcon : MagnifyingGlassIcon}
              tone={filter === "soldOut" ? "brand" : "slate"}
              title={filter === "soldOut" && !menu.search ? t("noneSoldOut") : t("noMatch")}
            >
              {filter === "soldOut" && !menu.search ? t("noneSoldOutHint") : null}
            </EmptyState>
          ) : (
            groups.map((group) => (
              <section key={group.name} aria-label={group.name} className="flex flex-col gap-1">
                <h3 className="px-2 pb-1 text-sm font-bold text-muted-foreground">{group.name}</h3>
                {group.foods.map((food) => (
                  <DishRow key={food.id} food={food} />
                ))}
              </section>
            ))
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function DishRow({ food }: { food: FoodOut }) {
  const t = useTranslations("kitchen.dishes");
  const setAvailability = useSetAvailability();
  const soldOut = !food.isAvailable;

  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-(--duration-fast) hover:bg-muted">
      <FoodThumb
        src={food.imageUrl}
        category={food.category?.name}
        className={cn("size-10", soldOut && "opacity-60")}
      />
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate font-medium", soldOut && "text-muted-foreground")}>
          {food.name}
        </span>
        {food.preparationMinutes ? (
          <span className="block text-xs text-muted-foreground">
            {t("prep", { m: food.preparationMinutes })}
          </span>
        ) : null}
      </span>
      {soldOut && <Pill tone="red">{t("soldOut")}</Pill>}
      <Switch
        checked={!soldOut}
        onCheckedChange={(available) => setAvailability.mutate({ food, available })}
        aria-label={t("availableLabel", { name: food.name })}
      />
    </label>
  );
}
