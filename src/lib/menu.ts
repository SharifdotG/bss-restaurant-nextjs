import type { CategoryOut, DiscountType, FoodOut } from "@/lib/api/schema";
import { toPaisa, toTaka } from "@/lib/money";

/** What guests pay, worked out the way the API does: half-up to the paisa, never below zero. */
export function finalPrice(price: number, type: DiscountType, value: number) {
  const paisa = toPaisa(price);
  if (type === "percentage") return toTaka(Math.max(0, Math.round((paisa * (100 - value)) / 100)));
  if (type === "flat") return toTaka(Math.max(0, paisa - toPaisa(value)));
  return price;
}

export type DiscountProblem = "overHundred" | "overPrice" | null;

/** The two rules the API enforces, checked before saving so the field can say which. */
export function discountProblem(price: number, type: DiscountType, value: number): DiscountProblem {
  if (type === "percentage" && value > 100) return "overHundred";
  if (type === "flat" && toPaisa(value) > toPaisa(price)) return "overPrice";
  return null;
}

export const MENU_SHOWS = ["all", "soldOut", "featured", "discounted"] as const;
export type MenuShow = (typeof MENU_SHOWS)[number];

type FoodFilter = { category: number | "none" | null; search: string; show: MenuShow };

export function matchesFood(food: FoodOut, { category, search, show }: FoodFilter) {
  if (category === "none" ? food.category : category && food.category?.id !== category) {
    return false;
  }
  if (show === "soldOut" && food.isAvailable) return false;
  if (show === "featured" && !food.isFeatured) return false;
  if (show === "discounted" && !food.hasDiscount) return false;
  const query = search.trim().toLowerCase();
  return (
    !query ||
    food.name.toLowerCase().includes(query) ||
    Boolean(food.description?.toLowerCase().includes(query))
  );
}

/** Dish counts per category id, plus "none" for dishes without one. */
export function countByCategory(foods: FoodOut[]) {
  const counts = new Map<number | "none", number>();
  for (const food of foods) {
    const key = food.category?.id ?? "none";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Categories only carry a sortOrder number, so a drag becomes a PATCH for each one whose
 * position changed. Positions are the list index, matching how the seed numbers them.
 */
export function reorderChanges(categories: CategoryOut[], order: number[]) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  return order.flatMap((id, index) => {
    const category = byId.get(id);
    return category && category.sortOrder !== index ? [{ id, sortOrder: index }] : [];
  });
}

/** Moves one id a step up or down, for keyboard users and the row menu. */
export function moveId(order: number[], id: number, step: -1 | 1) {
  const from = order.indexOf(id);
  const to = from + step;
  if (from < 0 || to < 0 || to >= order.length) return order;
  const next = [...order];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
