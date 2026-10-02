/* eslint-disable @next/next/no-img-element -- the API serves one resized WebP; next/image would only spend quota */
"use client";

import { PlusIcon, ProhibitIcon, StarIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { imageUrl } from "@/lib/api/images";
import type { FoodOut } from "@/lib/api/schema";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";
import { DishIcon } from "@/components/dish-icon";

type DishCardProps = {
  food: FoodOut;
  /** How many are in the cart across all its lines. */
  inCart: number;
  onAdd: () => void;
  /** Only when the dish has a single line in the cart; otherwise change it in the cart. */
  onSetQuantity?: (quantity: number) => void;
  photo: boolean;
};

/** A dish to tap into the cart. Sold-out dishes stay visible, so nobody wonders where they went. */
export function DishCard({ food, inCart, onAdd, onSetQuantity, photo }: DishCardProps) {
  const t = useTranslations("pos");
  const format = useFormat();
  const soldOut = !food.isAvailable;
  const src = imageUrl(food.imageUrl);

  const price = (
    <p className="flex items-baseline gap-1.5">
      <span className="text-md font-bold tabular-nums">{format.money(food.finalPrice)}</span>
      {food.hasDiscount && (
        <span className="text-xs text-muted-foreground tabular-nums line-through">
          {format.money(food.price)}
        </span>
      )}
    </p>
  );

  const control =
    inCart > 0 && onSetQuantity ? (
      <QtyStepper
        size="sm"
        value={inCart}
        removable
        onChange={onSetQuantity}
        label={t("quantityOf", { name: food.name })}
        className="relative z-10"
      />
    ) : (
      <span
        aria-hidden
        className={cn(
          "grid size-9 place-items-center rounded-full transition-colors duration-(--duration-fast)",
          inCart > 0
            ? "bg-primary text-primary-foreground"
            : "bg-primary-soft text-primary-soft-foreground group-hover/dish:bg-brand-track",
        )}
      >
        {inCart > 0 ? (
          <span className="text-sm font-bold tabular-nums">{format.number(inCart)}</span>
        ) : (
          <PlusIcon weight="bold" className="size-4" />
        )}
      </span>
    );

  return (
    <article
      className={cn(
        "group/dish relative flex w-full flex-col rounded-xl bg-card shadow-sm ring-2 transition-[box-shadow] duration-(--duration-fast)",
        inCart > 0 ? "ring-primary" : "ring-transparent hover:shadow-md",
        soldOut && "opacity-70",
      )}
    >
      {/* The whole card adds the dish; the stepper sits above it once it's in the cart. */}
      <button
        type="button"
        disabled={soldOut}
        onClick={onAdd}
        aria-label={
          soldOut ? t("soldOutLabel", { name: food.name }) : t("addLabel", { name: food.name })
        }
        className="absolute inset-0 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed"
      />

      {photo && (
        <div className="relative m-1.5 mb-0 aspect-[4/3] overflow-hidden rounded-lg bg-primary-soft">
          {src ? (
            <img
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          ) : (
            <span className="grid size-full place-items-center text-primary-soft-foreground">
              <DishIcon category={food.category?.name} className="size-10" />
            </span>
          )}
          {food.isFeatured && !soldOut && (
            <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-2xs font-bold shadow-sm">
              <StarIcon weight="fill" className="size-3 text-tone-amber" />
              {t("popular")}
            </span>
          )}
          {soldOut && <SoldOut className="absolute inset-0" />}
        </div>
      )}

      <div className={cn("flex flex-1 flex-col gap-2", photo ? "p-3.5 pt-2.5" : "p-3.5")}>
        <div className="flex items-start gap-3">
          {!photo && (
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground">
              <DishIcon category={food.category?.name} className="size-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-bold">{food.name}</h3>
            <p className="truncate text-xs text-muted-foreground">
              {!photo && food.isFeatured && !soldOut ? (
                <span className="inline-flex items-center gap-1">
                  <StarIcon weight="fill" className="size-3 text-tone-amber" />
                  {t("popular")}
                </span>
              ) : (
                (food.category?.name ?? t("noCategory"))
              )}
            </p>
          </div>
        </div>
        <div className="mt-auto flex min-h-9 items-center justify-between gap-2">
          {price}
          {soldOut ? !photo && <SoldOut /> : control}
        </div>
      </div>
    </article>
  );
}

function SoldOut({ className }: { className?: string }) {
  const t = useTranslations("pos");
  return (
    <span className={cn("grid place-items-center", className, className && "bg-veil")}>
      <span className="inline-flex items-center gap-1 rounded-full bg-tone-red-subtle px-2.5 py-1 text-xs font-bold text-tone-red-text">
        <ProhibitIcon weight="duotone" className="size-3.5" />
        {t("soldOut")}
      </span>
    </span>
  );
}
