import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { categoriesQuery, foodsQuery } from "@/lib/api/queries";
import type { FoodOut } from "@/lib/api/schema";
import { toLatinDigits } from "@/lib/format";
import { useDebounced } from "@/lib/use-debounced";

/** The menu for taking orders: every dish, by category, with search. */
export function useMenu() {
  const foods = useQuery(foodsQuery);
  const categories = useQuery(categoriesQuery);
  const [category, setCategory] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const term = useDebounced(toLatinDigits(search).trim().toLowerCase(), 150);

  const all = foods.data ?? [];
  const order = new Map(categories.data?.map((c, i) => [c.id, i]));
  const sorted = all.toSorted(
    (a, b) =>
      (order.get(a.category?.id ?? -1) ?? 999) - (order.get(b.category?.id ?? -1) ?? 999) ||
      a.name.localeCompare(b.name),
  );

  // Only categories with something in them earn a chip.
  const counts = new Map<number, number>();
  for (const food of all) {
    if (food.category) counts.set(food.category.id, (counts.get(food.category.id) ?? 0) + 1);
  }
  const chips = (categories.data ?? [])
    .filter((c) => counts.has(c.id))
    .map((c) => ({ id: c.id, name: c.name, count: counts.get(c.id) ?? 0 }));

  const shown = sorted.filter(
    (food) =>
      (category === "all" || food.category?.id === category) &&
      (!term || food.name.toLowerCase().includes(term)),
  );

  return {
    loading: !foods.data,
    error: foods.error,
    refetch: foods.refetch,
    all,
    shown,
    chips,
    category,
    setCategory,
    search,
    setSearch,
    // Photo cards only when the menu has photos; a wall of placeholders helps nobody.
    hasPhotos: all.some((food) => food.imageUrl),
    prices: new Map(all.map((food) => [food.id, food.finalPrice])),
    byId: new Map<number, FoodOut>(all.map((food) => [food.id, food])),
  };
}

export type Menu = ReturnType<typeof useMenu>;
