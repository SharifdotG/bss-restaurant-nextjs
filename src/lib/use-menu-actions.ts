import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api, unwrap } from "@/lib/api/client";
import type {
  CategoryCreate,
  CategoryOut,
  CategoryUpdate,
  FoodCreate,
  FoodOut,
  FoodUpdate,
  PageFoodOut,
} from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";

type AvailabilityInput = { food: Pick<FoodOut, "id" | "name">; available: boolean };

const withAvailability = (page: PageFoodOut | undefined, id: number, available: boolean) =>
  page && {
    ...page,
    items: page.items.map((food) => (food.id === id ? { ...food, isAvailable: available } : food)),
  };

/**
 * Sold out, or back on. It's easy to flip back, so the switch moves at once and only rolls
 * back if the API says no.
 */
export function useSetAvailability() {
  const client = useQueryClient();
  const t = useTranslations("menu.availability");
  const errorText = useErrorText();

  return useMutation({
    mutationFn: ({ food, available }: AvailabilityInput) =>
      unwrap(
        api.PUT("/api/v1/foods/{food_id}/availability", {
          params: { path: { food_id: food.id } },
          body: { isAvailable: available },
        }),
      ),
    onMutate: async ({ food, available }) => {
      await client.cancelQueries({ queryKey: ["foods"] });
      const before = client.getQueryData<PageFoodOut>(["foods"]);
      client.setQueryData<PageFoodOut>(["foods"], (page) =>
        withAvailability(page, food.id, available),
      );
      return { before };
    },
    onSuccess: (saved) =>
      toast.success(t(saved.isAvailable ? "backOn" : "soldOut", { name: saved.name })),
    onError: (error, { food }, context) => {
      client.setQueryData(["foods"], context?.before);
      toast.error(t("failed", { name: food.name }), { description: errorText.message(error) });
    },
    onSettled: () => client.invalidateQueries({ queryKey: ["foods"] }),
  });
}

// Dishes show up in the POS, the kitchen and reports, and categories carry a dish count,
// so a change to either refreshes both.
const useRefreshMenu = () => {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["foods"] }),
      client.invalidateQueries({ queryKey: ["categories"] }),
    ]);
};

type SaveFood = { id?: undefined; body: FoodCreate } | { id: number; body: FoodUpdate };

/** Errors stay with the sheet so it can point at the field. */
export function useSaveFood() {
  const refresh = useRefreshMenu();
  const t = useTranslations("menu.toasts");

  return useMutation({
    mutationFn: ({ id, body }: SaveFood) =>
      id === undefined
        ? unwrap(api.POST("/api/v1/foods", { body }))
        : unwrap(api.PATCH("/api/v1/foods/{food_id}", { params: { path: { food_id: id } }, body })),
    onSuccess: (food, { id }) => {
      void refresh();
      toast.success(t(id === undefined ? "foodCreated" : "foodSaved", { name: food.name }));
    },
  });
}

/** Old orders keep their own copy of the dish, so this is always allowed. */
export function useDeleteFood() {
  const refresh = useRefreshMenu();
  const t = useTranslations("menu.toasts");

  return useMutation({
    mutationFn: (food: Pick<FoodOut, "id" | "name">) =>
      unwrap(api.DELETE("/api/v1/foods/{food_id}", { params: { path: { food_id: food.id } } })),
    onSuccess: (_, food) => {
      void refresh();
      toast.success(t("foodDeleted", { name: food.name }));
    },
  });
}

type SaveCategory = { id?: undefined; body: CategoryCreate } | { id: number; body: CategoryUpdate };

export function useSaveCategory() {
  const refresh = useRefreshMenu();
  const t = useTranslations("menu.toasts");

  return useMutation({
    mutationFn: ({ id, body }: SaveCategory) =>
      id === undefined
        ? unwrap(api.POST("/api/v1/categories", { body }))
        : unwrap(
            api.PATCH("/api/v1/categories/{category_id}", {
              params: { path: { category_id: id } },
              body,
            }),
          ),
    onSuccess: (category, { id, body }) => {
      void refresh();
      const key =
        id === undefined
          ? "categoryCreated"
          : body.isActive === false
            ? "categoryHidden"
            : body.isActive === true
              ? "categoryShown"
              : "categorySaved";
      toast.success(t(key, { name: category.name }));
    },
  });
}

/** Only works once a category is empty; the dialog offers hiding it otherwise. */
export function useDeleteCategory() {
  const refresh = useRefreshMenu();
  const t = useTranslations("menu.toasts");

  return useMutation({
    mutationFn: (category: Pick<CategoryOut, "id" | "name">) =>
      unwrap(
        api.DELETE("/api/v1/categories/{category_id}", {
          params: { path: { category_id: category.id } },
        }),
      ),
    onSuccess: (_, category) => {
      void refresh();
      toast.success(t("categoryDeleted", { name: category.name }));
    },
  });
}

/**
 * The rail moves straight away; each category whose position changed gets its own PATCH.
 * If any fail, the list is reloaded so it shows the order the API actually has.
 */
export function useReorderCategories() {
  const client = useQueryClient();
  const t = useTranslations("menu.toasts");
  const errorText = useErrorText();

  return useMutation({
    mutationFn: (changes: { id: number; sortOrder: number }[]) =>
      Promise.all(
        changes.map(({ id, sortOrder }) =>
          unwrap(
            api.PATCH("/api/v1/categories/{category_id}", {
              params: { path: { category_id: id } },
              body: { sortOrder },
            }),
          ),
        ),
      ),
    onMutate: async (changes) => {
      await client.cancelQueries({ queryKey: ["categories"] });
      const positions = new Map(changes.map(({ id, sortOrder }) => [id, sortOrder]));
      client.setQueriesData<CategoryOut[]>({ queryKey: ["categories"] }, (categories) =>
        categories?.map((category) => ({
          ...category,
          sortOrder: positions.get(category.id) ?? category.sortOrder,
        })),
      );
    },
    onError: (error) => toast.error(t("reorderFailed"), { description: errorText.message(error) }),
    onSettled: () => client.invalidateQueries({ queryKey: ["categories"] }),
  });
}
