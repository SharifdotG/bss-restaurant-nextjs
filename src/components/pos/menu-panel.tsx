"use client";

import {
  ArrowsClockwiseIcon,
  CloudSlashIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useFormatter, useTranslations } from "next-intl";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { IconInput } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useErrorText } from "@/lib/api/use-error-text";
import { cn } from "@/lib/utils";
import { DishCard } from "./dish-card";
import type { Menu } from "./use-menu";

type MenuPanelProps = {
  menu: Menu;
  counts: ReadonlyMap<number, number>;
  onAdd: (foodId: number) => void;
  /** Present for dishes with a single cart line, so the card's stepper can change it. */
  setterFor: (foodId: number) => ((quantity: number) => void) | undefined;
  className?: string;
};

export function MenuSearch({ menu, className }: { menu: Menu; className?: string }) {
  const t = useTranslations("pos");
  const format = useFormatter();
  return (
    <div className={className}>
      <IconInput
        icon={MagnifyingGlassIcon}
        type="search"
        value={menu.search}
        onChange={(event) => menu.setSearch(event.target.value)}
        placeholder={t("search", { n: format.number(menu.all.length) })}
        aria-label={t("searchLabel")}
        className="h-11"
        end={
          menu.search && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label={t("clearSearch")}
              onClick={() => menu.setSearch("")}
            >
              <XIcon />
            </Button>
          )
        }
      />
    </div>
  );
}

/** Category chips over the dishes; a chip shows how many dishes it holds. */
export function CategoryChips({ menu, className }: { menu: Menu; className?: string }) {
  const t = useTranslations("pos");
  const format = useFormatter();
  const chips = [{ id: "all" as const, name: t("all"), count: menu.all.length }, ...menu.chips];

  return (
    <div
      role="group"
      aria-label={t("categories")}
      className={cn("flex [scrollbar-width:none] gap-2 overflow-x-auto", className)}
    >
      {chips.map((chip) => {
        const active = menu.category === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            aria-pressed={active}
            onClick={() => menu.setCategory(chip.id)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium whitespace-nowrap transition-colors duration-(--duration-fast) outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
              active
                ? "border-primary/30 bg-primary-soft font-bold text-primary-soft-foreground"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            {chip.name}
            <span className={cn("tabular-nums", !active && "text-muted-foreground")}>
              {format.number(chip.count)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function MenuGrid({ menu, counts, onAdd, setterFor, className }: MenuPanelProps) {
  const t = useTranslations("pos");
  const errorText = useErrorText();

  if (menu.loading) {
    return (
      <div
        aria-busy
        className={cn("grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4", className)}
      >
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton
            key={i}
            className={cn("rounded-xl bg-card", menu.hasPhotos ? "h-64" : "h-28")}
          />
        ))}
      </div>
    );
  }
  if (menu.error) {
    return (
      <EmptyState
        icon={CloudSlashIcon}
        tone="slate"
        title={t("menuFailed")}
        action={
          <Button variant="outline" onClick={() => void menu.refetch()}>
            <ArrowsClockwiseIcon />
            {t("retry")}
          </Button>
        }
      >
        {errorText.message(menu.error)}
      </EmptyState>
    );
  }
  if (menu.shown.length === 0) {
    return (
      <EmptyState icon={MagnifyingGlassIcon} tone="slate" title={t("noDishes")}>
        {menu.search ? t("noDishesSearch", { term: menu.search }) : t("noDishesHint")}
      </EmptyState>
    );
  }

  return (
    <ul
      className={cn(
        "grid animate-appear grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4",
        className,
      )}
    >
      {menu.shown.map((food) => (
        <li key={food.id} className="flex">
          <DishCard
            food={food}
            photo={menu.hasPhotos}
            inCart={counts.get(food.id) ?? 0}
            onAdd={() => onAdd(food.id)}
            onSetQuantity={setterFor(food.id)}
          />
        </li>
      ))}
    </ul>
  );
}
